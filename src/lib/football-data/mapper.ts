import type { FDMatch, FDMatchStatus, FDStage } from './types'
import type { Match, MatchStatus, Stage } from '@/types'

export function mapFDStatus(status: FDMatchStatus): MatchStatus {
  switch (status) {
    case 'LIVE':
    case 'IN_PLAY':          return '1H'
    case 'PAUSED':           return 'HT'
    case 'EXTRA_TIME':       return 'ET'
    case 'PENALTY_SHOOTOUT': return 'P'
    case 'FINISHED':         return 'FT'
    case 'AWARDED':          return 'AWD'
    case 'SUSPENDED':        return 'SUSP'
    case 'POSTPONED':        return 'PST'
    case 'CANCELLED':        return 'CANC'
    case 'SCHEDULED':
    case 'TIMED':
    default:                 return 'NS'
  }
}

export function mapFDStage(stage: FDStage): Stage {
  switch (stage) {
    case 'LAST_32':         return 'Round of 32'
    case 'LAST_16':         return 'Round of 16'
    case 'QUARTER_FINALS':  return 'Quarter-finals'
    case 'SEMI_FINALS':     return 'Semi-finals'
    case 'THIRD_PLACE':     return '3rd Place Final'
    case 'FINAL':           return 'Final'
    case 'GROUP_STAGE':
    default:                return 'Group Stage'
  }
}

export function mapFDGroupName(group: string | null): string | null {
  if (!group) return null
  // football-data envia "GROUP_A", "GROUP_B", etc.
  return group.replace('GROUP_', 'Group ')
}

export function mapFDMatchToSupabase(match: FDMatch) {
  const status = mapFDStatus(match.status)
  const isFinished = ['FT', 'AET', 'PEN', 'AWD'].includes(status)

  const isLiveNow = ['LIVE', 'IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'].includes(match.status)

  const homeScore = isFinished
    ? match.score.fullTime.home
    : isLiveNow
      ? match.score.fullTime.home ?? match.score.halfTime.home
      : null

  const awayScore = isFinished
    ? match.score.fullTime.away
    : isLiveNow
      ? match.score.fullTime.away ?? match.score.halfTime.away
      : null

  let winnerTeamId: number | null = null
  if (match.score.winner === 'HOME_TEAM') winnerTeamId = match.homeTeam.id
  else if (match.score.winner === 'AWAY_TEAM') winnerTeamId = match.awayTeam.id

  return {
    api_fixture_id: match.id,
    round: match.matchday ? `Matchday ${match.matchday}` : mapFDStage(match.stage),
    stage: mapFDStage(match.stage),
    group_name: mapFDGroupName(match.group),
    home_team_id: match.homeTeam.id,
    home_team_name: match.homeTeam.name,
    home_team_logo: match.homeTeam.crest || null,
    away_team_id: match.awayTeam.id,
    away_team_name: match.awayTeam.name,
    away_team_logo: match.awayTeam.crest || null,
    match_date: match.utcDate,
    status,
    elapsed: match.minute,
    home_score: homeScore,
    away_score: awayScore,
    home_score_ht: match.score.halfTime.home,
    away_score_ht: match.score.halfTime.away,
    winner_team_id: winnerTeamId,
    venue_name: match.venue || null,
    venue_city: null,
    last_synced_at: new Date().toISOString(),
  }
}
