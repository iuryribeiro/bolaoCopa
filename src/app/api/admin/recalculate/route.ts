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

    // Recalcular todos os jogos terminados (fase de grupos + pontuação geral)
    const { data: finishedMatches } = await adminSupabase
      .from('matches')
      .select('id, stage, winner_team_id, status')
      .in('status', ['FT', 'AET', 'PEN', 'AWD'])

    const { data: rules } = await adminSupabase
      .from('scoring_rules')
      .select('knockout_advance_points, finalist_points')
      .eq('is_active', true)
      .single()

    let count = 0
    let knockoutCount = 0

    for (const match of (finishedMatches || [])) {
      // Score knockout predictions for finished knockout matches
      if (match.winner_team_id) {
        const stagePoints = match.stage === 'Semi-finals'
          ? (rules?.finalist_points ?? 2)
          : (rules?.knockout_advance_points ?? 1)

        await Promise.all([
          adminSupabase.from('knockout_predictions')
            .update({ is_correct: true, points: stagePoints, updated_at: new Date().toISOString() })
            .eq('match_reference', match.id)
            .eq('predicted_team_id', match.winner_team_id),
          adminSupabase.from('knockout_predictions')
            .update({ is_correct: false, points: 0, updated_at: new Date().toISOString() })
            .eq('match_reference', match.id)
            .neq('predicted_team_id', match.winner_team_id),
        ])
        knockoutCount++
      }

      // Recalculate group stage predictions + all user totals
      await adminSupabase.rpc('recalculate_match_points', { p_match_id: match.id })
      count++
    }

    return NextResponse.json({
      success: true,
      message: `Recalculado: ${count} jogos, ${knockoutCount} com palpites mata-mata pontuados`,
    })
  } catch (error) {
    console.error('Recalculate error:', error)
    return NextResponse.json({ error: 'Erro ao recalcular' }, { status: 500 })
  }
}
