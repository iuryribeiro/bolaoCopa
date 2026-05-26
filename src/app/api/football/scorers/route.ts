import { NextResponse } from 'next/server'
import { footballData } from '@/lib/football-data/client'

export async function GET() {
  try {
    const result = await footballData.getScorers(30)

    const players = result.data.map(scorer => ({
      player: {
        id: scorer.player.id,
        name: scorer.player.name,
        photo: null, // football-data.org não fornece fotos de jogadores no plano free
        nationality: scorer.player.nationality,
        position: scorer.player.position,
      },
      statistics: [{
        team: {
          id: scorer.team.id,
          name: scorer.team.name,
          logo: scorer.team.crest,
        },
        goals: {
          total: scorer.goals,
          assists: scorer.assists,
          penalties: scorer.penalties,
        },
        games: {
          appearences: scorer.playedMatches,
          minutes: null,
        },
      }],
    }))

    return NextResponse.json({ players, fromCache: result.fromCache })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro ao buscar artilheiros'
    const isRateLimit = msg.includes('RATE_LIMIT')
    return NextResponse.json(
      { players: [], error: msg, rateLimited: isRateLimit },
      { status: isRateLimit ? 429 : 500 }
    )
  }
}
