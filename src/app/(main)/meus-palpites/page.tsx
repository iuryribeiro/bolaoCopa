'use client'

import { useState, useEffect } from 'react'
import { MatchCard } from '@/components/matches/MatchCard'
import { LoadingSpinner } from '@/components/ui/Loading'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Star, CheckCircle, XCircle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Prediction, Match } from '@/types'

type Filter = 'all' | 'pending' | 'exact' | 'winner' | 'wrong'

export default function MeusPalpitesPage() {
  const [predictions, setPredictions] = useState<(Prediction & { match: Match })[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    fetch('/api/predictions')
      .then(r => r.json())
      .then(data => {
        setPredictions(data.predictions || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const stats = {
    total: predictions.length,
    calculated: predictions.filter(p => p.calculated_at).length,
    exact: predictions.filter(p => p.exact_score).length,
    winner: predictions.filter(p => p.correct_winner && !p.exact_score).length,
    wrong: predictions.filter(p => p.calculated_at && !p.correct_winner).length,
    pending: predictions.filter(p => !p.calculated_at).length,
    totalPoints: predictions.reduce((sum, p) => sum + (p.points || 0), 0),
  }

  const filtered = predictions.filter(p => {
    if (filter === 'pending') return !p.calculated_at
    if (filter === 'exact') return p.exact_score
    if (filter === 'winner') return p.correct_winner && !p.exact_score
    if (filter === 'wrong') return p.calculated_at && !p.correct_winner
    return true
  })

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: 'all', label: 'Todos', count: stats.total },
    { value: 'pending', label: 'Pendentes', count: stats.pending },
    { value: 'exact', label: 'Exatos', count: stats.exact },
    { value: 'winner', label: 'Vencedor', count: stats.winner },
    { value: 'wrong', label: 'Errados', count: stats.wrong },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Star className="w-6 h-6 text-yellow-400" />
        <h1 className="text-2xl font-bold text-white">Meus Palpites</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-3 text-center">
          <div className="text-xl font-bold text-emerald-400">{stats.totalPoints}</div>
          <div className="text-xs text-gray-500 mt-0.5">Pontos</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-bold text-green-400">{stats.exact}</div>
          <div className="text-xs text-gray-500 mt-0.5">Exatos</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-bold text-yellow-400">{stats.winner}</div>
          <div className="text-xs text-gray-500 mt-0.5">Vencedor</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="relative">
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-[#060a0f] to-transparent" />
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide pr-6">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
              filter === f.value
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
            )}
          >
            {f.label}
            <Badge variant="gray">{f.count}</Badge>
          </button>
        ))}
      </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Star className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">Nenhum palpite aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(pred => (
            <MatchCard
              key={pred.id}
              match={pred.match}
              prediction={pred}
              showPrediction
            />
          ))}
        </div>
      )}
    </div>
  )
}
