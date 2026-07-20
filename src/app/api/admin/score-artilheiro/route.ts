import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado', status: 401, adminSupabase: null }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!profile?.is_admin) return { error: 'Acesso negado', status: 403, adminSupabase: null }

  const adminSupabase = await createAdminClient()
  return { error: null, status: 200, adminSupabase }
}

// GET — lista jogadores preditos com contagem de palpites
export async function GET() {
  try {
    const { error, status, adminSupabase } = await requireAdmin()
    if (error || !adminSupabase) return NextResponse.json({ error }, { status })

    // Pega todas as predições com scorer_player_id preenchido
    const { data: preds, error: predErr } = await adminSupabase
      .from('top_scorer_predictions')
      .select('scorer_player_id, player_name, team_name, is_correct, points')
      .not('scorer_player_id', 'is', null)

    if (predErr) throw predErr

    // Agrupa por scorer_player_id
    const countMap = new Map<string, { player_name: string; team_name: string | null; count: number; is_correct: boolean | null }>()
    for (const p of (preds || [])) {
      const key = p.scorer_player_id as string
      if (!countMap.has(key)) {
        countMap.set(key, { player_name: p.player_name, team_name: p.team_name, count: 0, is_correct: p.is_correct })
      }
      countMap.get(key)!.count++
      // Se qualquer um tem is_correct = true, o jogador foi marcado como vencedor
      if (p.is_correct === true) countMap.get(key)!.is_correct = true
    }

    // Busca logos dos players
    const playerIds = [...countMap.keys()]
    const { data: players } = await adminSupabase
      .from('top_scorer_players')
      .select('id, player_name, team_name, team_logo, goals_scored')
      .in('id', playerIds)

    const playerMap = new Map<string, { team_logo: string | null; goals_scored: number }>()
    for (const pl of (players || [])) {
      playerMap.set(pl.id, { team_logo: pl.team_logo, goals_scored: pl.goals_scored })
    }

    const result = [...countMap.entries()]
      .map(([scorer_player_id, info]) => ({
        scorer_player_id,
        player_name: info.player_name,
        team_name: info.team_name,
        team_logo: playerMap.get(scorer_player_id)?.team_logo ?? null,
        goals_scored: playerMap.get(scorer_player_id)?.goals_scored ?? 0,
        count: info.count,
        is_winner: info.is_correct === true,
      }))
      .sort((a, b) => b.count - a.count)

    // Conta quem não fez palpite
    const { count: totalPreds } = await adminSupabase
      .from('top_scorer_predictions')
      .select('*', { count: 'exact', head: true })

    const { count: noPredCount } = await adminSupabase
      .from('top_scorer_predictions')
      .select('*', { count: 'exact', head: true })
      .is('scorer_player_id', null)

    return NextResponse.json({ players: result, total: totalPreds ?? 0, no_pick: noPredCount ?? 0 })
  } catch (err) {
    console.error('[score-artilheiro GET]', err)
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}

// POST — marca o artilheiro vencedor e recalcula pontos
export async function POST(request: Request) {
  try {
    const { error, status, adminSupabase } = await requireAdmin()
    if (error || !adminSupabase) return NextResponse.json({ error }, { status })

    const { scorer_player_id } = await request.json()
    if (!scorer_player_id) {
      return NextResponse.json({ error: 'scorer_player_id é obrigatório' }, { status: 400 })
    }

    // Busca pontuação de artilheiro nas regras
    const { data: rules } = await adminSupabase
      .from('scoring_rules')
      .select('top_scorer_points')
      .eq('is_active', true)
      .single()

    const pts = rules?.top_scorer_points ?? 5

    // Marca os acertadores
    const [correctRes, wrongRes] = await Promise.all([
      adminSupabase
        .from('top_scorer_predictions')
        .update({ is_correct: true, points: pts, updated_at: new Date().toISOString() })
        .eq('scorer_player_id', scorer_player_id),
      adminSupabase
        .from('top_scorer_predictions')
        .update({ is_correct: false, points: 0, updated_at: new Date().toISOString() })
        .neq('scorer_player_id', scorer_player_id)
        .not('scorer_player_id', 'is', null),
    ])

    if (correctRes.error) throw correctRes.error
    if (wrongRes.error) throw wrongRes.error

    // Recalcula totais de todos os usuários
    const { error: rpcErr } = await adminSupabase.rpc('recalculate_all_user_totals')
    if (rpcErr) throw rpcErr

    return NextResponse.json({ success: true, points_awarded: pts })
  } catch (err) {
    console.error('[score-artilheiro POST]', err)
    return NextResponse.json({ error: 'Erro ao pontuar artilheiro' }, { status: 500 })
  }
}
