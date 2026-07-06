import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { footballData } from '@/lib/football-data/client'
import { mapFDMatchToSupabase } from '@/lib/football-data/mapper'
import { invalidateCache, getApiUsage } from '@/lib/api-football/cache'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles').select('is_admin').eq('user_id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const adminSupabase = await createAdminClient()
    const { type = 'full', password } = await request.json().catch(() => ({}))

    if (type === 'full') {
      const FULL_SYNC_PASSWORD = process.env.FULL_SYNC_PASSWORD || '24Maghnetro*'
      if (password !== FULL_SYNC_PASSWORD) {
        return NextResponse.json({ error: 'Senha incorreta' }, { status: 403 })
      }
    }

    const usage = await getApiUsage()
    if (usage.remaining <= 0) {
      return NextResponse.json({
        error: `Limite diário atingido (${usage.used}/${usage.limit}). Tente amanhã.`,
        usage,
      }, { status: 429 })
    }

    const { data: log } = await adminSupabase
      .from('api_sync_logs')
      .insert({ type, status: 'running', message: 'Sincronização iniciada' })
      .select().single()

    let count = 0

    try {
      const comp = process.env.FOOTBALL_COMPETITION_CODE || 'WC'

      if (type === 'scorers') {
        // --- Sync artilheiros ---
        await invalidateCache(`fd:scorers:${comp}:30`)
        const scorers = (await footballData.getScorers(30)).data

        for (const scorer of scorers) {
          // Tenta match por player_api_id ou por nome
          const { data: existing } = await adminSupabase
            .from('top_scorer_players')
            .select('id')
            .or(`player_api_id.eq.${scorer.player.id},player_name.ilike.${scorer.player.name}`)
            .maybeSingle()

          if (existing) {
            await adminSupabase.from('top_scorer_players').update({
              player_api_id: scorer.player.id,
              goals_scored: scorer.goals ?? 0,
              assists: scorer.assists ?? 0,
              matches_played: scorer.playedMatches ?? 0,
              team_name: scorer.team.name,
              team_logo: scorer.team.crest || null,
              updated_at: new Date().toISOString(),
            }).eq('id', existing.id)
          } else {
            await adminSupabase.from('top_scorer_players').insert({
              player_api_id: scorer.player.id,
              player_name: scorer.player.name,
              team_name: scorer.team.name,
              team_logo: scorer.team.crest || null,
              position: scorer.player.position || null,
              nationality: scorer.player.nationality || null,
              goals_scored: scorer.goals ?? 0,
              assists: scorer.assists ?? 0,
              matches_played: scorer.playedMatches ?? 0,
            })
          }
          count++
        }

        const updatedUsage = await getApiUsage()
        if (log) {
          await adminSupabase.from('api_sync_logs').update({
            status: 'success',
            message: `${count} artilheiros atualizados | Uso: ${updatedUsage.used}/${updatedUsage.limit} req`,
            records_affected: count,
          }).eq('id', log.id)
        }
        return NextResponse.json({ success: true, message: `${count} artilheiros sincronizados`, count, usage: updatedUsage })
      }

      // --- Sync de jogos (full / live / today) ---
      if (type === 'live') {
        await invalidateCache(`fd:matches:live:${comp}`)
      } else if (type === 'today') {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
        const future    = new Date(); future.setDate(future.getDate() + 90)
        const fmt = (d: Date) => d.toISOString().split('T')[0]
        await invalidateCache(`fd:matches:${comp}:${fmt(yesterday)}:${fmt(future)}`)
      } else {
        await invalidateCache(`fd:matches:${comp}`)
      }

      let fdMatches: Awaited<ReturnType<typeof footballData.getLiveMatches>>['data']
      if (type === 'live') {
        fdMatches = (await footballData.getLiveMatches()).data
      } else if (type === 'today') {
        // Busca de ontem em diante (sem limite superior) — cobre jogos futuros do torneio
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
        const future    = new Date(); future.setDate(future.getDate() + 90)
        const fmt = (d: Date) => d.toISOString().split('T')[0]
        fdMatches = (await footballData.getMatchesByDate(fmt(yesterday), fmt(future))).data
      } else {
        fdMatches = (await footballData.getMatches()).data
      }

      const errors: string[] = []

      for (const fdMatch of fdMatches) {
        // Times ainda não definidos (fases eliminatórias futuras) — pular
        if (!fdMatch.homeTeam?.id || !fdMatch.awayTeam?.id) continue

        const matchData = mapFDMatchToSupabase(fdMatch)
        const isFinishedNoScore = ['FT', 'AET', 'PEN', 'AWD'].includes(matchData.status)
          && matchData.home_score === null

        let upsertError: unknown = null

        if (isFinishedNoScore) {
          // Sem placar na API (AET/PEN sem regularTime, ou delay do free tier).
          // Preserva o placar do banco mas atualiza status e winner_team_id.
          const { error } = await adminSupabase
            .from('matches')
            .update({
              status: matchData.status,
              winner_team_id: matchData.winner_team_id,
              last_synced_at: matchData.last_synced_at,
            })
            .eq('api_fixture_id', fdMatch.id)
          upsertError = error
        } else {
          const { error } = await adminSupabase
            .from('matches')
            .upsert(matchData, { onConflict: 'api_fixture_id' })
          upsertError = error
        }

        if (upsertError) {
          const msg = (upsertError as { message?: string }).message ?? String(upsertError)
          console.error(`[SYNC] falhou fixture ${fdMatch.id}:`, upsertError)
          errors.push(`fixture ${fdMatch.id}: ${msg}`)
        } else {
          count++
        }

        if (['FT', 'AET', 'PEN', 'AWD'].includes(matchData.status)) {
          const { data: match } = await adminSupabase
            .from('matches').select('id').eq('api_fixture_id', fdMatch.id).single()
          if (match) {
            // Score knockout predictions for this match
            if (matchData.winner_team_id) {
              const { data: rules } = await adminSupabase
                .from('scoring_rules')
                .select('knockout_advance_points, finalist_points')
                .eq('is_active', true)
                .single()
              const stagePoints = matchData.stage === 'Semi-finals'
                ? (rules?.finalist_points ?? 2)
                : (rules?.knockout_advance_points ?? 1)
              const losingTeamId = matchData.home_team_id === matchData.winner_team_id
                ? matchData.away_team_id
                : matchData.home_team_id

              await Promise.all([
                // Score por UUID real
                adminSupabase.from('knockout_predictions')
                  .update({ is_correct: true, points: stagePoints, updated_at: new Date().toISOString() })
                  .eq('match_reference', match.id)
                  .eq('predicted_team_id', matchData.winner_team_id),
                adminSupabase.from('knockout_predictions')
                  .update({ is_correct: false, points: 0, updated_at: new Date().toISOString() })
                  .eq('match_reference', match.id)
                  .neq('predicted_team_id', matchData.winner_team_id),
                // Score por referência virtual (salvas antes dos jogos serem definidos)
                adminSupabase.from('knockout_predictions')
                  .update({ is_correct: true, points: stagePoints, updated_at: new Date().toISOString() })
                  .like('match_reference', `virtual-${matchData.stage}-%`)
                  .eq('predicted_team_id', matchData.winner_team_id),
                adminSupabase.from('knockout_predictions')
                  .update({ is_correct: false, points: 0, updated_at: new Date().toISOString() })
                  .like('match_reference', `virtual-${matchData.stage}-%`)
                  .eq('predicted_team_id', losingTeamId),
              ])
            }
            await adminSupabase.rpc('recalculate_match_points', { p_match_id: match.id })
          }
        }
      }

      if (errors.length > 0) {
        console.error(`[SYNC] ${errors.length} erros de upsert:`, errors.slice(0, 5))
      }

      const updatedUsage = await getApiUsage()

      if (log) {
        await adminSupabase.from('api_sync_logs').update({
          status: 'success',
          message: `${count} jogos sincronizados | Uso hoje: ${updatedUsage.used}/${updatedUsage.limit} req`,
          records_affected: count,
        }).eq('id', log.id)
      }

      return NextResponse.json({
        success: true,
        message: `${count} jogos sincronizados${errors.length > 0 ? ` (${errors.length} erros)` : ''}`,
        count,
        usage: updatedUsage,
        ...(errors.length > 0 && { upsert_errors: errors.slice(0, 5) }),
      })
    } catch (syncError) {
      const errMsg = syncError instanceof Error ? syncError.message : 'Erro desconhecido'
      if (log) {
        await adminSupabase.from('api_sync_logs')
          .update({ status: 'error', message: errMsg }).eq('id', log.id)
      }
      throw syncError
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro na sincronização'
    console.error('[SYNC ERROR]', error)
    const isRateLimit = msg.includes('RATE_LIMIT') || msg.includes('Limite diário')
    return NextResponse.json({ error: msg }, { status: isRateLimit ? 429 : 500 })
  }
}
