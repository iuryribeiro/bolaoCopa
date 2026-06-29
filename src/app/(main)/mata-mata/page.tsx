'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { GitBranch, Trophy, Lock, Info, Check, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'
import { translateTeamName } from '@/lib/team-names'
import type { Match, Stage } from '@/types'

// =============================================================================
// BRACKET — idêntico à imagem de referência
// =============================================================================
//
//  LADO ESQUERDO (J1–J8)          CENTRO         LADO DIREITO (J9–J16)
//  J1 ─┐                                               ┌─ J9
//       O1 ─┐                                     ┌─ O5
//  J2 ─┘    │                                     │    └─ J10
//            Q1 ─┐                           ┌─ Q3
//  J3 ─┐    │    │                           │    │
//       O2 ─┘    │                           │    └─ O6 ─┐
//  J4 ─┘         S1 ──── FINAL ──── S2       │           ├─ J11
//                │                      │    └─ Q4        └─ J12
//  J5 ─┐         │                      │    │
//       O3 ─┐    Q2 ─┘             └─ Q4    └─ O7 ─┐
//  J6 ─┘    │                                        ├─ J13
//            O4                           O8 ─┐     └─ J14
//  J7 ─┐    │                                  └─ J15
//       O4 ─┘                                  └─ J16
//  J8 ─┘
//
// Fluxo sequencial (igual à imagem):
//   J1+J2→O1  J3+J4→O2  O1+O2→Q1  J5+J6→O3  J7+J8→O4  O3+O4→Q2  Q1+Q2→S1
//   J9+J10→O5  J11+J12→O6  O5+O6→Q3  J13+J14→O7  J15+J16→O8  O7+O8→Q4  Q3+Q4→S2
//   S1+S2 → Final   perdedores → 3º Lugar
//
// =============================================================================

const OITAVAS_PAIRS: [number, number][] = [
  [0,  1],  // O1 = J1  × J2
  [2,  3],  // O2 = J3  × J4
  [4,  5],  // O3 = J5  × J6
  [6,  7],  // O4 = J7  × J8
  [8,  9],  // O5 = J9  × J10
  [10, 11], // O6 = J11 × J12
  [12, 13], // O7 = J13 × J14
  [14, 15], // O8 = J15 × J16
]
const QUARTAS_PAIRS: [number, number][] = [
  [0, 1], // Q1 = O1 × O2
  [2, 3], // Q2 = O3 × O4
  [4, 5], // Q3 = O5 × O6
  [6, 7], // Q4 = O7 × O8
]
const SEMIS_PAIRS: [number, number][] = [
  [0, 1], // S1 = Q1 × Q2
  [2, 3], // S2 = Q3 × Q4
]
const FINAL_PAIRS: [number, number][] = [[0, 1]]

const KNOCKOUT_STAGES: Stage[] = [
  'Round of 32', 'Round of 16', 'Quarter-finals',
  'Semi-finals', '3rd Place Final', 'Final',
]

const R32_LABELS  = ['J1','J2','J3','J4','J5','J6','J7','J8','J9','J10','J11','J12','J13','J14','J15','J16']
const R16_LABELS  = ['O1','O2','O3','O4','O5','O6','O7','O8']
const QF_LABELS   = ['Q1','Q2','Q3','Q4']
const SF_LABELS   = ['S1','S2']

// =============================================================================

interface TeamOption { id: number; name: string; logo: string | null }
interface BracketSlot {
  ref: string; stage: Stage; label: string
  home: TeamOption | null; away: TeamOption | null
  match_date?: string  // undefined para slots virtuais
  match_status?: string
}

function isSlotLocked(slot: BracketSlot, globalLocked: boolean): boolean {
  return globalLocked
}

function isReal(t: TeamOption | null | undefined): t is TeamOption { return !!t && t.id > 0 }

function teamOf(m: Match, side: 'home' | 'away'): TeamOption {
  return side === 'home'
    ? { id: m.home_team_id, name: translateTeamName(m.home_team_name), logo: m.home_team_logo }
    : { id: m.away_team_id, name: translateTeamName(m.away_team_name), logo: m.away_team_logo }
}

function sortByFixtureId(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => a.api_fixture_id - b.api_fixture_id)
}

function sortByDate(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
}

function fromActual(matches: Match[], stage: Stage, labels: string[]): BracketSlot[] {
  // R32 usa api_fixture_id (ordem oficial do bracket FIFA); demais fases usam data
  const sorted = stage === 'Round of 32' ? sortByFixtureId(matches) : sortByDate(matches)
  return sorted.map((m, i) => ({
    ref: m.id, stage, label: labels[i] ?? `#${i+1}`,
    home: teamOf(m, 'home'), away: teamOf(m, 'away'),
    match_date: m.match_date,
    match_status: m.status,
  }))
}

