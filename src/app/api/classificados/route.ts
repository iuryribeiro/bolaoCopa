import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface TeamRecord {
  team_id: number
  team_name: string
  team_logo: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  points: number
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: matches, error } = await supabase
      .from('matches')
      .select('*')
      .eq('stage', 'Group Stage')
      .in('status', ['FT', 'AET', 'PEN', 'AWD'])
      .not('home_score', 'is', null)
      .not('away_score', 'is', null)

    if (error) throw error

    // Agrupar por group_name e calcular tabela
    const groupMap = new Map<string, Map<number, TeamRecord>>()

    for (const match of matches || []) {
      const group = match.group_name
      if (!group) continue

      if (!groupMap.has(group)) groupMap.set(group, new Map())
      const teams = groupMap.get(group)!

      const homeScore = match.home_score as number
      const awayScore = match.away_score as number

      // Inicializar times se não existirem
      if (!teams.has(match.home_team_id)) {
        teams.set(match.home_team_id, {
          team_id: match.home_team_id,
          team_name: match.home_team_name,
          team_logo: match.home_team_logo,
          played: 0, won: 0, drawn: 0, lost: 0,
          goals_for: 0, goals_against: 0, points: 0,
        })
      }
      if (!teams.has(match.away_team_id)) {
        teams.set(match.away_team_id, {
          team_id: match.away_team_id,
          team_name: match.away_team_name,
          team_logo: match.away_team_logo,
          played: 0, won: 0, drawn: 0, lost: 0,
          goals_for: 0, goals_against: 0, points: 0,
        })
      }

      const home = teams.get(match.home_team_id)!
      const away = teams.get(match.away_team_id)!

      home.played++
      away.played++
      home.goals_for += homeScore
      home.goals_against += awayScore
      away.goals_for += awayScore
      away.goals_against += homeScore

      if (homeScore > awayScore) {
        home.won++; home.points += 3
        away.lost++
      } else if (homeScore === awayScore) {
        home.drawn++; home.points += 1
        away.drawn++; away.points += 1
      } else {
        away.won++; away.points += 3
        home.lost++
      }
    }

    // Montar resultado ordenado
    const standings = Array.from(groupMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupName, teamsMap]) => {
        const table = Array.from(teamsMap.values())
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points
            const gdA = a.goals_for - a.goals_against
            const gdB = b.goals_for - b.goals_against
            if (gdB !== gdA) return gdB - gdA
            return b.goals_for - a.goals_for
          })
          .map((t, i) => ({ ...t, position: i + 1, goal_diff: t.goals_for - t.goals_against }))

        return { group: groupName, table }
      })

    return NextResponse.json({ standings })
  } catch (error) {
    console.error('Classificados error:', error)
    return NextResponse.json({ standings: [], error: 'Erro ao calcular classificação' }, { status: 500 })
  }
}
