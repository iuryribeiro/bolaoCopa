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

// ─── Chave oficial Copa 2026 ───────────────────────────────────────────────
//
// Rodada de 32 ordenada por data → índices 0-15 (J73=0, J74=1, …, J88=15)
//
// Oitavas (R16) ← winners da Rodada de 32:
//   J89 = J73(0)  vs J75(2)
//   J90 = J74(1)  vs J77(4)
//   J91 = J76(3)  vs J78(5)
//   J92 = J79(6)  vs J80(7)
//   J93 = J83(10) vs J84(11)
//   J94 = J81(8)  vs J82(9)
//   J95 = J86(13) vs J88(15)
//   J96 = J85(12) vs J87(14)
//
// Quartas (QF) ← winners das Oitavas (índices 0-7):
//   J97  = J89(0) vs J90(1)
//   J98  = J93(4) vs J94(5)
//   J99  = J91(2) vs J92(3)
//   J100 = J95(6) vs J96(7)
//
// Semis ← winners das Quartas (índices 0-3):
//   SF1 = J97(0) vs J98(1)
//   SF2 = J99(2) vs J100(3)
//
// Final ← SF1(0) vs SF2(1)
// ──────────────────────────────────────────────────────────────────────────

const R32_TO_R16: [number, number][] = [
  [0,  2],  // J89
  [1,  4],  // J90
  [3,  5],  // J91
  [6,  7],  // J92
  [10, 11], // J93
  [8,  9],  // J94
  [13, 15], // J95
  [12, 14], // J96
]

const R16_TO_QF: [number, number][] = [
  [0, 1], // J97  = J89 vs J90
  [4, 5], // J98  = J93 vs J94
  [2, 3], // J99  = J91 vs J92
  [6, 7], // J100 = J95 vs J96
]

const QF_TO_SF: [number, number][] = [
  [0, 1], // J101 = J97 vs J98
  [2, 3], // J102 = J99 vs J100
]

const SF_TO_FINAL: [number, number][] = [
  [0, 1], // J103 = J101 vs J102
]

const KNOCKOUT_STAGES: Stage[] = [
  'Round of 32',
  'Round of 16',
  'Quarter-finals',
  'Semi-finals',
  'Final',
]

const STAGE_LABELS: Record<string, string> = {
  'Round of 32':    'Rodada de 32',
  'Round of 16':    'Oitavas de Final',
  'Quarter-finals': 'Quartas de Final',
  'Semi-finals':    'Semifinais',
  'Final':          'Final',
}

// Labels de jogo por estágio (para exibir "J73", "J89", "SF1", etc.)
const MATCH_LABELS: Record<string, string[]> = {
  'Round of 32':    ['J73','J74','J75','J76','J77','J78','J79','J80','J81','J82','J83','J84','J85','J86','J87','J88'],
  'Round of 16':    ['J89','J90','J91','J92','J93','J94','J95','J96'],
  'Quarter-finals': ['J97','J98','J99','J100'],
  'Semi-finals':    ['J101','J102'],
  'Final':          ['J103'],
}

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
  return [...matches].sort((a, b) =>
    new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  )
}

function teamOf(m: Match, side: 'home' | 'away'): TeamOption {
  return side === 'home'
    ? { id: m.home_team_id, name: translateTeamName(m.home_team_name), logo: m.home_team_logo }
    : { id: m.away_team_id, name: translateTeamName(m.away_team_name), logo: m.away_team_logo }
}

function actualSlots(matches: Match[], stage: Stage): BracketSlot[] {
  return sortByDate(matches).map((m, idx) => ({
    ref: m.id,
    stage,
    label: MATCH_LABELS[stage]?.[idx] ?? `#${idx + 1}`,
    home: teamOf(m, 'home'),
    away: teamOf(m, 'away'),
  }))
}

function virtualSlots(
  stage: Stage,
  pairings: [number, number][],
  prev: BracketSlot[],
  picks: Map<string, TeamOption>,
): BracketSlot[] {
  return pairings.map(([i, j], idx) => ({
    ref: `virtual-${stage}-${idx}`,
    stage,
    label: MATCH_LABELS[stage]?.[idx] ?? `#${idx + 1}`,
    home: prev[i] ? (picks.get(prev[i].ref) ?? null) : null,
    away: prev[j] ? (picks.get(prev[j].ref) ?? null) : null,
  }))
}

function buildBracket(
  actualMatches: Match[],
  picks: Map<string, TeamOption>,
): Record<Stage, BracketSlot[]> {
  const actual = (s: Stage) => actualMatches.filter(m => m.stage === s)

  const r32 = actual('Round of 32').length > 0
    ? actualSlots(actual('Round of 32'), 'Round of 32')
    : []

  const r16 = actual('Round of 16').length > 0
    ? actualSlots(actual('Round of 16'), 'Round of 16')
    : r32.length > 0
      ? virtualSlots('Round of 16', R32_TO_R16, r32, picks)
      : []

  const qf = actual('Quarter-finals').length > 0
    ? actualSlots(actual('Quarter-finals'), 'Quarter-finals')
    : r16.length > 0
      ? virtualSlots('Quarter-finals', R16_TO_QF, r16, picks)
      : []

  const sf = actual('Semi-finals').length > 0
    ? actualSlots(actual('Semi-finals'), 'Semi-finals')
    : qf.length > 0
      ? virtualSlots('Semi-finals', QF_TO_SF, qf, picks)
      : []

  const fin = actual('Final').length > 0
    ? actualSlots(actual('Final'), 'Final')
    : sf.length > 0
      ? virtualSlots('Final', SF_TO_FINAL, sf, picks)
      : []

  return {
    'Round of 32': r32,
    'Round of 16': r16,
    'Quarter-finals': qf,
    'Semi-finals': sf,
    'Final': fin,
    'Group Stage': [],
    '3rd Place Final': [],
  }
}

// ─── Componente ───────────────────────────────────────────────────────────

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
        const [matchesRes, predsRes, champRes, settingsRes] = await Promise.all([
          fetch('/api/football/matches?limit=200'),
          fetch('/api/knockout-predictions'),
          fetch('/api/champion-prediction'),
          fetch('/api/competition-settings'),
        ])
        const matchesData   = await matchesRes.json()
        const predsData     = await predsRes.json()
        const champData     = await champRes.json()
        const settingsData  = await settingsRes.json()

        setActualMatches(
          (matchesData.matches || []).filter((m: Match) => KNOCKOUT_STAGES.includes(m.stage))
        )
        setLocked(settingsData.settings?.knockout_prediction_locked || false)

        const predMap = new Map<string, TeamOption>()
        ;(predsData.predictions || []).forEach((p: {
          match_reference: string
          predicted_team_id: number
          predicted_team_name: string
          predicted_team_logo: string | null
        }) => {
          predMap.set(p.match_reference, {
            id: p.predicted_team_id,
            name: p.predicted_team_name,
            logo: p.predicted_team_logo,
          })
        })
        setPicks(predMap)

        if (champData.prediction) {
          setChampionPred({
            id: champData.prediction.champion_team_id,
            name: champData.prediction.champion_team_name,
            logo: champData.prediction.champion_team_logo,
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
                        {/* Match label */}
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

// ─── TeamButton ────────────────────────────────────────────────────────────

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
        !canPick ? 'cursor-default' : 'cursor-pointer'
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