function fromPicks(
  stage: Stage,
  pairs: [number, number][],
  prev: BracketSlot[],
  picks: Map<string, TeamOption>,
  labels: string[],
): BracketSlot[] {
  return pairs.map(([i, j], idx) => ({
    ref: `virtual-${stage}-${idx}`, stage, label: labels[idx] ?? `#${idx+1}`,
    home: prev[i] ? (picks.get(prev[i].ref) ?? null) : null,
    away: prev[j] ? (picks.get(prev[j].ref) ?? null) : null,
  }))
}

function buildBracket(actualMatches: Match[], picks: Map<string, TeamOption>): Record<Stage, BracketSlot[]> {
  const real = (s: Stage) => actualMatches.filter(m => m.stage === s)

  const r32: BracketSlot[] = real('Round of 32').length > 0
    ? fromActual(real('Round of 32'), 'Round of 32', R32_LABELS)
    : []

  const r16: BracketSlot[] = real('Round of 16').length > 0
    ? fromActual(real('Round of 16'), 'Round of 16', R16_LABELS)
    : r32.length > 0 ? fromPicks('Round of 16', OITAVAS_PAIRS, r32, picks, R16_LABELS) : []

  const qf: BracketSlot[] = real('Quarter-finals').length > 0
    ? fromActual(real('Quarter-finals'), 'Quarter-finals', QF_LABELS)
    : r16.length > 0 ? fromPicks('Quarter-finals', QUARTAS_PAIRS, r16, picks, QF_LABELS) : []

  const sf: BracketSlot[] = real('Semi-finals').length > 0
    ? fromActual(real('Semi-finals'), 'Semi-finals', SF_LABELS)
    : qf.length > 0 ? fromPicks('Semi-finals', SEMIS_PAIRS, qf, picks, SF_LABELS) : []

  const third: BracketSlot[] = real('3rd Place Final').length > 0
    ? fromActual(real('3rd Place Final'), '3rd Place Final', ['3º'])
    : sf.length >= 2 ? [(() => {
        const p0 = picks.get(sf[0].ref), p1 = picks.get(sf[1].ref)
        return {
          ref: 'virtual-3rd-0', stage: '3rd Place Final' as Stage, label: '3º Lugar',
          home: p0 ? (p0.id === sf[0].home?.id ? sf[0].away : sf[0].home) : null,
          away: p1 ? (p1.id === sf[1].home?.id ? sf[1].away : sf[1].home) : null,
        }
      })()] : []

  const fin: BracketSlot[] = real('Final').length > 0
    ? fromActual(real('Final'), 'Final', ['Final'])
    : sf.length > 0 ? fromPicks('Final', FINAL_PAIRS, sf, picks, ['Final']) : []

  return {
    'Round of 32': r32, 'Round of 16': r16, 'Quarter-finals': qf,
    'Semi-finals': sf, '3rd Place Final': third, 'Final': fin, 'Group Stage': [],
  }
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function MataMataPage() {
  const [actualMatches, setActualMatches] = useState<Match[]>([])
  const [loading, setLoading]             = useState(true)
  const [locked, setLocked]               = useState(false)
  const [picks, setPicks]                 = useState<Map<string, TeamOption>>(new Map())
  const [savingRef, setSavingRef]         = useState<string | null>(null)
  const [championPred, setChampionPred]   = useState<TeamOption | null>(null)
  const [savingChampion, setSavingChampion] = useState(false)

  const bracket = useMemo(() => buildBracket(actualMatches, picks), [actualMatches, picks])

  useEffect(() => {
    ;(async () => {
      try {
        const [mRes, pRes, cRes, sRes] = await Promise.all([
          fetch('/api/football/matches?limit=200'),
          fetch('/api/knockout-predictions'),
          fetch('/api/champion-prediction'),
          fetch('/api/competition-settings'),
        ])
        const [mData, pData, cData, sData] = await Promise.all([
          mRes.json(), pRes.json(), cRes.json(), sRes.json(),
        ])

        setActualMatches((mData.matches || []).filter((m: Match) => KNOCKOUT_STAGES.includes(m.stage)))
        setLocked(sData.settings?.knockout_prediction_locked || false)

        const map = new Map<string, TeamOption>()
        ;(pData.predictions || []).forEach((p: {
          match_reference: string; predicted_team_id: number
          predicted_team_name: string; predicted_team_logo: string | null
        }) => {
          map.set(p.match_reference, { id: p.predicted_team_id, name: p.predicted_team_name, logo: p.predicted_team_logo })
        })
        setPicks(map)

        if (cData.prediction) {
          setChampionPred({ id: cData.prediction.champion_team_id, name: cData.prediction.champion_team_name, logo: cData.prediction.champion_team_logo })
        }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    })()
  }, [])

  const handlePick = async (slot: BracketSlot, team: TeamOption) => {
    if (locked || !isReal(team)) return
    const prev = picks.get(slot.ref)
    setPicks(cur => new Map(cur).set(slot.ref, team))
    setSavingRef(slot.ref)
    try {
      const res = await fetch('/api/knockout-predictions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictions: [{ stage: slot.stage, match_reference: slot.ref, predicted_team_id: team.id, predicted_team_name: team.name, predicted_team_logo: team.logo }] }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setPicks(cur => { const n = new Map(cur); if (prev) n.set(slot.ref, prev); else n.delete(slot.ref); return n })
    } finally { setSavingRef(null) }
  }

  const handleChampion = async (team: TeamOption) => {
    if (!isReal(team)) return
    setSavingChampion(true)
    try {
      await fetch('/api/champion-prediction', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ champion_team_id: team.id, champion_team_name: team.name, champion_team_logo: team.logo }) })
      setChampionPred(team)
    } finally { setSavingChampion(false) }
  }

  const r32 = bracket['Round of 32'] ?? []
  const r16 = bracket['Round of 16'] ?? []
  const qf  = bracket['Quarter-finals'] ?? []
  const sf  = bracket['Semi-finals'] ?? []
  const fin = bracket['Final'] ?? []
  const trd = bracket['3rd Place Final'] ?? []

  const allTeams = Array.from(
    new Map(r32.flatMap(s => [s.home, s.away]).filter(isReal).map(t => [t.id, t])).values()
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <GitBranch className="w-6 h-6 text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Mata-mata</h1>
          <p className="text-sm text-gray-400">Simule o bracket até a final</p>
        </div>
        {locked && <Lock className="w-4 h-4 text-red-400 ml-auto" />}
      </div>

      {locked ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm p-3 bg-white/5 rounded-lg border border-white/10">
          <Lock className="w-4 h-4" /> Previsões bloqueadas
        </div>
      ) : (
        <div className="flex items-center gap-2 text-purple-400 text-sm p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <Info className="w-4 h-4 shrink-0" /> Toque no time para avançá-lo à próxima fase.
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : r32.length === 0 ? (
        <div className="text-center py-12">
          <GitBranch className="w-10 h-10 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">Mata-mata ainda não disponível</p>
          <p className="text-gray-600 text-sm mt-1">Disponível após a fase de grupos</p>
        </div>
      ) : (
        <>
          <BracketView
            r32={r32} r16={r16} qf={qf} sf={sf} fin={fin} trd={trd}
            picks={picks} locked={locked} savingRef={savingRef} onPick={handlePick}
          />

          <div className="space-y-2 mt-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Campeão</h2>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-semibold text-white">Campeão da Copa do Mundo 2026</span>
                  <Badge variant="yellow">+10 pts</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {championPred ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {championPred.logo && <Image src={championPred.logo} alt={championPred.name} width={40} height={40} className="object-contain" />}
                      <div>
                        <p className="text-white font-semibold">{translateTeamName(championPred.name)}</p>
                        <p className="text-xs text-gray-400">Sua escolha de campeão</p>
                      </div>
                    </div>
                    {!locked && <Button variant="ghost" size="sm" onClick={() => setChampionPred(null)}>Alterar</Button>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-400 text-sm">{locked ? 'Prazo encerrado' : 'Escolha o campeão:'}</p>
                    {!locked && allTeams.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {allTeams.map(team => (
                          <button key={team.id} onClick={() => handleChampion(team)} disabled={savingChampion}
                            className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left">
                            {team.logo && <Image src={team.logo} alt={team.name} width={24} height={24} className="object-contain shrink-0" />}
                            <span className="text-xs text-gray-300 truncate">{team.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================================
// BRACKET VISUAL — 9 colunas, dois lados convergindo para o centro
// =============================================================================

function BracketView({
  r32, r16, qf, sf, fin, trd, picks, locked, savingRef, onPick,
}: {
  r32: BracketSlot[]; r16: BracketSlot[]; qf: BracketSlot[]; sf: BracketSlot[]
  fin: BracketSlot[]; trd: BracketSlot[]
  picks: Map<string, TeamOption>; locked: boolean; savingRef: string | null
  onPick: (slot: BracketSlot, team: TeamOption) => void
}) {
  const leftR32  = r32.slice(0, 8)
  const rightR32 = r32.slice(8, 16)
  const leftR16  = r16.slice(0, 4)
  const rightR16 = r16.slice(4, 8)
  const leftQF   = qf.slice(0, 2)
  const rightQF  = qf.slice(2, 4)
  const s1       = sf[0] ?? null
  const s2       = sf[1] ?? null
  const final    = fin[0] ?? null
  const terceiro = trd[0] ?? null

  const H = 544

  const col = (slots: (BracketSlot | undefined)[], w: number, justify: 'around' | 'center' = 'around') => (
    <div className={`flex flex-col justify-${justify} shrink-0`} style={{ width: w, height: H }}>
      {slots.map((s, i) =>
        s ? <MatchCard key={s.ref} slot={s} pick={picks.get(s.ref)} locked={locked} saving={savingRef === s.ref} onPick={onPick} />
          : <EmptyCard key={i} />
      )}
    </div>
  )

  return (
    <div className="space-y-1">
      <div className="flex gap-1 overflow-x-auto">
        {[
          { label: '32 avos', w: 90 },
          { label: 'Oitavas', w: 90 },
          { label: 'Quartas', w: 90 },
          { label: 'Semi',    w: 90 },
          { label: '⚽ Final', w: 110, gold: true },
          { label: 'Semi',    w: 90 },
          { label: 'Quartas', w: 90 },
          { label: 'Oitavas', w: 90 },
          { label: '32 avos', w: 90 },
        ].map((c, i) => (
          <div key={i} style={{ width: c.w }}
            className={cn('shrink-0 text-center text-[9px] font-semibold uppercase tracking-wider py-0.5',
              c.gold ? 'text-yellow-400' : 'text-gray-500')}>
            {c.label}
          </div>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2" style={{ height: H }}>
        {col(leftR32,  90)}
        {col(leftR16,  90)}
        {col(leftQF,   90)}
        {col([s1],     90, 'center')}

        {/* Centro */}
        <div className="flex flex-col justify-center items-center gap-4 shrink-0" style={{ width: 110, height: H }}>
          <div className="w-full">
            <p className="text-[9px] font-bold text-yellow-400 uppercase flex items-center justify-center gap-1 mb-1">
              <Trophy className="w-3 h-3" /> Final
            </p>
            {final
              ? <MatchCard slot={final} pick={picks.get(final.ref)} locked={locked} saving={savingRef === final.ref} onPick={onPick} />
              : <EmptyCard />}
          </div>
          {terceiro && (
            <div className="w-full">
              <p className="text-[9px] text-gray-500 uppercase text-center mb-1">3º Lugar</p>
              <MatchCard slot={terceiro} pick={picks.get(terceiro.ref)} locked={locked} saving={savingRef === terceiro.ref} onPick={onPick} />
            </div>
          )}
        </div>

        {col([s2],     90, 'center')}
        {col(rightQF,  90)}
        {col(rightR16, 90)}
        {col(rightR32, 90)}
      </div>
    </div>
  )
}

// =============================================================================
// CARDS
// =============================================================================

function MatchCard({ slot, pick, locked, saving, onPick }: {
  slot: BracketSlot; pick: TeamOption | undefined
  locked: boolean; saving: boolean
  onPick: (slot: BracketSlot, team: TeamOption) => void
}) {
  const slotLocked = isSlotLocked(slot, locked)
  const canPick = !slotLocked && isReal(slot.home) && isReal(slot.away)

  return (
    <div className="rounded border border-white/10 overflow-hidden bg-gray-900 w-full">
      <div className="px-1 py-0.5 text-[7px] font-bold text-gray-600 uppercase tracking-wider border-b border-white/5 leading-none">
        {slot.label}
      </div>
      {([slot.home, slot.away] as const).map((team, i) => {
        const real   = isReal(team)
        const picked = real && pick?.id === team.id
        return (
          <button key={i} disabled={!canPick || !real}
            onClick={() => real && team && onPick(slot, team)}
            className={cn(
              'w-full flex items-center gap-1 px-1 py-1 text-left transition-all',
              i === 1 && 'border-t border-white/5',
              picked ? 'bg-emerald-500/25 text-emerald-300' : 'text-gray-300',
              canPick && real ? 'hover:bg-white/10 cursor-pointer' : 'cursor-default',
            )}>
            {real && team.logo
              ? <Image src={team.logo} alt={team.name} width={12} height={12} className="object-contain shrink-0" />
              : <div className="w-3 h-3 rounded-sm bg-white/10 shrink-0" />}
            <span className="text-[9px] truncate leading-tight flex-1 min-w-0">
              {team ? team.name : 'A definir'}
            </span>
            {picked && !saving && <Check className="w-2 h-2 shrink-0 text-emerald-400" />}
            {picked &&  saving && <Loader2 className="w-2 h-2 shrink-0 animate-spin" />}
          </button>
        )
      })}
    </div>
  )
}

function EmptyCard() {
  return (
    <div className="rounded border border-white/5 bg-white/[0.02] w-full flex items-center justify-center" style={{ height: 56 }}>
      <span className="text-[8px] text-gray-700">—</span>
    </div>
  )
}
