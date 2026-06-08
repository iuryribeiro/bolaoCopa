'use client'

import { useState, useEffect, useMemo } from 'react'
import { MatchCard } from '@/components/matches/MatchCard'
import { LoadingSpinner } from '@/components/ui/Loading'
import { Calendar, Search, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn, getStageLabel, getGroupLabel } from '@/lib/utils'
import { translateTeamName } from '@/lib/team-names'
import type { Match, Prediction } from '@/types'

const STAGES = [
  { value: '',               label: 'Todos' },
  { value: 'Group Stage',    label: 'Grupos' },
  { value: 'Round of 32',    label: 'Rodada de 32' },
  { value: 'Round of 16',    label: 'Oitavas' },
  { value: 'Quarter-finals', label: 'Quartas' },
  { value: 'Semi-finals',    label: 'Semis' },
  { value: 'Final',          label: 'Final' },
]

const STATUS_FILTERS = [
  { value: '',         label: 'Todos' },
  { value: 'upcoming', label: 'Próximos' },
  { value: 'live',     label: 'Ao Vivo' },
  { value: 'finished', label: 'Encerrados' },
]

// Order knockout stages correctly
const KNOCKOUT_STAGE_ORDER = [
  'Round of 32',
  'Round of 16',
  'Quarter-finals',
  'Semi-finals',
  '3rd Place Final',
  'Final',
]

// How many sections (groups / knockout stages) per page in the grouped view
const SECTIONS_PER_PAGE = 4
// How many matches per page in the paginated (search/status) view
const MATCHES_PER_PAGE = 12

interface Section {
  key: string
  label: string
  matches: Match[]
}

type PredFilter = '' | 'predicted' | 'unpredicted'

