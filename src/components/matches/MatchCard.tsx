'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Clock, MapPin } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import {
  formatMatchDate,
  isMatchLive,
  isMatchFinished,
  isPredictionLocked,
  getStageLabel,
  getGroupLabel,
  cn,
} from '@/lib/utils'
import { translateTeamName } from '@/lib/team-names'
import type { Match, Prediction } from '@/types'

interface MatchCardProps {
  match: Match
  prediction?: Prediction
  showPrediction?: boolean
  compact?: boolean
  onPalpitar?: () => void
}

export function MatchCard({ match, prediction, showPrediction = true, compact = false, onPalpitar }: MatchCardProps) {
  const live = isMatchLive(match.status)
  const finished = isMatchFinished(match.status)
  const locked = isPredictionLocked(match)
  const shouldBeInProgress = !live && !finished && match.status === 'NS'
    && new Date(match.match_date) < new Date()
  const homeName = translateTeamName(match.home_team_name)
  const awayName = translateTeamName(match.away_team_name)
  const hasScore = match.home_score !== null && match.away_score !== null

  // When unlocked and onPalpitar is provided, the card click opens the modal directly
  const handleClick = (!locked && onPalpitar)
    ? (e: React.MouseEvent) => { e.preventDefault(); onPalpitar() }
    : undefined

  const inner = (
    <Card hover className="p-4 cursor-pointer">
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-500">
            {getGroupLabel(match.group_name) || getStageLabel(match.stage)}
          </span>
          {live ? (
            <Badge variant="live">AO VIVO {match.elapsed ? `${match.elapsed}'` : ''}</Badge>
          ) : finished ? (
            <Badge variant="gray">Encerrado</Badge>
          ) : shouldBeInProgress ? (
            <Badge variant="live">Em andamento</Badge>
          ) : (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatMatchDate(match.match_date)}
            </span>
          )}
        </div>
      )}

      {/* Match */}
      <div className="flex items-center justify-between gap-3">
        {/* Home Team */}
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          {match.home_team_logo ? (
            <Image src={match.home_team_logo} alt={homeName} width={40} height={40} className="object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-400">
              {homeName.slice(0, 2)}
            </div>
          )}
          <span className="text-sm font-medium text-white text-center truncate w-full">{homeName}</span>
        </div>

        {/* Score / VS */}
        <div className="flex flex-col items-center gap-1 px-2">
          {hasScore ? (
            <div className={cn('flex items-center gap-2 text-2xl font-bold', live ? 'text-green-400' : 'text-white')}>
              <span>{match.home_score}</span>
              <span className="text-gray-500 text-base">×</span>
              <span>{match.away_score}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <div className="text-gray-400 text-sm font-medium">VS</div>
              {!live && !compact && (
                <span className="text-[10px] text-gray-600 text-center leading-tight whitespace-nowrap">
                  resultado após o jogo
                </span>
              )}
            </div>
          )}
          {compact && (
            <span className="text-xs text-gray-500">
              {live ? `${match.elapsed}'` : finished ? 'FT' : formatMatchDate(match.match_date)}
            </span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          {match.away_team_logo ? (
            <Image src={match.away_team_logo} alt={awayName} width={40} height={40} className="object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-400">
              {awayName.slice(0, 2)}
            </div>
          )}
          <span className="text-sm font-medium text-white text-center truncate w-full">{awayName}</span>
        </div>
      </div>

      {/* Prediction */}
      {showPrediction && (
        <div className={cn('mt-3 pt-3 border-t', !locked && !prediction && onPalpitar ? 'border-white/5' : 'border-white/10')}>
          {prediction ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Seu palpite:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-400">
                  {prediction.home_score_prediction} × {prediction.away_score_prediction}
                </span>
                {prediction.calculated_at && (
                  <Badge variant={prediction.exact_score ? 'green' : prediction.correct_winner ? 'yellow' : 'red'}>
                    {prediction.points}pts
                  </Badge>
                )}
              </div>
            </div>
          ) : !locked && onPalpitar ? (
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400/60" />
              <span className="text-xs text-orange-400/70 font-medium">Sem palpite</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Venue */}
      {!compact && match.venue_city && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-600 overflow-hidden">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{match.venue_name ? `${match.venue_name}, ` : ''}{match.venue_city}</span>
        </div>
      )}
    </Card>
  )

  return (
    <Link href={`/jogos/${match.id}`} onClick={handleClick}>
      {inner}
    </Link>
  )
}
