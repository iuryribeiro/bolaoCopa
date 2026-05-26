'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Users, Check, Lock, Info, ChevronRight } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/Loading'
import { translateTeamName } from '@/lib/team-names'
import { cn } from '@/lib/utils'

interface StandingEntry {
  rank: number
  team: { id: number; name: string; logo: string }
  points: number
  goalsDiff: number
  group: string | null
  all: {
    played: number
    win: number
    draw: number
    lose: number
    goals: { for: number; against: number }
  }
}

interface GroupStanding {
  groupName: string
  teams: StandingEntry[]
}

interface SavedPrediction {
  group_name: string
  team_id: number
  team_name: string
  team_logo: string | null
  prediction_type?: string
}

type Tab = 'groups' | 'wildcards'

export default function ClassificadosPage() {
  const [standings, setStandings] = useState<GroupStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [locked, setLocked] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('groups')

  // Top-2 por grupo: groupName → Set<teamId>
  const [selected, setSelected] = useState<Map<string, Set<number>>>(new Map())
  // 8 melhores terceiros: Set<teamId>
  const [wildcards, setWildcards] = useState<Set<number>>(new Set())

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [standingsRes, predsRes, settingsRes] = await Promise.all([
          fetch('/api/football/standings'),
          fetch('/api/group-predictions'),
          fetch('/api/competition-settings'),
        ])

        const standingsData = await standingsRes.json()
        const predsData = await predsRes.json()
        const settingsData = await settingsRes.json()

        setLocked(settingsData.settings?.groups_prediction_locked || false)

        const rawStandings: Array<{ group: string; table: StandingEntry[] }> =
          standingsData.standings || []

        const groups: GroupStanding[] = rawStandings
          .filter(g => g.table?.length > 0)
          .map(g => ({
            groupName: (g.group || '').replace('GROUP_', 'Group '),
            teams: g.table,
          }))
          .sort((a, b) => a.groupName.localeCompare(b.groupName))

        setStandings(groups)

        // Pré-popular seleções salvas
        const preds: SavedPrediction[] = predsData.predictions || []
        const selMap = new Map<string, Set<number>>()
        const wildcardSet = new Set<number>()

        preds.forEach(p => {
          if (p.prediction_type === 'third_wildcard') {
            wildcardSet.add(p.team_id)
          } else {
            if (!selMap.has(p.group_name)) selMap.set(p.group_name, new Set())
            selMap.get(p.group_name)!.add(p.team_id)
          }
        })

        setSelected(selMap)
        setWildcards(wildcardSet)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const toggleGroupTeam = (groupName: string, teamId: number) => {
    if (locked) return
    setSelected(prev => {
      const newMap = new Map(prev)
      if (!newMap.has(groupName)) newMap.set(groupName, new Set())
      const groupSet = new Set(newMap.get(groupName)!)
      if (groupSet.has(teamId)) {
        groupSet.delete(teamId)
        // se remover do top-2, remove também dos wildcards
        setWildcards(w => { const s = new Set(w); s.delete(teamId); return s })
      } else if (groupSet.size < 2) {
        groupSet.add(teamId)
      }
      newMap.set(groupName, groupSet)
      return newMap
    })
  }

  const toggleWildcard = (team: StandingEntry, groupName: string) => {
    if (locked) return
    // não pode ser top-2 do próprio grupo nem de outro
    const isTop2Anywhere = Array.from(selected.values()).some(s => s.has(team.team.id))
    if (isTop2Anywhere) return

    setWildcards(prev => {
      const next = new Set(prev)
      if (next.has(team.team.id)) {
        next.delete(team.team.id)
      } else if (next.size < 8) {
        next.add(team.team.id)
      }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const groupPredictions: SavedPrediction[] = []
    const wildcardPredictions: SavedPrediction[] = []

    standings.forEach(({ groupName, teams }) => {
      const groupSelected = selected.get(groupName) || new Set()
      groupSelected.forEach(teamId => {
        const team = teams.find(t => t.team.id === teamId)
        if (team) {
          groupPredictions.push({
            group_name: groupName,
            team_id: teamId,
            team_name: team.team.name,
            team_logo: team.team.logo || null,
          })
        }
      })
    })

    wildcards.forEach(teamId => {
      const team = standings.flatMap(g => g.teams).find(t => t.team.id === teamId)
      const groupName = standings.find(g => g.teams.some(t => t.team.id === teamId))?.groupName || ''
      if (team) {
        wildcardPredictions.push({
          group_name: groupName,
          team_id: teamId,
          team_name: team.team.name,
          team_logo: team.team.logo || null,
        })
      }
    })

    try {
      const res = await fetch('/api/group-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictions: groupPredictions, wildcardPredictions }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  const totalGroupSelected = Array.from(selected.values()).reduce((s, v) => s + v.size, 0)
  const totalGroupNeeded = standings.length * 2
  const totalWildcards = wildcards.size
  const groupPct = totalGroupNeeded > 0 ? Math.min((totalGroupSelected / totalGroupNeeded) * 100, 100) : 0
  const wildcardPct = Math.min((totalWildcards / 8) * 100, 100)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Classificados</h1>
          <p className="text-sm text-gray-400">Fase de grupos da Copa 2026</p>
        </div>
      </div>

      {locked ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm p-3 bg-white/5 rounded-lg border border-white/10">
          <Lock className="w-4 h-4" />
          Prazo para previsão de classificados encerrado
        </div>
      ) : (
        <div className="flex items-start gap-2 text-blue-400 text-sm p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p>Escolha os <strong>2 classificados de cada grupo</strong> + os <strong>8 melhores 3ºs colocados</strong> que avançam para a Rodada de 32.</p>
            <p className="text-xs text-blue-300/70 mt-0.5">Cada acerto vale 1 ponto extra.</p>
          </div>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 text-green-400 text-sm p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <Check className="w-4 h-4" />
          Previsões salvas com sucesso!
        </div>
      )}

      {/* Progresso geral */}
      {!locked && standings.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setActiveTab('groups')}
            className={cn(
              'p-3 rounded-xl border text-left transition-all',
              activeTab === 'groups'
                ? 'bg-blue-500/15 border-blue-500/40'
                : 'bg-white/5 border-white/10'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400">1º e 2º por grupo</span>
              <ChevronRight className={cn('w-3 h-3 transition-transform', activeTab === 'groups' ? 'text-blue-400 rotate-90' : 'text-gray-600')} />
            </div>
            <div className="text-lg font-bold text-white">{totalGroupSelected}<span className="text-gray-500 text-sm font-normal">/{totalGroupNeeded}</span></div>
            <div className="mt-1.5 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${groupPct}%` }} />
            </div>
          </button>

          <button
            onClick={() => setActiveTab('wildcards')}
            className={cn(
              'p-3 rounded-xl border text-left transition-all',
              activeTab === 'wildcards'
                ? 'bg-emerald-500/15 border-emerald-500/40'
                : 'bg-white/5 border-white/10'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400">Melhores 3ºs</span>
              <ChevronRight className={cn('w-3 h-3 transition-transform', activeTab === 'wildcards' ? 'text-emerald-400 rotate-90' : 'text-gray-600')} />
            </div>
            <div className="text-lg font-bold text-white">{totalWildcards}<span className="text-gray-500 text-sm font-normal">/8</span></div>
            <div className="mt-1.5 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${wildcardPct}%` }} />
            </div>
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : standings.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">Classificação ainda não disponível</p>
          <p className="text-gray-600 text-sm mt-1">Sincronize os jogos no painel admin</p>
        </div>
      ) : activeTab === 'groups' ? (
        /* ── ABA 1: Top 2 por grupo ── */
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {standings.map(({ groupName, teams }) => {
              const groupSelected = selected.get(groupName) || new Set()
              return (
                <Card key={groupName}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">{groupName}</h3>
                      <span className="text-xs text-gray-500">{groupSelected.size}/2</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {teams.map(entry => {
                      const isSelected = groupSelected.has(entry.team.id)
                      const maxReached = !isSelected && groupSelected.size >= 2
                      const namePT = translateTeamName(entry.team.name)

                      return (
                        <button
                          key={entry.team.id}
                          onClick={() => toggleGroupTeam(groupName, entry.team.id)}
                          disabled={locked || maxReached}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 text-left transition-all',
                            isSelected
                              ? 'bg-blue-500/15'
                              : locked || maxReached
                                ? 'opacity-40 cursor-not-allowed'
                                : 'hover:bg-white/5 cursor-pointer'
                          )}
                        >
                          <span className="text-xs text-gray-500 w-4 shrink-0">{entry.rank}</span>
                          {entry.team.logo ? (
                            <Image src={entry.team.logo} alt={namePT} width={24} height={24} className="object-contain shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-white/10 shrink-0" />
                          )}
                          <span className="flex-1 text-sm text-white truncate">{namePT}</span>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                            <span className="hidden sm:inline">{entry.all.played}J</span>
                            <span className="hidden sm:inline">{entry.all.win}V</span>
                            <span className="hidden sm:inline">{entry.all.draw}E</span>
                            <span className="hidden sm:inline">{entry.all.lose}D</span>
                            <span className="font-semibold text-white w-7 text-right">{entry.points}pts</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                        </button>
                      )
                    })}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Button
            onClick={() => setActiveTab('wildcards')}
            variant="secondary"
            fullWidth
          >
            Próximo: Melhores 3ºs Colocados →
          </Button>
        </>
      ) : (
        /* ── ABA 2: 8 melhores 3ºs colocados ── */
        <>
          <div className="flex items-start gap-2 text-emerald-400/80 text-xs p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Escolha <strong className="text-emerald-400">8 times</strong> que você acredita que avançarão como melhores 3ºs colocados.
            Times já escolhidos como 1º ou 2º estão bloqueados.
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {standings.map(({ groupName, teams }) => {
              const top2ofGroup = selected.get(groupName) || new Set()

              return (
                <Card key={groupName}>
                  <CardHeader>
                    <h3 className="text-sm font-semibold text-white">{groupName}</h3>
                  </CardHeader>
                  <CardContent className="p-0">
                    {teams.map(entry => {
                      const isTop2 = top2ofGroup.has(entry.team.id)
                      const isTop2Elsewhere = !isTop2 && Array.from(selected.values()).some(s => s.has(entry.team.id))
                      const isWildcard = wildcards.has(entry.team.id)
                      const maxReached = !isWildcard && wildcards.size >= 8
                      const namePT = translateTeamName(entry.team.name)
                      const blocked = isTop2 || isTop2Elsewhere || (locked && !isWildcard)

                      return (
                        <button
                          key={entry.team.id}
                          onClick={() => toggleWildcard(entry, groupName)}
                          disabled={blocked || (!isWildcard && maxReached) || locked}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 text-left transition-all',
                            isWildcard
                              ? 'bg-emerald-500/15'
                              : isTop2
                                ? 'opacity-30 cursor-not-allowed'
                                : blocked || maxReached
                                  ? 'opacity-40 cursor-not-allowed'
                                  : 'hover:bg-white/5 cursor-pointer'
                          )}
                        >
                          <span className="text-xs text-gray-500 w-4 shrink-0">{entry.rank}</span>
                          {entry.team.logo ? (
                            <Image src={entry.team.logo} alt={namePT} width={24} height={24} className="object-contain shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-white/10 shrink-0" />
                          )}
                          <span className="flex-1 text-sm text-white truncate">{namePT}</span>
                          {isTop2 && (
                            <span className="text-xs text-blue-400 shrink-0">1º/2º</span>
                          )}
                          {isWildcard && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </button>
                      )
                    })}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {!locked && standings.length > 0 && (
        <Button
          onClick={handleSave}
          loading={saving}
          fullWidth
          disabled={totalGroupSelected === 0 && totalWildcards === 0}
        >
          Salvar Previsões ({totalGroupSelected} grupos · {totalWildcards} terceiros)
        </Button>
      )}
    </div>
  )
}
