import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPredictionLocked } from '@/lib/utils'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('match_id')
    const userId = searchParams.get('user_id') || user.id

    let query = supabase
      .from('predictions')
      .select('*, match:matches(*)')
      .eq('user_id', userId)

    if (matchId) query = query.eq('match_id', matchId)

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ predictions: data || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar palpites' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { match_id, home_score_prediction, away_score_prediction } = body

    if (home_score_prediction < 0 || away_score_prediction < 0) {
      return NextResponse.json({ error: 'Placar inválido' }, { status: 400 })
    }

    // Buscar jogo e regras
    const [matchResult, rulesResult] = await Promise.all([
      supabase.from('matches').select('*').eq('id', match_id).single(),
      supabase.from('scoring_rules').select('*').eq('is_active', true).single(),
    ])

    if (matchResult.error || !matchResult.data) {
      return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })
    }

    const match = matchResult.data
    // prediction_deadline_hours está em horas no banco; convertemos para minutos
    const deadlineMinutes = (rulesResult.data?.prediction_deadline_hours ?? (10 / 60)) * 60

    // Verificar prazo (backend validation)
    if (isPredictionLocked(match, deadlineMinutes)) {
      return NextResponse.json(
        { error: 'Prazo para palpite encerrado' },
        { status: 400 }
      )
    }

    // Upsert do palpite
    const { data, error } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: user.id,
          match_id,
          home_score_prediction: parseInt(home_score_prediction),
          away_score_prediction: parseInt(away_score_prediction),
        },
        { onConflict: 'user_id,match_id' }
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ prediction: data })
  } catch (error) {
    console.error('Prediction error:', error)
    return NextResponse.json({ error: 'Erro ao salvar palpite' }, { status: 500 })
  }
}
