import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id') || user.id

    const { data, error } = await supabase
      .from('knockout_predictions')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error
    return NextResponse.json({ predictions: data || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar previsões mata-mata' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: settings } = await supabase
      .from('competition_settings')
      .select('knockout_prediction_locked')
      .eq('is_active', true)
      .single()

    if (settings?.knockout_prediction_locked) {
      return NextResponse.json({ error: 'Previsão de mata-mata bloqueada' }, { status: 400 })
    }

    const body = await request.json()
    const { predictions } = body

    // Upsert cada previsão
    const { data, error } = await supabase
      .from('knockout_predictions')
      .upsert(
        predictions.map((p: {
          stage: string
          match_reference: string
          predicted_team_id: number
          predicted_team_name: string
          predicted_team_logo?: string
        }) => ({
          user_id: user.id,
          stage: p.stage,
          match_reference: p.match_reference,
          predicted_team_id: p.predicted_team_id,
          predicted_team_name: p.predicted_team_name,
          predicted_team_logo: p.predicted_team_logo,
        })),
        { onConflict: 'user_id,stage,match_reference' }
      )
      .select()

    if (error) throw error
    return NextResponse.json({ predictions: data })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar mata-mata' }, { status: 500 })
  }
}
