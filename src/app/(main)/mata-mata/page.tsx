'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { GitBranch, Trophy, Lock, Info, Check, Loader2, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/Loading'
import { Avatar } from '@/components/ui/Avatar'
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
  match_date?: string
  match_status?: string
  winner_team_id?: number | null  // definido apenas para slots com jogo real encerrado
}

function isSlotLocked(slot: BracketSlot, globalLocked: boolean): boolean {
  if (globalLocked) return true
  if (!slot.match_date) return false  // slot virtual — sem prazo fixo
  // Jogo já iniciado ou encerrado: mantém aberto (feature lançada com atraso)
  const STARTED = ['FT','AET','PEN','AWD','WO','1H','HT','2H','ET','P','BT','LIVE']
  if (slot.match_status && STARTED.includes(slot.match_status)) return false
  // Jogo futuro: bloqueia quando faltam 10 min ou menos
  const deadline = new Date(new Date(slot.match_date).getTime() - 10 * 60 * 1000)
  return new Date() > deadline
}

function isReal(t: TeamOption | null | undefined): t is TeamOption { return !!t && t.id > 0 }

// Valida se um pick ainda é compatível com o slot onde ele deve jogar.
// Se ambos os times do slot são conhecidos mas o pick não é nenhum deles, o pick está
// obsoleto (bracket mudou) e deve ser ignorado para não propagar o time errado.
// Se qualquer time do slot ainda é TBD (null), não valida — não há dados suficientes.
function validatedPick(pick: TeamOption | null | undefined, slot: BracketSlot): TeamOption | null {
  if (!pick) return null
  if (isReal(slot.home) && isReal(slot.away)) {
    if (slot.home.id !== pick.id && slot.away.id !== pick.id) return null
  }
  return pick
}

function teamOf(m: Match, side: 'home' | 'away'): TeamOption {
  return side === 'home'
    ? { id: m.home_team_id, name: translateTeamName(m.home_team_name), logo: m.home_team_logo }
    : { id: m.away_team_id, name: translateTeamName(m.away_team_name), logo: m.away_team_logo }
}

function sortByFixtureId(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => a.api_fixture_id - b.api_fixture_id)
}

// Ordena matches reais de acordo com a posição correta no bracket, usando os times
// vencedores do estágio anterior para identificar qual jogo vai para qual slot.
// Isso evita dependência na ordem do fixture_id da API (que pode não seguir o bracket).
function sortByBracket(
  matches: Match[],
  prevSlots: BracketSlot[],
  pairs: [number, number][],
): Match[] {
  const result: Array<Match | null> = new Array(pairs.length).fill(null)
  const used = new Set<string>()

  for (let idx = 0; idx < pairs.length; idx++) {
    const [i, j] = pairs[idx]
    const wI = prevSlots[i]?.winner_team_id
    const wJ = prevSlots[j]?.winner_team_id
    if (!wI || !wJ) continue

    const found = matches.find(
      m => !used.has(m.id) &&
        ((m.home_team_id === wI && m.away_team_id === wJ) ||
         (m.home_team_id === wJ && m.away_team_id === wI))
    )
    if (found) { result[idx] = found; used.add(found.id) }
  }

  // Slots sem match identificado: preenche pelo fixture_id
  const remaining = sortByFixtureId(matches.filter(m => !used.has(m.id)))
  let ri = 0
  for (let i = 0; i < result.length; i++) {
    if (!result[i] && ri < remaining.length) result[i] = remaining[ri++]
  }
  return result.filter(Boolean) as Match[]
}

function toSlots(matches: Match[], stage: Stage, labels: string[]): BracketSlot[] {
  return matches.map((m, i) => ({
    ref: m.id, stage, label: labels[i] ?? `#${i+1}`,
    home: teamOf(m, 'home'), away: teamOf(m, 'away'),
    match_date: m.match_date,
    match_status: m.status,
    winner_team_id: m.winner_team_id,
  }))
}

