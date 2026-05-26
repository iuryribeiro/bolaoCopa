import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, name, avatar_url, total_points, exact_scores, correct_winners, bonus_points')
      .order('total_points', { ascending: false })
      .order('exact_scores', { ascending: false })
      .order('name', { ascending: true })

    if (error) throw error

    const ranking = (data || []).map((user, index) => ({
      position: index + 1,
      ...user,
    }))

    return NextResponse.json({ ranking })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar ranking' }, { status: 500 })
  }
}
