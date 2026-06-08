'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Eye, ChevronDown, ChevronUp, Check, X, Clock, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/Loading'
import { cn, formatMatchDate, getStageLabel, isMatchFinished, getGroupLabel } from '@/lib/utils'
import { translateTeamName } from '@/lib/team-names'
import type { Match, MatchStatus } from '@/types'

interface PredictionEntry {
  id: string
  user_id: string
  user_name: string
  user_avatar: string | null
  home_score_prediction: number
  away_score_prediction: number
  points: number | null
  exact_score: boolean
  correct_winner: boolean
  calculated_at: string | null
}

interface MatchWithPredictions extends Match {
  predictions: PredictionEntry[]
}

export default function GaleraPage() {
  const [matches, setMatches] = useState<MatchWithPredictions[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [stageFilter, setStageFilter] = useState<string>('all')

  useEffect(() => {
    fetch('/api/palpites-galera')
      .then(r => r.json())
      .then(data => {
        setMatches(data.matches || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const stages = ['all', ...Array.from(new Set(matches.map(m => m.stage))).sort()]

  const filtered = stageFilter === 'all'
    ? matches
    : matches.filter(m => m.stage === stageFilter)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Eye className="w-6 h-6 text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Palpites da Galera</h1>
          <p className="text-sm text-gray-400">Revelados 1h antes de cada jogo</p>
        </div>
      </div>

      {/* Stage filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {stages.map(s => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
              stageFilter === s
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
            )}
          >
            {s === 'all' ? 'Todos' : getStageLabel(s)}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">Nenhum jogo disponível ainda</p>
          <p className="text-sm text-gray-600 mt-1">Os palpites são revelados 1h antes de cada partida</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(match => {
            const isOpen = expanded.has(match.id)
            const finished = isMatchFinished(match.status as MatchStatus)
            const homePT = translateTeamName(match.home_team_name)
            const awayPT = translateTeamName(match.away_team_name)
            const hasPredictions = match.predictions.length > 0

            return (
              <Card key={match.id}>
                <button
                  className="w-full p-4 text-left"
                  onClick={() => hasPredictions && toggleExpand(match.id)}
                >
                  {/* Match header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500">
                      {getGroupLabel(match.group_name) || getStageLabel(match.stage)} · {formatMatchDate(match.match_date)}
                    </span>
                    {hasPredictions && (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-xs text-gray-400">{match.predictions.length}</span>
                        {isOpen
                          ? <ChevronUp className="w-4 h-4 text-gray-500" />
                          : <ChevronDown className="w-4 h-4 text-gray-500" />
                        }
                      </div>
                    )}
                    {!hasPredictions && (
                      <span className="text-xs text-gray-600">Sem palpites</span>
                    )}
                  </div>

                  {/* Teams + score */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {match.home_team_logo && (
                        <Image src={match.home_team_logo} alt={homePT} width={28} height={28} className="object-contain shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-white truncate">{homePT}</span>
                    </div>

                    <div className="text-center shrink-0 px-2">
                      {finished && match.home_score !== null && match.away_score !== null ? (
                        <div className="text-lg font-bold text-white tabular-nums">
                          {match.home_score} <span className="text-gray-500">×</span> {match.away_score}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 font-medium">vs</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span className="text-sm font-semibold text-white truncate text-right">{awayPT}</span>
                      {match.away_team_logo && (
                        <Image src={match.away_team_logo} alt={awayPT} width={28} height={28} className="object-contain shrink-0" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Predictions list */}
                {isOpen && hasPredictions && (
                  <CardContent className="pt-0 pb-3 border-t border-white/5">
                    <div className="space-y-1 mt-3">
                      {match.predictions.map(pred => {
                        const isCalculated = !!pred.calculated_at
                        return (
                          <div
                            key={pred.id}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                              isCalculated && pred.exact_score
                                ? 'bg-green-500/10 border border-green-500/20'
                                : isCalculated && pred.correct_winner
                                  ? 'bg-yellow-500/10 border border-yellow-500/20'
                                  : isCalculated
                                    ? 'bg-red-500/10 border border-red-500/20'
                                    : 'bg-white/5'
                            )}
                          >
                            {/* Avatar */}
                            {pred.user_avatar ? (
                              <Image
                                src={pred.user_avatar}
                                alt={pred.user_name}
                                width={28}
                                height={28}
                                className="rounded-full shrink-0 object-cover"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-400 shrink-0 font-medium">
                                {pred.user_name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            {/* Name */}
                            <span className="flex-1 text-sm text-gray-200 truncate">{pred.user_name}</span>

                            {/* Prediction score */}
                            <span className={cn(
                              'text-sm font-bold tabular-nums shrink-0',
                              isCalculated && pred.exact_score ? 'text-green-400'
                                : isCalculated && pred.correct_winner ? 'text-yellow-400'
                                : isCalculated ? 'text-red-400'
                                : 'text-blue-400'
                            )}>
                              {pred.home_score_prediction} × {pred.away_score_prediction}
                            </span>

                            {/* Result icon */}
                            {isCalculated && (
                              <div className="shrink-0">
                                {pred.exact_score ? (
                                  <Check className="w-4 h-4 text-green-400" />
                                ) : pred.correct_winner ? (
                                  <Check className="w-4 h-4 text-yellow-400" />
                                ) : (
                                  <X className="w-4 h-4 text-red-400" />
                                )}
                              </div>
                            )}

                            {/* Points */}
                            {isCalculated && pred.points !== null && (
                              <span className={cn(
                                'text-xs font-semibold shrink-0 w-10 text-right',
                                pred.exact_score ? 'text-green-400'
                                  : pred.correct_winner ? 'text-yellow-400'
                                  : 'text-red-400'
                              )}>
                                +{pred.points}pt
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
