import { NextResponse } from 'next/server'
import { footballData } from '@/lib/football-data/client'
import type { FDStandingGroup } from '@/lib/football-data/types'

export async function GET() {
  try {
    const result = await footballData.getStandings()

    // Converter para o formato esperado pelo frontend
    const standings = result.data.map((group: FDStandingGroup) => ({
      group: group.group || 'GROUP_A',
      table: group.table.map(entry => ({
        rank: entry.position,
        team: {
          id: entry.team.id,
          name: entry.team.name,
          logo: entry.team.crest,
        },
        points: entry.points,
        goalsDiff: entry.goalDifference,
        group: group.group,
        all: {
          played: entry.playedGames,
          win: entry.won,
          draw: entry.draw,
          lose: entry.lost,
          goals: { for: entry.goalsFor, against: entry.goalsAgainst },
        },
      })),
    }))

    return NextResponse.json({ standings, fromCache: result.fromCache })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro ao buscar classificação'
    const isRateLimit = msg.includes('RATE_LIMIT')
    return NextResponse.json(
      { standings: [], error: msg, rateLimited: isRateLimit },
      { status: isRateLimit ? 429 : 500 }
    )
  }
}
