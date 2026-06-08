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
    const { type = 'full' } = await request.json().catch(() => ({}))

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

      // --- Sync de jogos (full / live) ---
      if (type === 'live') {
        await invalidateCache(`fd:matches:live:${comp}`)
      } else {
        await invalidateCache(`fd:matches:${comp}`)
      }

      const fdMatches = type === 'live'
        ? (await footballData.getLiveMatches()).data
        : (await footballData.getMatches()).data

      for (const fdMatch of fdMatches) {
        const matchData = mapFDMatchToSupabase(fdMatch)

        const { error } = await adminSupabase
          .from('matches')
          .upsert(matchData, { onConflict: 'api_fixture_id' })

        if (!error) count++

        if (['FT', 'AET', 'PEN', 'AWD'].includes(matchData.status)) {
          const { data: match } = await adminSupabase
            .from('matches').select('id').eq('api_fixture_id', fdMatch.id).single()
          if (match) {
            await adminSupabase.rpc('recalculate_match_points', { p_match_id: match.id })
          }
        }
      }

      const updatedUsage = await getApiUsage()

      if (log) {
        await adminSupabase.from('api_sync_logs').update({
          status: 'success',
          message: `${count} jogos sincronizados | Uso hoje: ${updatedUsage.used}/${updatedUsage.limit} req`,
          records_affected: count,
        }).eq('id', log.id)
      }

      return NextResponse.json({ success: true, message: `${count} jogos sincronizados`, count, usage: updatedUsage })
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
