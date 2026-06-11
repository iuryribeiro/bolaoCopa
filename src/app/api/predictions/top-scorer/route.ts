import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const [lockedRes, myPredRes, playersRes, allPredsRes] = await Promise.all([
      getLocked(supabase),
      supabase
        .from('top_scorer_predictions')
        .select('*, player:scorer_player_id(id, player_name, team_name, team_logo, goals_scored, nationality)')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('top_scorer_players')
        .select('*')
        .eq('is_active', true)
        .order('goals_scored', { ascending: false })
        .order('player_name', { ascending: true }),
      supabase
        .from('top_scorer_predictions')
        .select('user_id, player_name, team_name, scorer_player_id, player:scorer_player_id(player_name, team_name, team_logo, goals_scored), profile:user_profiles(name, avatar_url)')
        .order('created_at', { ascending: true }),
    ])

    return NextResponse.json({
      locked: lockedRes,
      myPrediction: myPredRes.data,
      players: playersRes.data || [],
      allPredictions: allPredsRes.data || [],
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
