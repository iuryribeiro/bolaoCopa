import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data, error } = await supabase
      .from('top_scorer_predictions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ prediction: data })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar previsão' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: settings } = await supabase
      .from('competition_settings')
      .select('top_scorer_prediction_locked, top_scorer_deadline')
      .eq('is_active', true)
      .single()

    if (settings?.top_scorer_prediction_locked) {
      return NextResponse.json({ error: 'Previsão de artilheiro bloqueada' }, { status: 400 })
    }

    if (settings?.top_scorer_deadline && new Date() > new Date(settings.top_scorer_deadline)) {
      return NextResponse.json({ error: 'Prazo para artilheiro encerrado' }, { status: 400 })
    }

    const { player_id, player_name, player_photo, team_id, team_name } = await request.json()

    const { data, error } = await supabase
      .from('top_scorer_predictions')
      .upsert(
        { user_id: user.id, player_id, player_name, player_photo, team_id, team_name },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ prediction: data })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar previsão' }, { status: 500 })
  }
}
