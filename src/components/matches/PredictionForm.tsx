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
}

export function PredictionForm({ match, existingPrediction, onSave, deadlineHours = 1 }: PredictionFormProps) {
  const homePT = translateTeamName(match.home_team_name)
  const awayPT = translateTeamName(match.away_team_name)
  const [homeScore, setHomeScore] = useState(existingPrediction?.home_score_prediction ?? 0)
  const [awayScore, setAwayScore] = useState(existingPrediction?.away_score_prediction ?? 0)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const locked = isPredictionLocked(match, deadlineHours)

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
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar palpite')
    } finally {
      setLoading(false)
    }
  }

  const ScoreInput = ({
    value,
    onChange,
    label,
    logo,
    teamName,
  }: {
    value: number
    onChange: (v: number) => void
    label: string
    logo?: string | null
    teamName: string
  }) => (
    <div className="flex flex-col items-center gap-3">
      {logo ? (
        <Image src={logo} alt={teamName} width={56} height={56} className="object-contain" />
      ) : (
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-gray-400 text-sm font-medium">
          {teamName.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="text-sm font-semibold text-white text-center">{teamName}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => !locked && onChange(Math.max(0, value - 1))}
          disabled={locked || value === 0}
          className={cn(
            'w-11 h-11 rounded-full flex items-center justify-center transition-all',
            locked || value === 0
              ? 'bg-white/5 text-gray-600 cursor-not-allowed'
              : 'bg-white/10 active:bg-white/30 hover:bg-white/20 text-white'
          )}
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-3xl font-bold text-white w-12 text-center tabular-nums">
          {value}
        </span>
        <button
          onClick={() => !locked && onChange(Math.min(99, value + 1))}
          disabled={locked}
          className={cn(
            'w-11 h-11 rounded-full flex items-center justify-center transition-all',
            locked
              ? 'bg-white/5 text-gray-600 cursor-not-allowed'
              : 'bg-white/10 active:bg-white/30 hover:bg-white/20 text-white'
          )}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  if (locked) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center gap-2 text-gray-400 mb-4">
          <Lock className="w-4 h-4" />
          <span className="text-sm">Palpite encerrado</span>
        </div>

        <div className="flex items-center justify-around">
          <div className="flex flex-col items-center gap-2">
            {match.home_team_logo && (
              <Image src={match.home_team_logo} alt={homePT} width={48} height={48} className="object-contain" />
            )}
            <span className="text-sm text-white font-medium">{homePT}</span>
          </div>
          <div className="text-center">
            {existingPrediction ? (
              <div className="text-2xl font-bold text-blue-400">
                {existingPrediction.home_score_prediction} × {existingPrediction.away_score_prediction}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Sem palpite</div>
            )}
          </div>
          <div className="flex flex-col items-center gap-2">
            {match.away_team_logo && (
              <Image src={match.away_team_logo} alt={awayPT} width={48} height={48} className="object-contain" />
            )}
            <span className="text-sm text-white font-medium">{awayPT}</span>
          </div>
        </div>

        {existingPrediction?.calculated_at && (
          <div className="mt-4 text-center">
            <span className={cn(
              'inline-block px-3 py-1 rounded-full text-sm font-semibold',
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
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-around mb-6">
        <ScoreInput
          value={homeScore}
          onChange={setHomeScore}
          label={homePT}
          logo={match.home_team_logo}
          teamName={homePT}
        />
        <div className="text-2xl font-bold text-gray-500">×</div>
        <ScoreInput
          value={awayScore}
          onChange={setAwayScore}
          label={awayPT}
          logo={match.away_team_logo}
          teamName={awayPT}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm mb-3 p-2 bg-red-500/10 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-green-400 text-sm mb-3 p-2 bg-green-500/10 rounded-lg">
          <Check className="w-4 h-4 shrink-0" />
          Palpite salvo com sucesso!
        </div>
      )}

      <Button onClick={handleSave} loading={loading} fullWidth>
        {existingPrediction ? 'Atualizar Palpite' : 'Salvar Palpite'}
      </Button>

      <p className="text-xs text-gray-500 text-center mt-2">
        Placar exato: 3pts · Vencedor/Empate: 1pt
      </p>
    </div>
  )
}
