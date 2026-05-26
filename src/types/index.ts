// =====================================================
// TIPOS CENTRAIS DO BOLÃO
// =====================================================

export type MatchStatus =
  | 'NS'   // Not Started
  | '1H'   // First Half
  | 'HT'   // Half Time
  | '2H'   // Second Half
  | 'ET'   // Extra Time
  | 'P'    // Penalty
  | 'FT'   // Full Time
  | 'AET'  // After Extra Time
  | 'PEN'  // Penalties
  | 'BT'   // Break Time
  | 'SUSP' // Suspended
  | 'INT'  // Interrupted
  | 'PST'  // Postponed
  | 'CANC' // Cancelled
  | 'ABD'  // Abandoned
  | 'AWD'  // Technical Loss
  | 'WO'   // Walk Over
  | 'LIVE' // Live

export type Stage =
  | 'Group Stage'
  | 'Round of 32'
  | 'Round of 16'
  | 'Quarter-finals'
  | 'Semi-finals'
  | 'Final'
  | '3rd Place Final'

export interface UserProfile {
  id: string
  user_id: string
  name: string
  avatar_url: string | null
  total_points: number
  exact_scores: number
  correct_winners: number
  bonus_points: number
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Match {
  id: string
  api_fixture_id: number
  round: string | null
  stage: Stage
  group_name: string | null
  home_team_id: number
  home_team_name: string
  home_team_logo: string | null
  away_team_id: number
  away_team_name: string
  away_team_logo: string | null
  match_date: string
  status: MatchStatus
  elapsed: number | null
  home_score: number | null
  away_score: number | null
  home_score_ht: number | null
  away_score_ht: number | null
  winner_team_id: number | null
  venue_name: string | null
  venue_city: string | null
  last_synced_at: string
  created_at: string
}

export interface Prediction {
  id: string
  user_id: string
  match_id: string
  home_score_prediction: number
  away_score_prediction: number
  points: number
  exact_score: boolean
  correct_winner: boolean
  calculated_at: string | null
  created_at: string
  updated_at: string
  match?: Match
  user?: UserProfile
}

export interface GroupQualificationPrediction {
  id: string
  user_id: string
  group_name: string
  team_id: number
  team_name: string
  team_logo: string | null
  is_correct: boolean | null
  points: number
  created_at: string
}

export interface KnockoutPrediction {
  id: string
  user_id: string
  stage: Stage
  match_reference: string
  predicted_team_id: number
  predicted_team_name: string
  predicted_team_logo: string | null
  is_correct: boolean | null
  points: number
  created_at: string
}

export interface ChampionPrediction {
  id: string
  user_id: string
  champion_team_id: number
  champion_team_name: string
  champion_team_logo: string | null
  is_correct: boolean | null
  points: number
  created_at: string
}

export interface TopScorerPrediction {
  id: string
  user_id: string
  player_id: string
  player_name: string
  player_photo: string | null
  team_id: number | null
  team_name: string | null
  is_correct: boolean | null
  points: number
  created_at: string
}

export interface ScoringRules {
  id: string
  exact_score_points: number
  correct_winner_points: number
  group_qualified_points: number
  knockout_advance_points: number
  finalist_points: number
  champion_points: number
  top_scorer_points: number
  prediction_deadline_hours: number
  group_prediction_deadline: string
  is_active: boolean
}

export interface CompetitionSettings {
  id: string
  league_id: number
  season: number
  competition_name: string
  phase: string
  groups_prediction_locked: boolean
  knockout_prediction_locked: boolean
  champion_prediction_locked: boolean
  top_scorer_prediction_locked: boolean
  top_scorer_deadline: string | null
  is_active: boolean
}

export interface ApiSyncLog {
  id: string
  type: string
  status: 'success' | 'error' | 'running'
  message: string | null
  records_affected: number
  created_at: string
}

// Ranking
export interface RankingEntry {
  position: number
  user_id: string
  name: string
  avatar_url: string | null
  total_points: number
  exact_scores: number
  correct_winners: number
  bonus_points: number
  predictions_count: number
}

// API-Football types
export interface ApiFootballFixture {
  fixture: {
    id: number
    referee: string | null
    timezone: string
    date: string
    timestamp: number
    periods: { first: number | null; second: number | null }
    venue: { id: number; name: string; city: string }
    status: { long: string; short: string; elapsed: number | null }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string
    season: number
    round: string
  }
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null }
    away: { id: number; name: string; logo: string; winner: boolean | null }
  }
  goals: { home: number | null; away: number | null }
  score: {
    halftime: { home: number | null; away: number | null }
    fulltime: { home: number | null; away: number | null }
    extratime: { home: number | null; away: number | null }
    penalty: { home: number | null; away: number | null }
  }
}

export interface ApiFootballPlayer {
  player: {
    id: number
    name: string
    photo: string
  }
  statistics: Array<{
    team: { id: number; name: string; logo: string }
    goals: { total: number | null; assists: number | null }
    games: { appearences: number | null; minutes: number | null }
  }>
}

export interface ApiFootballStanding {
  rank: number
  team: { id: number; name: string; logo: string }
  points: number
  goalsDiff: number
  group: string
  form: string
  status: string
  description: string
  all: {
    played: number
    win: number
    draw: number
    lose: number
    goals: { for: number; against: number }
  }
}

// Forms
export interface PredictionFormData {
  home_score_prediction: number
  away_score_prediction: number
}

export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}