export default function JogosPage() {
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Map<string, Prediction>>(new Map())
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [predFilter, setPredFilter] = useState<PredFilter>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [matchesRes, predsRes] = await Promise.all([
          fetch('/api/football/matches?limit=200'),
          fetch('/api/predictions'),
        ])
        const matchesData = await matchesRes.json()
        const predsData = await predsRes.json()

        setAllMatches(matchesData.matches || [])
        const predMap = new Map<string, Prediction>(
          (predsData.predictions || []).map((p: Prediction) => [p.match_id, p] as [string, Prediction])
        )
        setPredictions(predMap)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => { setPage(1) }, [stage, statusFilter, predFilter, search])

  const filtered = useMemo(() => {
    const now = new Date()
    return allMatches.filter(match => {
      if (stage && match.stage !== stage) return false

      if (statusFilter === 'live') {
        if (!['1H', 'HT', '2H', 'ET', 'P', 'BT'].includes(match.status)) return false
      } else if (statusFilter === 'finished') {
        if (!['FT', 'AET', 'PEN', 'AWD'].includes(match.status)) return false
      } else if (statusFilter === 'upcoming') {
        if (match.status !== 'NS') return false
        if (new Date(match.match_date) <= now) return false
      }

      if (predFilter === 'predicted' && !predictions.has(match.id)) return false
      if (predFilter === 'unpredicted' && predictions.has(match.id)) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const home = translateTeamName(match.home_team_name).toLowerCase()
        const away = translateTeamName(match.away_team_name).toLowerCase()
        if (!home.includes(q) && !away.includes(q) &&
            !match.home_team_name.toLowerCase().includes(q) &&
            !match.away_team_name.toLowerCase().includes(q)) return false
      }

      return true
    })
  }, [allMatches, stage, statusFilter, predFilter, search, predictions])

  // Build sections for the grouped view
  const sections = useMemo<Section[]>(() => {
    // In search/status mode we skip grouping
    if (search.trim() || statusFilter) return []

    const result: Section[] = []

    // --- Group Stage: one section per group ---
    const groupNames = [...new Set(
      filtered
        .filter(m => m.stage === 'Group Stage' && m.group_name)
        .map(m => m.group_name!)
    )].sort()

    for (const gn of groupNames) {
      result.push({
        key: `group-${gn}`,
        label: getGroupLabel(gn),
        matches: filtered
          .filter(m => m.stage === 'Group Stage' && m.group_name === gn)
          .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()),
      })
    }

    // Group Stage matches with no group_name
    const ungroupedGroupStage = filtered.filter(m => m.stage === 'Group Stage' && !m.group_name)
    if (ungroupedGroupStage.length > 0) {
      result.push({
        key: 'group-stage-misc',
        label: 'Fase de Grupos',
        matches: ungroupedGroupStage.sort((a, b) =>
          new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
        ),
      })
    }

    // --- Knockout stages in correct order ---
    for (const ks of KNOCKOUT_STAGE_ORDER) {
      const ksMatches = filtered.filter(m => m.stage === ks)
      if (ksMatches.length > 0) {
        result.push({
          key: ks,
          label: getStageLabel(ks),
          matches: ksMatches.sort((a, b) =>
            new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
          ),
        })
      }
    }

    return result
  }, [filtered, search, statusFilter])

  // Pagination for grouped view (paginate sections)
  const usePaginatedList = !!search.trim() || !!statusFilter
  const totalSectionPages = !usePaginatedList ? Math.ceil(sections.length / SECTIONS_PER_PAGE) : 1
  const pagedSections = !usePaginatedList
    ? sections.slice((page - 1) * SECTIONS_PER_PAGE, page * SECTIONS_PER_PAGE)
    : []

  // Pagination for flat list view (search/status)
  const totalMatchPages = usePaginatedList ? Math.ceil(filtered.length / MATCHES_PER_PAGE) : 1
  const pagedMatches = usePaginatedList
    ? filtered.slice((page - 1) * MATCHES_PER_PAGE, page * MATCHES_PER_PAGE)
    : []

  const totalPages = usePaginatedList ? totalMatchPages : totalSectionPages
  const hasActiveFilters = stage || statusFilter || predFilter || search.trim()

  function PaginationBar() {
    if (totalPages <= 1) return null
    return (
      <div className="flex items-center justify-center gap-2 pt-2">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | '...')[]>((acc, p, idx, arr) => {
            if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...')
            acc.push(p)
            return acc
          }, [])
          .map((p, i) =>
            p === '...' ? (
              <span key={`dots-${i}`} className="text-gray-500 px-1">…</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                className={cn(
                  'w-9 h-9 rounded-lg text-sm font-medium transition-all border',
                  page === p
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-white/5 text-gray-400 hover:text-white border-white/10'
                )}
              >
                {p}
              </button>
            )
          )}

        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {usePaginatedList && (
          <span className="text-xs text-gray-500 ml-2">
            {(page - 1) * MATCHES_PER_PAGE + 1}–{Math.min(page * MATCHES_PER_PAGE, filtered.length)} de {filtered.length}
          </span>
        )}
        {!usePaginatedList && (
          <span className="text-xs text-gray-500 ml-2">
            Página {page} de {totalPages}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Calendar className="w-6 h-6 text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Jogos</h1>
          {!loading && (
            <p className="text-xs text-gray-500 mt-0.5">
              {filtered.length} de {allMatches.length} jogos
            </p>
          )}
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por time (ex: Brasil, Argentina...)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filtros de status */}
      <div className="relative">
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-[#060a0f] to-transparent" />
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide pr-6">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
              statusFilter === f.value
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
            )}
          >
            {f.label}
            {f.value === 'live' && allMatches.some(m => ['1H','HT','2H','ET','P','BT'].includes(m.status)) && (
              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
            )}
          </button>
        ))}
      </div>

      </div>

      {/* Filtro de palpites */}
      {!loading && (
        <div className="flex gap-2">
          {(
            [
              { value: '' as PredFilter,           label: 'Todos',       count: allMatches.length },
              { value: 'predicted' as PredFilter,   label: 'Palpitados',  count: allMatches.filter(m => predictions.has(m.id)).length },
              { value: 'unpredicted' as PredFilter, label: 'Sem palpite', count: allMatches.filter(m => !predictions.has(m.id)).length },
            ] as const
          ).map(f => (
            <button
              key={f.value}
              onClick={() => setPredFilter(f.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border',
                predFilter === f.value
                  ? f.value === 'predicted'
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : f.value === 'unpredicted'
                      ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-white/5 text-gray-400 hover:text-white border-white/10'
              )}
            >
              {f.label}
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full',
                predFilter === f.value ? 'bg-white/20' : 'bg-white/10 text-gray-500'
              )}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Filtros de fase */}
      <div className="relative">
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-[#060a0f] to-transparent" />
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide pr-6">
        {STAGES.map(s => (
          <button
            key={s.value}
            onClick={() => setStage(s.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
              stage === s.value
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">
            {hasActiveFilters ? 'Nenhum jogo encontrado com esses filtros' : 'Nenhum jogo ainda'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => { setStage(''); setStatusFilter(''); setPredFilter(''); setSearch('') }}
              className="mt-3 text-sm text-emerald-400 hover:text-emerald-300"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : usePaginatedList ? (
        /* Vista paginada: busca ou filtro de status ativo */
        <div className="space-y-5">
          <div className="space-y-3">
            {pagedMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predictions.get(match.id)}
              />
            ))}
          </div>
          <PaginationBar />
        </div>
      ) : (
        /* Vista agrupada: por grupo (Grupo A, B...) e depois por fase mata-mata */
        <div className="space-y-8">
          {pagedSections.map(section => (
            <section key={section.key}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-white/10" />
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 whitespace-nowrap">
                  {section.label}
                  <span className="ml-2 text-gray-600 font-normal normal-case tracking-normal">
                    {section.matches.length} {section.matches.length === 1 ? 'jogo' : 'jogos'}
                  </span>
                </h2>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <div className="space-y-3">
                {section.matches.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={predictions.get(match.id)}
                  />
                ))}
              </div>
            </section>
          ))}
          <PaginationBar />
        </div>
      )}
    </div>
  )
}
