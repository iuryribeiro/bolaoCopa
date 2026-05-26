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
      .from('group_qualification_predictions')
      .select('*')
      .eq('user_id', userId)
      .order('group_name')

    if (error) throw error
    return NextResponse.json({ predictions: data || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar previsões' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: settings } = await supabase
      .from('competition_settings')
      .select('groups_prediction_locked')
      .eq('is_active', true)
      .single()

    if (settings?.groups_prediction_locked) {
      return NextResponse.json({ error: 'Prazo para previsão de grupos encerrado' }, { status: 400 })
    }

    const body = await request.json()
    const {
      predictions = [],       // top-2 por grupo (group_qualified)
      wildcardPredictions = [], // 8 melhores terceiros (third_wildcard)
    } = body as {
      predictions: Array<{ group_name: string; team_id: number; team_name: string; team_logo?: string }>
      wildcardPredictions: Array<{ group_name: string; team_id: number; team_name: string; team_logo?: string }>
    }

    // Deleta apenas as previsões do tipo que está sendo salvo (preserva o outro tipo)
    if (predictions.length > 0 || wildcardPredictions.length >= 0) {
      await supabase
        .from('group_qualification_predictions')
        .delete()
        .eq('user_id', user.id)
        .eq('prediction_type', 'group_qualified')
    }

    if (wildcardPredictions.length >= 0) {
      await supabase
        .from('group_qualification_predictions')
        .delete()
        .eq('user_id', user.id)
        .eq('prediction_type', 'third_wildcard')
    }

    const rows = [
      ...predictions.map(p => ({
        user_id: user.id,
        group_name: p.group_name,
        team_id: p.team_id,
        team_name: p.team_name,
        team_logo: p.team_logo ?? null,
        prediction_type: 'group_qualified',
      })),
      ...wildcardPredictions.map(p => ({
        user_id: user.id,
        group_name: p.group_name,
        team_id: p.team_id,
        team_name: p.team_name,
        team_logo: p.team_logo ?? null,
        prediction_type: 'third_wildcard',
      })),
    ]

    if (rows.length === 0) {
      return NextResponse.json({ predictions: [] })
    }

    const { data, error } = await supabase
      .from('group_qualification_predictions')
      .insert(rows)
      .select()

    if (error) throw error
    return NextResponse.json({ predictions: data })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao salvar previsões' }, { status: 500 })
  }
}
