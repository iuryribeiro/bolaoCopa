'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { GitBranch, Trophy, Lock, Info, Check } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'
import { translateTeamName } from '@/lib/team-names'
import type { Match, Stage } from '@/types'

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

interface TeamOption {
  id: number
  name: string
  logo: string | null
}

export default function MataMataPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeStage, setActiveStage] = useState<Stage>('Round of 32')
  const [myPredictions, setMyPredictions] = useState<Map<string, number>>(new Map())
  const [championPred, setChampionPred] = useState<TeamOption | null>(null)
  const [savingChampion, setSavingChampion] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [matchesRes, predsRes, champRes, settingsRes] = await Promise.all([
          fetch('/api/football/matches?limit=200'),
          fetch('/api/knockout-predictions'),
          fetch('/api/champion-prediction'),
          fetch('/api/competition-settings'),
        ])

        const matchesData = await matchesRes.json()
        const predsData = await predsRes.json()
        const champData = await champRes.json()
        const settingsData = await settingsRes.json()

        const knockoutMatches = (matchesData.matches || []).filter((m: Match) =>
          KNOCKOUT_STAGES.includes(m.stage)
        )
        setMatches(knockoutMatches)
        setLocked(settingsData.settings?.knockout_prediction_locked || false)

        // Set active stage to the first one that has matches
        const firstStageWithMatches = KNOCKOUT_STAGES.find(s =>
          knockoutMatches.some((m: Match) => m.stage === s)
        )
        if (firstStageWithMatches) setActiveStage(firstStageWithMatches)

        const predMap = new Map<string, number>()
        ;(predsData.predictions || []).forEach((p: { stage: string; match_reference: string; predicted_team_id: number }) => {
          predMap.set(`${p.stage}-${p.match_reference}`, p.predicted_team_id)
        })
        setMyPredictions(predMap)

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
    }
    fetchAll()
  }, [])

  const handlePickWinner = (stage: string, matchRef: string, team: TeamOption) => {
    if (locked) return
    setMyPredictions(prev => {
      const newMap = new Map(prev)
      newMap.set(`${stage}-${matchRef}`, team.id)
      return newMap
    })
  }

  const handleSaveKnockout = async () => {
    setSaving(true)
    const predictions: Array<{
      stage: string
      match_reference: string
      predicted_team_id: number
      predicted_team_name: string
      predicted_team_logo?: string | null
    }> = []

    myPredictions.forEach((teamId, key) => {
      const [stage, matchRef] = key.split('-', 2)
      const match = matches.find(m => m.stage === stage && String(m.id) === matchRef)
      const team = match
        ? (match.home_team_id === teamId
          ? { id: match.home_team_id, name: match.home_team_name, logo: match.home_team_logo }
          : { id: match.away_team_id, name: match.away_team_name, logo: match.away_team_logo })
        : null

      if (team) {
        predictions.push({
          stage,
          match_reference: matchRef,
          predicted_team_id: teamId,
          predicted_team_name: team.name,
          predicted_team_logo: team.logo,
        })
      }
    })

    try {
      const res = await fetch('/api/knockout-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictions }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSaveChampion = async (team: TeamOption) => {
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

  // Only show tabs for stages that actually have matches
  const availableStages = KNOCKOUT_STAGES.filter(s => matches.some(m => m.stage === s))
  const stageMatches = matches.filter(m => m.stage === activeStage)
  const hasAnyKnockout = matches.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GitBranch className="w-6 h-6 text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Mata-mata</h1>
          <p className="text-sm text-gray-400">Preveja o caminho até a final</p>
        </div>
      </div>

      {locked ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm p-3 bg-white/5 rounded-lg border border-white/10">
          <Lock className="w-4 h-4" />
          Previsões de mata-mata bloqueadas
        </div>
      ) : (
        <div className="flex items-center gap-2 text-purple-400 text-sm p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <Info className="w-4 h-4 shrink-0" />
          Escolha o vencedor de cada confronto. Cada acerto vale 1 ponto extra. Finalistas: +2pts. Campeão: +10pts.
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 text-green-400 text-sm p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <Check className="w-4 h-4" />
          Previsões salvas!
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : !hasAnyKnockout ? (
        <div className="text-center py-12">
          <GitBranch className="w-10 h-10 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">Mata-mata ainda não disponível</p>
          <p className="text-gray-600 text-sm mt-1">Disponível após a fase de grupos</p>
        </div>
      ) : (
        <>
          {/* Stage tabs */}
          {availableStages.length > 1 && (
            <div className="relative">
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-[#060a0f] to-transparent" />
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide pr-6">
              {availableStages.map(s => (
                <button
                  key={s}
                  onClick={() => setActiveStage(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 border',
                    activeStage === s
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                      : 'bg-white/5 text-gray-400 hover:text-white border-white/10'
                  )}
                >
                  {STAGE_LABELS[s] ?? s}
                </button>
              ))}
            </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-white">{STAGE_LABELS[activeStage] ?? activeStage}</h2>
            </CardHeader>
            <CardContent className="p-0">
              {stageMatches.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  Jogos desta fase ainda não disponíveis
                </p>
              ) : (
                stageMatches.map(match => {
                  const predKey = `${match.stage}-${match.id}`
                  const selectedTeamId = myPredictions.get(predKey)

                  const homePT = translateTeamName(match.home_team_name)
                  const awayPT = translateTeamName(match.away_team_name)
                  const homeTeam: TeamOption = { id: match.home_team_id, name: homePT, logo: match.home_team_logo }
                  const awayTeam: TeamOption = { id: match.away_team_id, name: awayPT, logo: match.away_team_logo }

                  return (
                    <div key={match.id} className="p-4 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handlePickWinner(match.stage, match.id, homeTeam)}
                          disabled={locked}
                          className={cn(
                            'flex-1 flex items-center gap-2 p-3 rounded-xl border transition-all',
                            selectedTeamId === match.home_team_id
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10',
                            locked ? 'cursor-default' : 'cursor-pointer'
                          )}
                        >
                          {match.home_team_logo && (
                            <Image src={match.home_team_logo} alt={homePT} width={28} height={28} className="object-contain" />
                          )}
                          <span className="text-sm font-medium">{homePT}</span>
                          {selectedTeamId === match.home_team_id && <Check className="w-3 h-3 ml-auto" />}
                        </button>

                        <span className="text-gray-500 text-sm font-bold shrink-0">VS</span>

                        <button
                          onClick={() => handlePickWinner(match.stage, match.id, awayTeam)}
                          disabled={locked}
                          className={cn(
                            'flex-1 flex items-center gap-2 p-3 rounded-xl border transition-all',
                            selectedTeamId === match.away_team_id
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10',
                            locked ? 'cursor-default' : 'cursor-pointer'
                          )}
                        >
                          {match.away_team_logo && (
                            <Image src={match.away_team_logo} alt={awayPT} width={28} height={28} className="object-contain" />
                          )}
                          <span className="text-sm font-medium">{awayPT}</span>
                          {selectedTeamId === match.away_team_id && <Check className="w-3 h-3 ml-auto" />}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Champion prediction */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <h2 className="text-sm font-semibold text-white">Campeão da Copa</h2>
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
                      <p className="text-white font-semibold">{championPred.name}</p>
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
                    {locked
                      ? 'Prazo encerrado'
                      : 'Escolha o campeão clicando em um time abaixo:'}
                  </p>
                  {!locked && stageMatches.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from(new Map(
                        stageMatches.flatMap(m => [
                          [`${m.home_team_id}`, { id: m.home_team_id, name: m.home_team_name, logo: m.home_team_logo }],
                          [`${m.away_team_id}`, { id: m.away_team_id, name: m.away_team_name, logo: m.away_team_logo }],
                        ])
                      ).values()).map(team => (
                        <button
                          key={team.id}
                          onClick={() => handleSaveChampion(team)}
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

          {!locked && (
            <Button onClick={handleSaveKnockout} loading={saving} fullWidth>
              Salvar Previsões
            </Button>
          )}
        </>
      )}
    </div>
  )
}
