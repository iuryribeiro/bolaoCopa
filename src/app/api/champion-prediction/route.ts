import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data, error } = await supabase
      .from('champion_predictions')
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
      .select('champion_prediction_locked')
      .eq('is_active', true)
      .single()

    if (settings?.champion_prediction_locked) {
      return NextResponse.json({ error: 'Previsão de campeão bloqueada' }, { status: 400 })
    }

    const { champion_team_id, champion_team_name, champion_team_logo } = await request.json()

    const { data, error } = await supabase
      .from('champion_predictions')
      .upsert(
        { user_id: user.id, champion_team_id, champion_team_name, champion_team_logo },
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
