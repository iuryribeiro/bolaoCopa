// =====================================================
// football-data.org API v4 — Types
// =====================================================

export type FDMatchStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'EXTRA_TIME'
  | 'PENALTY_SHOOTOUT'
  | 'FINISHED'
  | 'SUSPENDED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'AWARDED'

export type FDStage =
  | 'GROUP_STAGE'
  | 'LAST_32'
  | 'LAST_16'
  | 'QUARTER_FINALS'
  | 'SEMI_FINALS'
  | 'THIRD_PLACE'
  | 'FINAL'
  | 'PRELIMINARY_ROUND'
  | 'PLAYOFFS'
  | string // outros valores imprevistos da API

export interface FDTeam {
  id: number
  name: string
  shortName: string
  tla: string
  crest: string
}

export interface FDScore {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
  duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT'
  fullTime: { home: number | null; away: number | null }
  halfTime: { home: number | null; away: number | null }
}

export interface FDMatch {
  id: number
  utcDate: string
  status: FDMatchStatus
  minute: number | null
  injuryTime: number | null
  matchday: number | null
  stage: FDStage
  group: string | null
  lastUpdated: string
  homeTeam: FDTeam
  awayTeam: FDTeam
  score: FDScore
  venue: string | null
  referees: Array<{ id: number; name: string; nationality: string }>
}

export interface FDMatchesResponse {
  filters: Record<string, string>
  resultSet: { count: number; first: string; last: string; played: number }
  competition: { id: number; name: string; code: string }
  matches: FDMatch[]
}

export interface FDStandingTable {
  position: number
  team: FDTeam
  playedGames: number
  form: string | null
  won: number
  draw: number
  lost: number
  points: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
}

export interface FDStandingGroup {
  stage: string
  type: 'TOTAL' | 'HOME' | 'AWAY'
  group: string | null
  table: FDStandingTable[]
}

export interface FDStandingsResponse {
  filters: Record<string, string>
  competition: { id: number; name: string; code: string }
  season: { id: number; startDate: string; endDate: string; currentMatchday: number }
  standings: FDStandingGroup[]
}

export interface FDPlayer {
  id: number
  name: string
  position: string | null
  dateOfBirth: string | null
  nationality: string | null
}

export interface FDScorer {
  player: FDPlayer
  team: FDTeam
  playedMatches: number
  goals: number
  assists: number | null
  penalties: number | null
}

export interface FDScorersResponse {
  count: number
  filters: Record<string, string>
  competition: { id: number; name: string; code: string }
  season: { id: number; startDate: string; endDate: string }
  scorers: FDScorer[]
}
