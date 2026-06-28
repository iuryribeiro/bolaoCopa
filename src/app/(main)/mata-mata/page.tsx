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
// CHAVE OFICIAL COPA DO MUNDO 2026
// =============================================================================
//
// RODADA DE 32 — sorted por data → índice 0-15
//   idx 0  = J73  | idx 1  = J74  | idx 2  = J75  | idx 3  = J76
//   idx 4  = J77  | idx 5  = J78  | idx 6  = J79  | idx 7  = J80
//   idx 8  = J81  | idx 9  = J82  | idx 10 = J83  | idx 11 = J84
//   idx 12 = J85  | idx 13 = J86  | idx 14 = J87  | idx 15 = J88
//
// OITAVAS — cada par [a, b] = índices dos jogos da Rodada de 32:
//   slot 0 → J89  = J74[1]  x J77[4]   ← [1, 4]
//   slot 1 → J90  = J73[0]  x J75[2]   ← [0, 2]
//   slot 2 → J91  = J76[3]  x J78[5]   ← [3, 5]
//   slot 3 → J92  = J79[6]  x J80[7]   ← [6, 7]
//   slot 4 → J93  = J83[10] x J84[11]  ← [10, 11]
//   slot 5 → J94  = J81[8]  x J82[9]   ← [8, 9]
//   slot 6 → J95  = J86[13] x J88[15]  ← [13, 15]
//   slot 7 → J96  = J85[12] x J87[14]  ← [12, 14]
//
// QUARTAS — cada par [a, b] = índices dos slots das Oitavas:
//   slot 0 → J97  = J89[0] x J90[1]    ← [0, 1]
//   slot 1 → J98  = J93[4] x J94[5]    ← [4, 5]
//   slot 2 → J99  = J91[2] x J92[3]    ← [2, 3]
//   slot 3 → J100 = J95[6] x J96[7]    ← [6, 7]
//
// SEMIS — cada par [a, b] = índices dos slots das Quartas:
//   slot 0 → J101 = J97[0] x J98[1]    ← [0, 1]
//   slot 1 → J102 = J99[2] x J100[3]   ← [2, 3]
//
// 3º LUGAR — perdedores das Semis:
//   J103 = perdedor J101 x perdedor J102
//
// FINAL — vencedores das Semis:
//   J104 = J101[0] x J102[1]            ← [0, 1]
//
// =============================================================================

// Pairings: índices dos slots da fase ANTERIOR que se enfrentam
const OITAVAS_PAIRS: [number, number][] = [
  [1,  4],  // slot 0 → J89  = J74 x J77
  [0,  2],  // slot 1 → J90  = J73 x J75
  [3,  5],  // slot 2 → J91  = J76 x J78
  [6,  7],  // slot 3 → J92  = J79 x J80
  [10, 11], // slot 4 → J93  = J83 x J84
  [8,  9],  // slot 5 → J94  = J81 x J82
  [13, 15], // slot 6 → J95  = J86 x J88
  [12, 14], // slot 7 → J96  = J85 x J87
]

const QUARTAS_PAIRS: [number, number][] = [
  [0, 1], // slot 0 → J97  = J89 x J90
  [4, 5], // slot 1 → J98  = J93 x J94
  [2, 3], // slot 2 → J99  = J91 x J92
  [6, 7], // slot 3 → J100 = J95 x J96
]

const SEMIS_PAIRS: [number, number][] = [
  [0, 1], // slot 0 → J101 = J97 x J98
  [2, 3], // slot 1 → J102 = J99 x J100
]

const FINAL_PAIRS: [number, number][] = [
  [0, 1], // slot 0 → J104 = J101 x J102
]

// =============================================================================

const KNOCKOUT_STAGES: Stage[] = [
  'Round of 32',
  'Round of 16',
  'Quarter-finals',
  'Semi-finals',
  '3rd Place Final',
  'Final',
]

const STAGE_LABELS: Record<string, string> = {
  'Round of 32':    'Rodada de 32',
  'Round of 16':    'Oitavas de Final',
  'Quarter-finals': 'Quartas de Final',
  'Semi-finals':    'Semifinais',
  '3rd Place Final':'Disputa de 3º Lugar',
  'Final':          'Final',
}

const MATCH_LABELS: Record<string, string[]> = {
  'Round of 32':    ['J73','J74','J75','J76','J77','J78','J79','J80','J81','J82','J83','J84','J85','J86','J87','J88'],
  'Round of 16':    ['J89','J90','J91','J92','J93','J94','J95','J96'],
  'Quarter-finals': ['J97','J98','J99','J100'],
  'Semi-finals':    ['J101','J102'],
  '3rd Place Final':['J103'],
  'Final':          ['J104'],
}

