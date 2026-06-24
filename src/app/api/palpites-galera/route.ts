import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPredictionLocked } from '@/lib/utils'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: rules } = await supabase
      .from('scoring_rules')
      .select('prediction_deadline_hours')
      .eq('is_active', true)
      .single()

    const deadlineHours = rules?.prediction_deadline_hours ?? 1

    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: false })

    const lockedMatches = (matches || []).filter(m => isPredictionLocked(m, deadlineHours))
    const lockedIds = lockedMatches.map(m => m.id)

    if (lockedIds.length === 0) {
      return NextResponse.json({ matches: [] })
    }

    const { data: predictions } = await supabase
      .from('predictions')
      .select('*')
      .in('match_id', lockedIds)

    const userIds = [...new Set((predictions || []).map(p => p.user_id))]

    const { data: profiles } = userIds.length
      ? await supabase
          .from('user_profiles')
          .select('user_id, name, avatar_url')
          .in('user_id', userIds)
      : { data: [] }

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]))

    const predsByMatch = new Map<string, typeof predictions>()
    for (const pred of predictions || []) {
      if (!predsByMatch.has(pred.match_id)) predsByMatch.set(pred.match_id, [])
      predsByMatch.get(pred.match_id)!.push({
        ...pred,
        user_name: profileMap.get(pred.user_id)?.name ?? 'Usuário',
        user_avatar: profileMap.get(pred.user_id)?.avatar_url ?? null,
      })
    }

    const result = lockedMatches.map(m => ({
      ...m,
      predictions: (predsByMatch.get(m.id) || []).sort((a: any, b: any) =>
        (a.user_name as string).localeCompare(b.user_name as string)
      ),
    }))

    return NextResponse.json({ matches: result })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar palpites' }, { status: 500 })
  }
}
