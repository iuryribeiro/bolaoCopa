import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const adminSupabase = await createAdminClient()

    // Recalcular todos os jogos terminados
    const { data: finishedMatches } = await adminSupabase
      .from('matches')
      .select('id')
      .in('status', ['FT', 'AET', 'PEN'])

    let count = 0
    for (const match of (finishedMatches || [])) {
      await adminSupabase.rpc('recalculate_match_points', { p_match_id: match.id })
      count++
    }

    return NextResponse.json({
      success: true,
      message: `Pontuação recalculada para ${count} jogos`,
    })
  } catch (error) {
    console.error('Recalculate error:', error)
    return NextResponse.json({ error: 'Erro ao recalcular' }, { status: 500 })
  }
}