// =============================================================================

interface TeamOption {
  id: number
  name: string
  logo: string | null
}

interface BracketSlot {
  ref: string
  stage: Stage
  label: string
  home: TeamOption | null
  away: TeamOption | null
}

function sortByDate(matches: Match[]) {
  return [...matches].sort(
    (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  )
}

function teamOf(m: Match, side: 'home' | 'away'): TeamOption {
  return side === 'home'
    ? { id: m.home_team_id, name: translateTeamName(m.home_team_name), logo: m.home_team_logo }
    : { id: m.away_team_id, name: translateTeamName(m.away_team_name), logo: m.away_team_logo }
}

/** Cria slots a partir de jogos reais da API */
function fromActual(matches: Match[], stage: Stage): BracketSlot[] {
  return sortByDate(matches).map((m, idx) => ({
    ref: m.id,
    stage,
    label: MATCH_LABELS[stage]?.[idx] ?? `#${idx + 1}`,
    home: teamOf(m, 'home'),
    away: teamOf(m, 'away'),
  }))
}

/**
 * Cria slots virtuais para a próxima fase.
 * Cada par [i, j] indica os índices dos slots da fase anterior cujos
 * VENCEDORES se enfrentam neste slot.
 */
function fromPicks(
  stage: Stage,
  pairs: [number, number][],
  prevSlots: BracketSlot[],
  picks: Map<string, TeamOption>,
): BracketSlot[] {
  return pairs.map(([i, j], idx) => ({
    ref: `virtual-${stage}-${idx}`,
    stage,
    label: MATCH_LABELS[stage]?.[idx] ?? `#${idx + 1}`,
    home: prevSlots[i] ? (picks.get(prevSlots[i].ref) ?? null) : null,
    away: prevSlots[j] ? (picks.get(prevSlots[j].ref) ?? null) : null,
  }))
}

function buildBracket(
  actualMatches: Match[],
  picks: Map<string, TeamOption>,
): Record<Stage, BracketSlot[]> {
  const real = (s: Stage) => actualMatches.filter(m => m.stage === s)

  // ── Rodada de 32 ──────────────────────────────────────────────────────────
  const r32: BracketSlot[] = real('Round of 32').length > 0
    ? fromActual(real('Round of 32'), 'Round of 32')
    : []

  // ── Oitavas ───────────────────────────────────────────────────────────────
  // J89=R32[0]xR32[2], J90=R32[1]xR32[4], J91=R32[3]xR32[5], J92=R32[6]xR32[7]
  // J93=R32[10]xR32[11], J94=R32[8]xR32[9], J95=R32[13]xR32[15], J96=R32[12]xR32[14]
  const r16: BracketSlot[] = real('Round of 16').length > 0
    ? fromActual(real('Round of 16'), 'Round of 16')
    : r32.length > 0
      ? fromPicks('Round of 16', OITAVAS_PAIRS, r32, picks)
      : []

  // ── Quartas ───────────────────────────────────────────────────────────────
  // J97=R16[0]xR16[1], J98=R16[4]xR16[5], J99=R16[2]xR16[3], J100=R16[6]xR16[7]
  const qf: BracketSlot[] = real('Quarter-finals').length > 0
    ? fromActual(real('Quarter-finals'), 'Quarter-finals')
    : r16.length > 0
      ? fromPicks('Quarter-finals', QUARTAS_PAIRS, r16, picks)
      : []

  // ── Semis ─────────────────────────────────────────────────────────────────
  // J101=QF[0]xQF[1], J102=QF[2]xQF[3]
  const sf: BracketSlot[] = real('Semi-finals').length > 0
    ? fromActual(real('Semi-finals'), 'Semi-finals')
    : qf.length > 0
      ? fromPicks('Semi-finals', SEMIS_PAIRS, qf, picks)
      : []

  // ── 3º Lugar (perdedores das semis) ───────────────────────────────────────
  // J103 = perdedor J101 x perdedor J102
  const third: BracketSlot[] = real('3rd Place Final').length > 0
    ? fromActual(real('3rd Place Final'), '3rd Place Final')
    : sf.length >= 2
      ? (() => {
          const sf0 = sf[0], sf1 = sf[1]
          const pick0 = picks.get(sf0.ref)
          const pick1 = picks.get(sf1.ref)
          // loser = o time do slot que NÃO foi escolhido
          const loser0 = pick0
            ? (pick0.id === sf0.home?.id ? sf0.away : sf0.home)
            : null
          const loser1 = pick1
            ? (pick1.id === sf1.home?.id ? sf1.away : sf1.home)
            : null
          return [{
            ref: 'virtual-3rd Place Final-0',
            stage: '3rd Place Final' as Stage,
            label: 'J103',
            home: loser0,
            away: loser1,
          }]
        })()
      : []

  // ── Final ─────────────────────────────────────────────────────────────────
  // J104 = vencedor J101 x vencedor J102
  const fin: BracketSlot[] = real('Final').length > 0
    ? fromActual(real('Final'), 'Final')
    : sf.length > 0
      ? fromPicks('Final', FINAL_PAIRS, sf, picks)
      : []

  return {
    'Round of 32':    r32,
    'Round of 16':    r16,
    'Quarter-finals': qf,
    'Semi-finals':    sf,
    '3rd Place Final':third,
    'Final':          fin,
    'Group Stage':    [],
  }
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function MataMataPage() {
  const [actualMatches, setActualMatches] = useState<Match[]>([])
  const [loading, setLoading]             = useState(true)
  const [locked, setLocked]               = useState(false)
  const [picks, setPicks]                 = useState<Map<string, TeamOption>>(new Map())
  const [savingRef, setSavingRef]         = useState<string | null>(null)
  const [championPred, setChampionPred]   = useState<TeamOption | null>(null)
  const [savingChampion, setSavingChampion] = useState(false)

  const bracket = useMemo(
    () => buildBracket(actualMatches, picks),
    [actualMatches, picks],
  )

  useEffect(() => {
    ;(async () => {
      try {
        const [mRes, pRes, cRes, sRes] = await Promise.all([
          fetch('/api/football/matches?limit=200'),
          fetch('/api/knockout-predictions'),
          fetch('/api/champion-prediction'),
          fetch('/api/competition-settings'),
        ])
        const mData = await mRes.json()
        const pData = await pRes.json()
        const cData = await cRes.json()
        const sData = await sRes.json()

        setActualMatches(
          (mData.matches || []).filter((m: Match) => KNOCKOUT_STAGES.includes(m.stage))
        )
        setLocked(sData.settings?.knockout_prediction_locked || false)

        const map = new Map<string, TeamOption>()
        ;(pData.predictions || []).forEach((p: {
          match_reference: string
          predicted_team_id: number
          predicted_team_name: string
          predicted_team_logo: string | null
        }) => {
          map.set(p.match_reference, {
            id: p.predicted_team_id,
            name: p.predicted_team_name,
            logo: p.predicted_team_logo,
          })
        })
        setPicks(map)

        if (cData.prediction) {
          setChampionPred({
            id: cData.prediction.champion_team_id,
            name: cData.prediction.champion_team_name,
            logo: cData.prediction.champion_team_logo,
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handlePick = async (slot: BracketSlot, team: TeamOption) => {
    if (locked || !slot.home || !slot.away) return
    const prev = picks.get(slot.ref)
    setPicks(cur => new Map(cur).set(slot.ref, team))
    setSavingRef(slot.ref)
    try {
      const res = await fetch('/api/knockout-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictions: [{
            stage: slot.stage,
            match_reference: slot.ref,
            predicted_team_id: team.id,
            predicted_team_name: team.name,
            predicted_team_logo: team.logo,
          }],
        }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setPicks(cur => {
        const next = new Map(cur)
        if (prev) next.set(slot.ref, prev)
        else next.delete(slot.ref)
        return next
      })
    } finally {
      setSavingRef(null)
    }
  }

  const handleChampion = async (team: TeamOption) => {
    setSavingChampion(true)
    try {
      await fetch('/api/champion-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          champion_team_id: team.id,
          champion_team_name: team.name,
          champion_team_logo: team.logo,
        }),
      })
      setChampionPred(team)
    } finally {
      setSavingChampion(false)
    }
  }

  const visibleStages = KNOCKOUT_STAGES.filter(s => (bracket[s]?.length ?? 0) > 0)
  const hasBracket    = visibleStages.length > 0

  const allFirstStageTeams = visibleStages[0]
    ? Array.from(
        new Map(
          (bracket[visibleStages[0]] ?? []).flatMap(slot =>
            ([slot.home, slot.away].filter(Boolean) as TeamOption[]).map(t => [String(t.id), t])
          )
        ).values()
      )
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GitBranch className="w-6 h-6 text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Mata-mata</h1>
          <p className="text-sm text-gray-400">Monte seu bracket até a final</p>
        </div>
        {locked && <Lock className="w-4 h-4 text-red-400 ml-auto" />}
      </div>

      {locked ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm p-3 bg-white/5 rounded-lg border border-white/10">
          <Lock className="w-4 h-4" />
          Previsões bloqueadas — não é possível alterar
        </div>
      ) : (
        <div className="flex items-center gap-2 text-purple-400 text-sm p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <Info className="w-4 h-4 shrink-0" />
          Escolha o vencedor de cada jogo — ele avança automaticamente para a próxima fase.
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : !hasBracket ? (
        <div className="text-center py-12">
          <GitBranch className="w-10 h-10 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">Mata-mata ainda não disponível</p>
          <p className="text-gray-600 text-sm mt-1">Disponível após a fase de grupos</p>
        </div>
      ) : (
        <>
          {visibleStages.map(stage => (
            <div key={stage} className="space-y-2">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                {STAGE_LABELS[stage] ?? stage}
              </h2>
              <Card>
                <CardContent className="p-0">
                  {bracket[stage].map((slot, idx) => {
                    const pick     = picks.get(slot.ref)
                    const isSaving = savingRef === slot.ref
                    const canPick  = !locked && !!slot.home && !!slot.away

                    return (
                      <div
                        key={slot.ref}
                        className={cn('p-4', idx < bracket[stage].length - 1 && 'border-b border-white/5')}
                      >
                        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">
                          {slot.label}
                        </p>
                        <div className="flex items-center gap-2">
                          <TeamButton
                            team={slot.home}
                            selected={!!pick && pick.id === slot.home?.id}
                            saving={isSaving && pick?.id === slot.home?.id}
                            canPick={canPick}
                            onClick={() => slot.home && handlePick(slot, slot.home)}
                          />
                          <span className="text-gray-600 text-xs font-bold shrink-0">VS</span>
                          <TeamButton
                            team={slot.away}
                            selected={!!pick && pick.id === slot.away?.id}
                            saving={isSaving && pick?.id === slot.away?.id}
                            canPick={canPick}
                            onClick={() => slot.away && handlePick(slot, slot.away)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          ))}

          {/* Campeão */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
              Campeão
            </h2>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-semibold text-white">Campeão da Copa</span>
                  <Badge variant="yellow">+10 pts</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {championPred ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {championPred.logo && (
                        <Image src={championPred.logo} alt={championPred.name} width={40} height={40} className="object-contain" />
                      )}
                      <div>
                        <p className="text-white font-semibold">{translateTeamName(championPred.name)}</p>
                        <p className="text-xs text-gray-400">Sua escolha de campeão</p>
                      </div>
                    </div>
                    {!locked && (
                      <Button variant="ghost" size="sm" onClick={() => setChampionPred(null)}>
                        Alterar
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-400 text-sm">
                      {locked ? 'Prazo encerrado' : 'Escolha o campeão:'}
                    </p>
                    {!locked && allFirstStageTeams.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {allFirstStageTeams.map(team => (
                          <button
                            key={team.id}
                            onClick={() => handleChampion(team)}
                            disabled={savingChampion}
                            className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left"
                          >
                            {team.logo && (
                              <Image src={team.logo} alt={team.name} width={24} height={24} className="object-contain shrink-0" />
                            )}
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
// BOTÃO DE TIME
// =============================================================================

function TeamButton({
  team,
  selected,
  saving,
  canPick,
  onClick,
}: {
  team: TeamOption | null
  selected: boolean
  saving: boolean
  canPick: boolean
  onClick: () => void
}) {
  if (!team) {
    return (
      <div className="flex-1 flex items-center gap-2 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
        <div className="w-7 h-7 rounded-full bg-white/5 shrink-0" />
        <span className="text-xs text-gray-600 italic">A definir</span>
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={!canPick || saving}
      className={cn(
        'flex-1 flex items-center gap-2 p-3 rounded-xl border transition-all text-left',
        selected
          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10',
        !canPick ? 'cursor-default' : 'cursor-pointer',
      )}
    >
      {team.logo && (
        <Image src={team.logo} alt={team.name} width={28} height={28} className="object-contain shrink-0" />
      )}
      <span className="text-sm font-medium truncate">{team.name}</span>
      {selected && (
        saving
          ? <Loader2 className="w-3 h-3 ml-auto shrink-0 animate-spin" />
          : <Check className="w-3 h-3 ml-auto shrink-0" />
      )}
    </button>
  )
}