function fromActual(matches: Match[], stage: Stage, labels: string[]): BracketSlot[] {
  return toSlots(sortByFixtureId(matches), stage, labels)
}

function fromActualBracket(
  matches: Match[], stage: Stage, labels: string[],
  prevSlots: BracketSlot[], pairs: [number, number][],
): BracketSlot[] {
  return toSlots(sortByBracket(matches, prevSlots, pairs), stage, labels)
}

function fromPicks(
  stage: Stage,
  pairs: [number, number][],
  prev: BracketSlot[],
  picks: Map<string, TeamOption>,
  labels: string[],
  prevStage?: Stage,   // estágio anterior — usado para buscar picks pelo ref virtual antigo
): BracketSlot[] {
  // Dado um slot do estágio anterior e seu índice, retorna o time que avança.
  // Prioridade: (1) vencedor real, (2) pick pelo ref atual, (3) pick pelo ref virtual antigo.
  // O fallback virtual é necessário quando o estágio anterior virou fromActual (UUID refs)
  // mas os picks ainda estão salvos com os refs virtuais originais.
  const advance = (slot: BracketSlot | undefined, slotIdx: number): TeamOption | null => {
    if (!slot) return null
    if (slot.winner_team_id) {
      return (slot.home?.id === slot.winner_team_id ? slot.home : slot.away) ?? null
    }
    const byRef = picks.get(slot.ref)
    if (byRef) return byRef
    if (prevStage && !slot.ref.startsWith('virtual-')) {
      return picks.get(`virtual-${prevStage}-${slotIdx}`) ?? null
    }
    return null
  }
  return pairs.map(([i, j], idx) => ({
    ref: `virtual-${stage}-${idx}`, stage, label: labels[idx] ?? `#${idx+1}`,
    home: advance(prev[i], i),
    away: advance(prev[j], j),
  }))
}

function buildBracket(actualMatches: Match[], picks: Map<string, TeamOption>): Record<Stage, BracketSlot[]> {
  const real = (s: Stage) => actualMatches.filter(m => m.stage === s)

  // Só usa fromActual quando o estágio tem TODOS os jogos esperados com times reais.
  // Evita que 3 jogos de oitavas já cadastrados ativem fromActual prematuramente.
  const EXPECTED: Partial<Record<Stage, number>> = {
    'Round of 32': 16, 'Round of 16': 8, 'Quarter-finals': 4,
    'Semi-finals': 2, '3rd Place Final': 1, 'Final': 1,
  }
  const stageReady = (s: Stage) => {
    const exp = EXPECTED[s] ?? 1
    const ms = real(s)
    return ms.length >= exp && ms.every(m => (m.home_team_id || 0) > 0 && (m.away_team_id || 0) > 0)
  }

  const r32: BracketSlot[] = stageReady('Round of 32')
    ? fromActual(real('Round of 32'), 'Round of 32', R32_LABELS)
    : []

  const r16: BracketSlot[] = stageReady('Round of 16')
    ? (r32.length === 16
        ? fromActualBracket(real('Round of 16'), 'Round of 16', R16_LABELS, r32, OITAVAS_PAIRS)
        : fromActual(real('Round of 16'), 'Round of 16', R16_LABELS))
    : r32.length > 0 ? fromPicks('Round of 16', OITAVAS_PAIRS, r32, picks, R16_LABELS, 'Round of 32') : []

  const qf: BracketSlot[] = stageReady('Quarter-finals')
    ? (r16.length === 8
        ? fromActualBracket(real('Quarter-finals'), 'Quarter-finals', QF_LABELS, r16, QUARTAS_PAIRS)
        : fromActual(real('Quarter-finals'), 'Quarter-finals', QF_LABELS))
    : r16.length > 0 ? fromPicks('Quarter-finals', QUARTAS_PAIRS, r16, picks, QF_LABELS, 'Round of 16') : []

  const sf: BracketSlot[] = stageReady('Semi-finals')
    ? (qf.length === 4
        ? fromActualBracket(real('Semi-finals'), 'Semi-finals', SF_LABELS, qf, SEMIS_PAIRS)
        : fromActual(real('Semi-finals'), 'Semi-finals', SF_LABELS))
    : qf.length > 0 ? fromPicks('Semi-finals', SEMIS_PAIRS, qf, picks, SF_LABELS, 'Quarter-finals') : []

  const third: BracketSlot[] = stageReady('3rd Place Final')
    ? fromActual(real('3rd Place Final'), '3rd Place Final', ['3º'])
    : sf.length >= 2 ? [(() => {
        const loser = (slot: BracketSlot): TeamOption | null => {
          if (slot.winner_team_id) {
            return (slot.home?.id === slot.winner_team_id ? slot.away : slot.home) ?? null
          }
          const p = picks.get(slot.ref) ?? null
          if (!p) return null
          return p.id === slot.home?.id ? slot.away : slot.home
        }
        return {
          ref: 'virtual-3rd-0', stage: '3rd Place Final' as Stage, label: '3º Lugar',
          home: loser(sf[0]),
          away: loser(sf[1]),
        }
      })()] : []

  const fin: BracketSlot[] = stageReady('Final')
    ? fromActual(real('Final'), 'Final', ['Final'])
    : sf.length > 0 ? fromPicks('Final', FINAL_PAIRS, sf, picks, ['Final']) : []

  return {
    'Round of 32': r32, 'Round of 16': r16, 'Quarter-finals': qf,
    'Semi-finals': sf, '3rd Place Final': third, 'Final': fin, 'Group Stage': [],
  }
}

