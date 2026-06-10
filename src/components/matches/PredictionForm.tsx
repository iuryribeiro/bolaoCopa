'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Minus, Plus, Lock, Check, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn, isPredictionLocked } from '@/lib/utils'
import { translateTeamName } from '@/lib/team-names'
import type { Match, Prediction } from '@/types'

interface PredictionFormProps {
  match: Match
  existingPrediction?: Prediction
  onSave?: (prediction: Prediction) => void
  deadlineHours?: number
  compact?: boolean
}

export function PredictionForm({
  match,
  existingPrediction,
  onSave,
  deadlineHours = 1,
  compact = false,
}: PredictionFormProps) {
  const homePT = translateTeamName(match.home_team_name)
  const awayPT = translateTeamName(match.away_team_name)
  const [homeScore, setHomeScore] = useState(existingPrediction?.home_score_prediction ?? 0)
  const [awayScore, setAwayScore] = useState(existingPrediction?.away_score_prediction ?? 0)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<'home' | 'away' | null>(null)
  const [editValue, setEditValue] = useState('')

  const locked = isPredictionLocked(match, deadlineHours)
  const logoSize = compact ? 40 : 52

  const commitEdit = (side: 'home' | 'away', raw: string) => {
    const n = parseInt(raw, 10)
    const val = isNaN(n) ? 0 : Math.min(99, Math.max(0, n))
    if (side === 'home') setHomeScore(val)
    else setAwayScore(val)
    setEditing(null)
  }

  const startEdit = (side: 'home' | 'away') => {
    if (locked) return
    setEditing(side)
    setEditValue(String(side === 'home' ? homeScore : awayScore))
  }

  const handleSave = async () => {
    if (locked) return
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: match.id,
          home_score_prediction: homeScore,
          away_score_prediction: awayScore,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')

      setSuccess(true)
      onSave?.(data.prediction)
      setTimeout(() => setSuccess(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar palpite')
    } finally {
      setLoading(false)
    }
  }

  const ScoreInput = ({
    value,
    onChange,
    side,
    logo,
    teamName,
  }: {
    value: number
    onChange: (v: number) => void
    side: 'home' | 'away'
    logo?: string | null
    teamName: string
  }) => {
    const isEditing = editing === side

    return (
      <div className="flex flex-col items-center gap-2">
        {logo ? (
          <Image src={logo} alt={teamName} width={logoSize} height={logoSize} className="object-contain" />
        ) : (
          <div
            className={cn(
              'rounded-full bg-white/10 flex items-center justify-center text-gray-400 text-sm font-medium',
              compact ? 'w-10 h-10' : 'w-13 h-13'
            )}
          >
            {teamName.slice(0, 2).toUpperCase()}
          </div>
        )}

        <span className={cn('font-semibold text-white text-center leading-tight', compact ? 'text-xs max-w-[70px]' : 'text-sm max-w-[80px]')}>
          {teamName}
        </span>

        <div className="flex items-center gap-1.5 mt-0.5">
          <button
            onClick={() => !locked && onChange(Math.max(0, value - 1))}
            disabled={locked || value === 0}
            className={cn(
              'rounded-full flex items-center justify-center transition-all',
              compact ? 'w-8 h-8' : 'w-10 h-10',
              locked || value === 0
                ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                : 'bg-white/10 active:bg-white/30 hover:bg-white/20 text-white'
            )}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {isEditing ? (
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={editValue}
              onChange={e => setEditValue(e.target.value.replace(/\D/g, '').slice(0, 2))}
              onBlur={() => commitEdit(side, editValue)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  commitEdit(side, editValue)
                  // Auto-move to away score after entering home
                  if (side === 'home') {
                    setTimeout(() => startEdit('away'), 50)
                  }
                }
                if (e.key === 'Tab') {
                  e.preventDefault()
                  commitEdit(side, editValue)
                  if (side === 'home') setTimeout(() => startEdit('away'), 50)
                }
                if (e.key === 'Escape') {
                  setEditing(null)
                }
              }}
              autoFocus
              onFocus={e => e.target.select()}
              className={cn(
                'font-bold text-emerald-300 text-center tabular-nums bg-transparent border-b-2 border-emerald-400 outline-none',
                compact ? 'text-2xl w-10' : 'text-3xl w-12'
              )}
            />
          ) : (
            <button
              onClick={() => startEdit(side)}
              disabled={locked}
              title={locked ? undefined : 'Toque para digitar'}
              className={cn(
                'font-bold text-white text-center tabular-nums transition-colors',
                compact ? 'text-2xl w-10' : 'text-3xl w-12',
                !locked && 'hover:text-emerald-300 cursor-text'
              )}
            >
              {value}
            </button>
          )}

          <button
            onClick={() => !locked && onChange(Math.min(99, value + 1))}
            disabled={locked}
            className={cn(
              'rounded-full flex items-center justify-center transition-all',
              compact ? 'w-8 h-8' : 'w-10 h-10',
              locked
                ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                : 'bg-white/10 active:bg-white/30 hover:bg-white/20 text-white'
            )}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  if (locked) {
    return (
      <div className={cn('bg-white/5 border border-white/10 rounded-xl', compact ? 'p-3' : 'p-5')}>
        <div className="flex items-center gap-2 text-gray-400 mb-3">
          <Lock className="w-3.5 h-3.5" />
          <span className="text-xs">Palpite encerrado</span>
        </div>

        <div className="flex items-center justify-around">
          <div className="flex flex-col items-center gap-1.5">
            {match.home_team_logo && (
              <Image src={match.home_team_logo} alt={homePT} width={compact ? 36 : 44} height={compact ? 36 : 44} className="object-contain" />
            )}
            <span className="text-xs text-white font-medium">{homePT}</span>
          </div>
          <div className="text-center px-3">
            {existingPrediction ? (
              <div className="text-xl font-bold text-blue-400">
                {existingPrediction.home_score_prediction} × {existingPrediction.away_score_prediction}
              </div>
            ) : (
              <div className="text-gray-500 text-xs">Sem palpite</div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1.5">
            {match.away_team_logo && (
              <Image src={match.away_team_logo} alt={awayPT} width={compact ? 36 : 44} height={compact ? 36 : 44} className="object-contain" />
            )}
            <span className="text-xs text-white font-medium">{awayPT}</span>
          </div>
        </div>

        {existingPrediction?.calculated_at && (
          <div className="mt-3 text-center">
            <span className={cn(
              'inline-block px-3 py-1 rounded-full text-xs font-semibold',
              existingPrediction.exact_score
                ? 'bg-green-500/20 text-green-400'
                : existingPrediction.correct_winner
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
            )}>
              {existingPrediction.points} pontos
              {existingPrediction.exact_score && ' · Placar exato!'}
              {!existingPrediction.exact_score && existingPrediction.correct_winner && ' · Vencedor correto'}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('bg-white/5 border border-white/10 rounded-xl', compact ? 'p-3' : 'p-5')}>
      <div className={cn('flex items-center justify-around', compact ? 'mb-3' : 'mb-5')}>
        <ScoreInput
          value={homeScore}
          onChange={setHomeScore}
          side="home"
          logo={match.home_team_logo}
          teamName={homePT}
        />
        <div className="text-xl font-bold text-gray-600">×</div>
        <ScoreInput
          value={awayScore}
          onChange={setAwayScore}
          side="away"
          logo={match.away_team_logo}
          teamName={awayPT}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs mb-2 p-2 bg-red-500/10 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-emerald-400 text-xs mb-2 p-2 bg-emerald-500/10 rounded-lg">
          <Check className="w-3.5 h-3.5 shrink-0" />
          Palpite salvo!
        </div>
      )}

      <Button onClick={handleSave} loading={loading} fullWidth size={compact ? 'sm' : 'md'}>
        {existingPrediction ? 'Atualizar Palpite' : 'Salvar Palpite'}
      </Button>

      {!compact && (
        <p className="text-xs text-gray-500 text-center mt-2">
          Placar exato: 3pts · Vencedor/Empate: 1pt
        </p>
      )}
    </div>
  )
}
