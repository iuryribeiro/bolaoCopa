import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function getLocked(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('competition_settings')
    .select('top_scorer_prediction_locked')
    .eq('is_active', true)
    .maybeSingle()
  return data?.top_scorer_prediction_locked ?? false
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const admin = await createAdminClient()

    // Busca paralela — sem joins que dependem de FK entre tabelas não diretamente relacionadas
    const [lockedRes, myPredRes, playersRes, predsRes, profilesRes] = await Promise.all([
      getLocked(supabase),
      supabase
        .from('top_scorer_predictions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
      admin
        .from('top_scorer_players')
        .select('*')
        .eq('is_active', true)
        .order('goals_scored', { ascending: false })
        .order('player_name', { ascending: true }),
      // Busca só as colunas básicas que com certeza existem
      admin
        .from('top_scorer_predictions')
        .select('user_id, player_name, team_name, created_at')
        .order('created_at', { ascending: true }),
      admin
        .from('user_profiles')
        .select('user_id, name, avatar_url'),
    ])

    // Monta mapa de perfis por user_id
    const profileMap = new Map<string, { name: string; avatar_url: string | null }>()
    for (const p of (profilesRes.data || [])) {
      profileMap.set(p.user_id, { name: p.name, avatar_url: p.avatar_url })
    }

    // Tenta buscar scorer_player_id (só existe se a migration foi rodada)
    const scorerMap = new Map<string, string>()
    try {
      const { data: scorerData } = await admin
        .from('top_scorer_predictions')
        .select('user_id, scorer_player_id')
        .not('scorer_player_id', 'is', null)
      for (const s of (scorerData || [])) {
        if (s.scorer_player_id) scorerMap.set(s.user_id, s.scorer_player_id)
      }
    } catch { /* coluna ainda não existe — ignora */ }

    // Mapa de players por id
    const playerMap = new Map<string, Record<string, unknown>>()
    for (const pl of (playersRes.data || [])) {
      playerMap.set(pl.id, pl)
    }

    // Monta lista final da galera
    const allPredictions = (predsRes.data || []).map(pred => {
      const scorerPlayerId = scorerMap.get(pred.user_id) ?? null
      const player = scorerPlayerId ? (playerMap.get(scorerPlayerId) ?? null) : null
      return {
        user_id: pred.user_id,
        player_name: pred.player_name,
        team_name: pred.team_name,
        scorer_player_id: scorerPlayerId,
        player,
        profile: profileMap.get(pred.user_id) ?? null,
      }
    })

    // Player do palpite do próprio usuário
    let myPlayer = null
    const myPred = myPredRes.data as Record<string, unknown> | null
    const myScorerPlayerId = myPred ? (scorerMap.get(user.id) ?? null) : null
    if (myScorerPlayerId) {
      myPlayer = playerMap.get(myScorerPlayerId) ?? null
    }

    return NextResponse.json({
      locked: lockedRes,
      myPrediction: myPred ? { ...myPred, scorer_player_id: myScorerPlayerId, player: myPlayer } : null,
      players: playersRes.data || [],
      allPredictions,
    })
  } catch (err) {
    console.error('[top-scorer GET]', err)
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const locked = await getLocked(supabase)
    if (locked) {
      return NextResponse.json({ error: 'Copa já começou — palpite de artilheiro encerrado.' }, { status: 403 })
    }

    const { scorer_player_id } = await request.json()
    if (!scorer_player_id) {
      return NextResponse.json({ error: 'Jogador inválido' }, { status: 400 })
    }

    const { data: player, error: pErr } = await supabase
      .from('top_scorer_players')
      .select('*')
      .eq('id', scorer_player_id)
      .single()

    if (pErr || !player) {
      return NextResponse.json({ error: 'Jogador não encontrado' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('top_scorer_predictions')
      .upsert({
        user_id: user.id,
        scorer_player_id: player.id,
        player_id: player.player_api_id ?? null,
        player_name: player.player_name,
        team_name: player.team_name,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ prediction: data })
  } catch (err) {
    console.error('[top-scorer POST]', err)
    return NextResponse.json({ error: 'Erro ao salvar palpite' }, { status: 500 })
  }
}