// =============================================================================
// TIPOS — GALERA
// =============================================================================

interface GaleraPick {
  stage: string
  match_reference: string
  predicted_team_id: number
  predicted_team_name: string
  predicted_team_logo: string | null
}

interface GaleraParticipant {
  user_id: string
  name: string
  avatar_url: string | null
  picks: GaleraPick[]
}

const STAGE_ORDER: Stage[] = ['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final', '3rd Place Final']
const STAGE_PT: Record<string, string> = {
  'Round of 32':    '32 avos',
  'Round of 16':    'Oitavas',
  'Quarter-finals': 'Quartas',
  'Semi-finals':    'Semifinal',
  'Final':          'Final',
  '3rd Place Final':'3º Lugar',
}

type Tab = 'simular' | 'galera'

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
  const [tab, setTab]                     = useState<Tab>('simular')
  const [participants, setParticipants]   = useState<GaleraParticipant[]>([])
  const [galeraLoading, setGaleraLoading] = useState(false)
  const [galeraLoaded, setGaleraLoaded]   = useState(false)
  const [resetting, setResetting]         = useState(false)

  const { bracket, effectivePicks } = useMemo(() => {
    const b = buildBracket(actualMatches, picks)

    // Quando um estágio vira fromActual, os slots passam a ter refs UUID.
    // Os picks do usuário estão salvos com refs virtuais (virtual-Stage-N).
    // Aqui adicionamos entradas UUID→pick para que o MatchCard encontre o pick
    // mesmo depois da transição virtual → real.
    const ep = new Map(picks)
    const realStages: Stage[] = ['Round of 16', 'Quarter-finals', 'Semi-finals', 'Final']
    for (const stage of realStages) {
      b[stage].forEach((slot, idx) => {
        if (!slot.ref.startsWith('virtual-')) {
          const vPick = picks.get(`virtual-${stage}-${idx}`)
          if (vPick && !ep.has(slot.ref)) ep.set(slot.ref, vPick)
        }
      })
    }
    return { bracket: b, effectivePicks: ep }
  }, [actualMatches, picks])

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

  const loadGalera = async () => {
    if (galeraLoaded) return
    setGaleraLoading(true)
    try {
      const res = await fetch('/api/knockout-predictions/galera')
      const data = await res.json()
      setParticipants(data.participants || [])
      setGaleraLoaded(true)
    } catch (err) { console.error(err) }
    finally { setGaleraLoading(false) }
  }

  const handleTab = (t: Tab) => {
    setTab(t)
    if (t === 'galera') loadGalera()
  }

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

  const handleReset = async () => {
    if (resetting || !confirm('Isso vai apagar seus palpites de oitavas em diante. Os 32avos continuam. Confirma?')) return
    setResetting(true)
    try {
      await fetch('/api/knockout-predictions', { method: 'DELETE' })
      setPicks(cur => {
        const n = new Map(cur)
        for (const key of Array.from(n.keys())) {
          if (key.startsWith('virtual-')) n.delete(key)
        }
        return n
      })
    } finally { setResetting(false) }
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <GitBranch className="w-6 h-6 text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Mata-mata</h1>
          <p className="text-sm text-gray-400">Simule o bracket até a final</p>
        </div>
        {locked && <Lock className="w-4 h-4 text-red-400 ml-auto" />}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { key: 'simular' as Tab, label: 'Meu bracket', icon: GitBranch },
          { key: 'galera'  as Tab, label: `Galera${participants.length > 0 ? ` (${participants.length})` : ''}`, icon: Users },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => handleTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all border',
              tab === key
                ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                : 'bg-white/5 text-gray-400 hover:text-white border-white/10'
            )}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── ABA: MEU BRACKET ── */}
      {tab === 'simular' && (
        <>
          {locked ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm p-3 bg-white/5 rounded-lg border border-white/10">
              <Lock className="w-4 h-4" /> Previsões bloqueadas
            </div>
          ) : (
            <div className="flex items-center gap-2 text-purple-400 text-sm p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <Info className="w-4 h-4 shrink-0" /> <span className="flex-1">Toque no time para avançá-lo à próxima fase.</span>
              <button onClick={handleReset} disabled={resetting}
                className="ml-auto shrink-0 text-[10px] text-orange-400 hover:text-orange-300 border border-orange-500/30 rounded px-2 py-0.5 disabled:opacity-50">
                {resetting ? 'Limpando…' : 'Refazer oitavas em diante'}
              </button>
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
                picks={effectivePicks} locked={locked} savingRef={savingRef} onPick={handlePick}
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
        </>
      )}

      {/* ── ABA: GALERA ── */}
      {tab === 'galera' && (
        <GaleraView participants={participants} loading={galeraLoading} />
      )}
    </div>
  )
}

