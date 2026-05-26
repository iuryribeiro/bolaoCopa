import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('top_scorer_players')
      .select('*')
      .eq('is_active', true)
      .order('goals_scored', { ascending: false })
      .order('player_name', { ascending: true })

    if (error) {
      console.error('[players] supabase error:', JSON.stringify(error))
      throw new Error(error.message || error.code || JSON.stringify(error))
    }

    const players = (data || []).map(p => ({
      player: {
        id: p.player_api_id ?? p.id,
        name: p.player_name,
        photo: null,
        nationality: p.nationality,
        position: p.position,
      },
      statistics: [{
        team: {
          id: null,
          name: p.team_name,
          logo: p.team_logo,
        },
        goals: {
          total: p.goals_scored,
          assists: p.assists,
        },
        games: {
          appearences: p.matches_played || null,
          minutes: null,
        },
      }],
    }))

    return NextResponse.json({ players })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[/api/football/players]', msg)
    return NextResponse.json({ players: [], error: msg }, { status: 500 })
  }
}
