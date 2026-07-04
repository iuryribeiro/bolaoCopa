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
  const baseStatus = mapFDStatus(match.status)

  // Para partidas encerradas, refinamos o status conforme score.duration
  // FINISHED + EXTRA_TIME     → AET (após prorrogação)
  // FINISHED + PENALTY_SHOOTOUT → PEN (após pênaltis)
  let status: MatchStatus = baseStatus
  if (baseStatus === 'FT') {
    if (match.score.duration === 'EXTRA_TIME')       status = 'AET'
    else if (match.score.duration === 'PENALTY_SHOOTOUT') status = 'PEN'
  }

  const isFinished = ['FT', 'AET', 'PEN', 'AWD'].includes(status)
  const isLiveNow  = ['LIVE', 'IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'].includes(match.status)

  // ── Placar dos 90 minutos (apenas 1º + 2º tempo) ──────────────────────────
  //
  // Prioridade para obter o placar dos 90 min:
  //   1. score.regularTime — retornado pela API quando existe separação
  //   2. score.fullTime    — para PEN é o placar empatado (= 90 min) ✓
  //                          para AET inclui gols da prorrogação    ✗
  //   3. Durante o jogo:  fullTime ao vivo (pode ser null → fallback halfTime)
  //
  const reg = match.score.regularTime

  let homeScore: number | null = null
  let awayScore: number | null = null

  if (isFinished) {
    if (reg) {
      // API forneceu o placar dos 90 min explicitamente
      homeScore = reg.home
      awayScore = reg.away
    } else if (status === 'PEN' || status === 'AET') {
      // regularTime não disponível: não temos como saber o placar dos 90 min.
      // Retornamos null para que o sync preserve o placar já no banco (inserido manualmente).
      homeScore = null
      awayScore = null
    } else {
      // FT normal (90 min); fallback para halfTime se fullTime ainda não veio da API
      homeScore = match.score.fullTime.home ?? match.score.halfTime.home
      awayScore = match.score.fullTime.away ?? match.score.halfTime.away
    }
  } else if (isLiveNow) {
    homeScore = match.score.fullTime.home ?? match.score.halfTime.home
    awayScore = match.score.fullTime.away ?? match.score.halfTime.away
  }

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
