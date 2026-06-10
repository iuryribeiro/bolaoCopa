'use client'

import { useState, useCallback, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { PredictionForm } from './PredictionForm'
import { cn, isPredictionLocked, formatMatchDate, getGroupLabel, getStageLabel } from '@/lib/utils'
import type { Match, Prediction } from '@/types'

interface PredictionModalProps {
  matches: Match[]
  predictions: Map<string, Prediction>
  initialMatchId: string
  onClose: () => void
  onSave: (prediction: Prediction) => void
  deadlineHours?: number
}

export function PredictionModal({
  matches,
  predictions,
  initialMatchId,
  onClose,
  onSave,
  deadlineHours = 1,
}: PredictionModalProps) {
  const [predMap, setPredMap] = useState(() => new Map(predictions))

  const available = matches.filter(m => !isPredictionLocked(m, deadlineHours))

  const initialIndex = Math.max(0, available.findIndex(m => m.id === initialMatchId))
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const currentMatch = available[currentIndex]
  const predictedCount = available.filter(m => predMap.has(m.id)).length
  const progress = available.length > 0 ? predictedCount / available.length : 0

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setCurrentIndex(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setCurrentIndex(i => Math.min(available.length - 1, i + 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, available.length])

  const handleSave = useCallback((prediction: Prediction) => {
    const newMap = new Map(predMap).set(prediction.match_id, prediction)
    setPredMap(newMap)
    onSave(prediction)

    setTimeout(() => {
      const nextIdx = available.findIndex((m, i) => i > currentIndex && !newMap.has(m.id))
      if (nextIdx !== -1) setCurrentIndex(nextIdx)
    }, 900)
  }, [predMap, onSave, available, currentIndex])

  if (available.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full sm:max-w-sm mx-auto bg-[#0f172a] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl p-8 text-center">
          <p className="text-gray-400 text-sm mb-4">Nenhum jogo disponível para palpite.</p>
          <button onClick={onClose} className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-medium text-sm">
            Fechar
          </button>
        </div>
      </div>
    )
  }

  if (!currentMatch) return null

  const matchLabel = getGroupLabel(currentMatch.group_name) || getStageLabel(currentMatch.stage)
  const dots = available.slice(
    Math.max(0, currentIndex - 4),
    Math.min(available.length, currentIndex + 5)
  )
  const dotsOffset = Math.max(0, currentIndex - 4)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-sm mx-auto">
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        <div className="bg-[#0f172a] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

          {/* Progress bar */}
          <div className="h-1 bg-white/5">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-xs text-gray-400">
              {predictedCount} <span className="text-gray-600">de</span> {available.length} palpitados
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Match context */}
          <div className="px-4 pb-2 flex items-center justify-between text-[11px] text-gray-600">
            <span>{matchLabel}</span>
            <span>{formatMatchDate(currentMatch.match_date)}</span>
          </div>

          {/* Navigation + form */}
          <div className="flex items-stretch">
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="flex items-center justify-center w-10 shrink-0 text-gray-600 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              aria-label="Jogo anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 px-1 py-2">
              <PredictionForm
                key={currentMatch.id}
                match={currentMatch}
                existingPrediction={predMap.get(currentMatch.id)}
                onSave={handleSave}
                deadlineHours={deadlineHours}
                compact
              />
            </div>

            <button
              onClick={() => setCurrentIndex(i => Math.min(available.length - 1, i + 1))}
              disabled={currentIndex === available.length - 1}
              className="flex items-center justify-center w-10 shrink-0 text-gray-600 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              aria-label="Próximo jogo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-1.5 py-3 border-t border-white/5">
            {dots.map((m, i) => {
              const idx = dotsOffset + i
              return (
                <button
                  key={m.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    'rounded-full transition-all duration-200',
                    idx === currentIndex
                      ? 'w-4 h-2 bg-emerald-400'
                      : predMap.has(m.id)
                        ? 'w-2 h-2 bg-emerald-600/60'
                        : 'w-2 h-2 bg-white/15 hover:bg-white/30'
                  )}
                />
              )
            })}
            {available.length > 9 && (
              <span className="text-[10px] text-gray-600 ml-0.5">
                {currentIndex + 1}/{available.length}
              </span>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