// =============================================================================
// GALERA VIEW
// =============================================================================

function GaleraView({ participants, loading }: { participants: GaleraParticipant[]; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (loading) return <LoadingSpinner />

  if (participants.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-10 h-10 mx-auto mb-3 text-gray-600" />
        <p className="text-gray-400">Nenhum palpite registrado ainda</p>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">Palpites da galera</span>
          <Badge variant="gray">{participants.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-white/5">
          {participants.map(p => {
            const isOpen = expanded === p.user_id

            // Pega o palpite mais avançado para exibir em destaque
            const picksByStage = new Map<string, GaleraPick[]>()
            for (const pick of p.picks) {
              if (!picksByStage.has(pick.stage)) picksByStage.set(pick.stage, [])
              picksByStage.get(pick.stage)!.push(pick)
            }

            // Destaque: Final → Semifinal → Quartas → Oitavas → 32 avos
            const highlightStage = ['Final', 'Semi-finals', 'Quarter-finals', 'Round of 16', 'Round of 32']
              .find(s => picksByStage.has(s))
            const highlightPicks = highlightStage ? picksByStage.get(highlightStage) ?? [] : []

            return (
              <div key={p.user_id}>
                {/* Linha principal */}
                <button
                  onClick={() => setExpanded(isOpen ? null : p.user_id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left"
                >
                  <Avatar src={p.avatar_url} name={p.name} size="sm" />
                  <span className="text-sm font-medium text-white flex-1 min-w-0 truncate">{p.name}</span>

                  {/* Destaques */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {highlightPicks.slice(0, 2).map((pick, i) => (
                      <div key={i} className="flex items-center gap-1">
                        {pick.predicted_team_logo
                          ? <Image src={pick.predicted_team_logo} alt={pick.predicted_team_name} width={18} height={18} className="object-contain" />
                          : <div className="w-4 h-4 rounded-sm bg-white/10" />}
                        <span className="text-[10px] text-gray-300 hidden sm:inline truncate max-w-[60px]">
                          {translateTeamName(pick.predicted_team_name)}
                        </span>
                      </div>
                    ))}
                    {highlightStage && (
                      <span className="text-[9px] text-purple-400 font-medium ml-1">
                        {STAGE_PT[highlightStage] ?? highlightStage}
                      </span>
                    )}
                  </div>

                  {isOpen
                    ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
                </button>

                {/* Expansão: todos os palpites por fase */}
                {isOpen && (
                  <div className="px-4 pb-3 space-y-3 bg-white/[0.02]">
                    {STAGE_ORDER.filter(s => picksByStage.has(s)).map(stage => (
                      <div key={stage}>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          {STAGE_PT[stage] ?? stage}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {picksByStage.get(stage)!.map((pick, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/10">
                              {pick.predicted_team_logo
                                ? <Image src={pick.predicted_team_logo} alt={pick.predicted_team_name} width={16} height={16} className="object-contain shrink-0" />
                                : <div className="w-4 h-4 rounded-sm bg-white/10 shrink-0" />}
                              <span className="text-xs text-white">
                                {translateTeamName(pick.predicted_team_name)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {p.picks.length === 0 && (
                      <p className="text-xs text-gray-600 italic">Sem palpites ainda</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
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
  const hasResult  = (slot.winner_team_id ?? null) !== null
  const canPick    = !slotLocked && isReal(slot.home) && isReal(slot.away)

  return (
    <div className={cn(
      'rounded border overflow-hidden bg-gray-900 w-full',
      hasResult ? 'border-white/20' : 'border-white/10',
    )}>
      <div className="px-1 py-0.5 text-[7px] font-bold text-gray-600 uppercase tracking-wider border-b border-white/5 leading-none">
        {slot.label}
      </div>
      {([slot.home, slot.away] as const).map((team, i) => {
        const real      = isReal(team)
        const picked    = real && pick?.id === team.id
        const isWinner  = hasResult && real && team.id === slot.winner_team_id
        const isLoser   = hasResult && real && team.id !== slot.winner_team_id
        const correct   = picked && isWinner
        const wrong     = picked && isLoser

        return (
          <button key={i} disabled={!canPick || !real}
            onClick={() => real && team && onPick(slot, team)}
            className={cn(
              'w-full flex items-center gap-1 px-1 py-1 text-left transition-all',
              i === 1 && 'border-t border-white/5',
              correct ? 'bg-emerald-500/25 text-emerald-300' :
              wrong   ? 'bg-red-500/20 text-red-400' :
              picked  ? 'bg-emerald-500/25 text-emerald-300' : 'text-gray-300',
              isWinner && !picked ? 'font-semibold text-white' : '',
              isLoser  && !picked ? 'opacity-40' : '',
              canPick && real ? 'hover:bg-white/10 cursor-pointer' : 'cursor-default',
            )}>
            {real && team.logo
              ? <Image src={team.logo} alt={team.name} width={12} height={12} className={cn('object-contain shrink-0', isLoser && !picked ? 'opacity-50' : '')} />
              : <div className="w-3 h-3 rounded-sm bg-white/10 shrink-0" />}
            <span className="text-[9px] truncate leading-tight flex-1 min-w-0">
              {team ? team.name : 'A definir'}
            </span>
            {correct  && !saving && <Check className="w-2 h-2 shrink-0 text-emerald-400" />}
            {wrong    && !saving && <span className="text-[8px] shrink-0 text-red-400">✕</span>}
            {picked && !correct && !wrong && !saving && <Check className="w-2 h-2 shrink-0 text-emerald-400" />}
            {picked   &&  saving && <Loader2 className="w-2 h-2 shrink-0 animate-spin" />}
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
