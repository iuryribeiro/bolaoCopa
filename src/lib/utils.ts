import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, isAfter, addMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Match, MatchStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function brtParts(dateStr: string) {
  const date = new Date(dateStr)
  const parts: Record<string, string> = {}
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', weekday: 'long',
    timeZone: 'America/Sao_Paulo', hour12: false,
  }).formatToParts(date).forEach(({ type, value }) => { parts[type] = value })
  return parts
}

export function formatMatchDate(dateStr: string): string {
  const p = brtParts(dateStr)
  return `${p.day}/${p.month} às ${p.hour}:${p.minute}`
}

export function formatFullDate(dateStr: string): string {
  const p = brtParts(dateStr)
  return `${p.weekday}, ${p.day} de ${p.month} de ${p.year} às ${p.hour}:${p.minute}`
}

export function formatRelativeTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { locale: ptBR, addSuffix: true })
}

export function isPredictionLocked(match: Match, deadlineMinutes = 10): boolean {
  const matchDate = new Date(match.match_date)
  const deadline = addMinutes(matchDate, -deadlineMinutes)
  return isAfter(new Date(), deadline) || isMatchInProgress(match.status) || isMatchFinished(match.status)
}

export function isMatchLive(status: MatchStatus): boolean {
  return ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE'].includes(status)
}

export function isMatchFinished(status: MatchStatus): boolean {
  return ['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(status)
}

export function isMatchInProgress(status: MatchStatus): boolean {
  return isMatchLive(status)
}

export function getMatchStatusLabel(status: MatchStatus, elapsed?: number | null): string {
  switch (status) {
    case 'NS': return 'Não iniciado'
    case '1H': return elapsed ? `${elapsed}'` : '1º Tempo'
    case 'HT': return 'Intervalo'
    case '2H': return elapsed ? `${elapsed}'` : '2º Tempo'
    case 'ET': return 'Prorrogação'
    case 'P': return 'Pênaltis'
    case 'FT': return 'Encerrado'
    case 'AET': return 'Encerrado (PE)'
    case 'PEN': return 'Encerrado (PEN)'
    case 'PST': return 'Adiado'
    case 'CANC': return 'Cancelado'
    case 'SUSP': return 'Suspenso'
    default: return status
  }
}

export function getMatchStatusColor(status: MatchStatus): string {
  if (isMatchLive(status)) return 'text-green-400'
  if (isMatchFinished(status)) return 'text-gray-400'
  if (['PST', 'CANC', 'SUSP'].includes(status)) return 'text-red-400'
  return 'text-blue-400'
}

export function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    'Group Stage': 'Fase de Grupos',
    'Round of 32': 'Rodada de 32',
    'Round of 16': 'Oitavas de Final',
    'Quarter-finals': 'Quartas de Final',
    'Semi-finals': 'Semifinais',
    'Final': 'Final',
    '3rd Place Final': '3º Lugar',
  }
  return labels[stage] || stage
}

export function getGroupLabel(group: string | null): string {
  if (!group) return ''
  return `Grupo ${group.replace('Group ', '')}`
}

export function calculatePredictionPoints(
  homePred: number,
  awayPred: number,
  homeActual: number,
  awayActual: number,
  exactPoints = 3,
  winnerPoints = 1
): { points: number; exactScore: boolean; correctWinner: boolean } {
  const getPredWinner = (h: number, a: number) =>
    h > a ? 'home' : a > h ? 'away' : 'draw'

  const predWinner = getPredWinner(homePred, awayPred)
  const actualWinner = getPredWinner(homeActual, awayActual)

  if (homePred === homeActual && awayPred === awayActual) {
    return { points: exactPoints, exactScore: true, correctWinner: true }
  } else if (predWinner === actualWinner) {
    return { points: winnerPoints, exactScore: false, correctWinner: true }
  } else {
    return { points: 0, exactScore: false, correctWinner: false }
  }
}

export function getOrdinal(n: number): string {
  return `${n}º`
}

export function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str
}
