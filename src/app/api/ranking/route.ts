import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, name, avatar_url, total_points, exact_scores, correct_winners, bonus_points')

    if (error) throw error

    // Critério de desempate: total de jogos certos (placares exatos + vencedores)
    const sorted = (data || []).sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points
      const aGames = (a.exact_scores || 0) + (a.correct_winners || 0)
      const bGames = (b.exact_scores || 0) + (b.correct_winners || 0)
      if (bGames !== aGames) return bGames - aGames
      return a.name.localeCompare(b.name, 'pt-BR')
    })

    const ranking = sorted.map((user, index) => ({
      position: index + 1,
      ...user,
    }))

    return NextResponse.json({ ranking })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar ranking' }, { status: 500 })
  }
}
