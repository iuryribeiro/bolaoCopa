'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Swords, Target, Check, X, Trophy, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/Loading'
import { translateTeamName } from '@/lib/team-names'
import { cn } from '@/lib/utils'

interface ScorerPlayer {
  player: {
    id: string | number
    name: string
    photo: string | null
    nationality: string | null
    position: string | null
  }
  statistics: Array<{
    team: { id: number | null; name: string | null; logo: string | null }
    goals: { total: number | null; assists: number | null }
    games: { appearences: number | null; minutes: number | null }
  }>
}

export default function ArtilheirosPage() {
  const [allPlayers, setAllPlayers] = useState<ScorerPlayer[]>([])
  const [filtered, setFiltered] = useState<ScorerPlayer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [myPrediction, setMyPrediction] = useState<{
    player_id: string | number
    player_name: string
    team_name: string | null
    player_photo: string | null
    is_correct: boolean | null
    points: number
  } | null>(null)
  const [savingPrediction, setSavingPrediction] = useState(false)
  const [predictionSaved, setPredictionSaved] = useState(false)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [playersRes, predRes, settingsRes] = await Promise.all([
          fetch('/api/football/players'),
          fetch('/api/top-scorer-prediction'),
          fetch('/api/competition-settings'),
        ])

        const playersData = await playersRes.json()
        const predData = await predRes.json()
        const settingsData = await settingsRes.json()

        setAllPlayers(playersData.players || [])
        setFiltered(playersData.players || [])
        setMyPrediction(predData.prediction || null)
        setLocked(settingsData.settings?.top_scorer_prediction_locked || false)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(allPlayers)
      return
    }
    const q = search.toLowerCase()
    setFiltered(allPlayers.filter(p =>
      p.player.name.toLowerCase().includes(q) ||
      (p.statistics[0]?.team?.name && translateTeamName(p.statistics[0].team.name).toLowerCase().includes(q))
    ))
  }, [search, allPlayers])

  const handlePickScorer = async (player: ScorerPlayer) => {
    if (locked) return
    setSavingPrediction(true)
    try {
      const stats = player.statistics[0]
      const res = await fetch('/api/top-scorer-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: player.player.id,
          player_name: player.player.name,
          player_photo: player.player.photo,
          team_id: stats?.team?.id,
          team_name: stats?.team?.name,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMyPrediction(data.prediction)
        setPredictionSaved(true)
        setTimeout(() => setPredictionSaved(false), 3000)
      }
    } finally {
      setSavingPrediction(false)
    }
  }

  const tournamentStarted = allPlayers.some(p => (p.statistics[0]?.goals?.total ?? 0) > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Swords className="w-6 h-6 text-orange-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Artilheiros</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {tournamentStarted ? 'Ranking ao vivo da Copa' : 'Jogadores esperados na Copa 2026'}
          </p>
        </div>
      </div>

      {/* Minha previsão */}
      {myPrediction && (
        <Card className="p-4 bg-purple-500/10 border-purple-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {myPrediction.player_photo ? (
                <Image
                  src={myPrediction.player_photo}
                  alt={myPrediction.player_name}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold">
                  {myPrediction.player_name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-white font-semibold text-sm">{myPrediction.player_name}</p>
                <p className="text-xs text-gray-400">
                  {myPrediction.team_name ? translateTeamName(myPrediction.team_name) : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {myPrediction.is_correct === true && <Badge variant="green">+5pts · Correto!</Badge>}
              {myPrediction.is_correct === false && <Badge variant="red">Errou</Badge>}
              {myPrediction.is_correct === null && (
                <div className="flex items-center gap-1.5 text-xs text-purple-400">
                  <Trophy className="w-3 h-3" />
                  Minha escolha
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {predictionSaved && (
        <div className="flex items-center gap-2 text-green-400 text-sm p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <Check className="w-4 h-4" />
          Artilheiro escolhido com sucesso!
        </div>
      )}

      {locked && (
        <div className="flex items-center gap-2 text-gray-400 text-sm p-3 bg-white/5 rounded-lg border border-white/10">
          <X className="w-4 h-4" />
          Prazo para escolha do artilheiro encerrado
        </div>
      )}

      {!tournamentStarted && !locked && (
        <div className="flex items-start gap-2 text-orange-400/80 text-xs p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
          <Trophy className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Copa ainda não começou — escolha agora quem você acredita que vai ser o artilheiro!
          A lista de gols será atualizada durante o torneio.
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar jogador ou seleção..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition-all text-sm"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-10 h-10 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">Nenhum jogador encontrado</p>
            </div>
          ) : (
            filtered.map((player, index) => {
              const stats = player.statistics[0]
              const goals = stats?.goals?.total ?? 0
              const assists = stats?.goals?.assists ?? 0
              const appearances = stats?.games?.appearences ?? 0
              const teamNamePT = stats?.team?.name ? translateTeamName(stats.team.name) : ''
              const isMyPick = String(myPrediction?.player_id) === String(player.player.id)

              return (
                <Card
                  key={player.player.id}
                  hover={!locked}
                  className={cn(isMyPick ? 'border-purple-500/40 bg-purple-500/5' : '')}
                >
                  <div className="p-3 flex items-center gap-2">
                    {/* Posição */}
                    <div className="w-5 text-center shrink-0">
                      {tournamentStarted && goals > 0 ? (
                        <span className={cn(
                          'text-sm font-bold',
                          index === 0 ? 'text-yellow-400' :
                          index === 1 ? 'text-gray-300' :
                          index === 2 ? 'text-amber-600' :
                          'text-gray-500'
                        )}>
                          {index + 1}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </div>

                    {/* Foto */}
                    <div className="shrink-0">
                      {player.player.photo ? (
                        <Image
                          src={player.player.photo}
                          alt={player.player.name}
                          width={36}
                          height={36}
                          className="rounded-full object-cover w-9 h-9"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-gray-400 text-xs font-semibold">
                          {player.player.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-white truncate">{player.player.name}</p>
                        {isMyPick && <Badge variant="blue" className="hidden sm:inline-flex">Minha escolha</Badge>}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {stats?.team?.logo && (
                          <Image src={stats.team.logo} alt={teamNamePT} width={12} height={12} className="object-contain shrink-0" />
                        )}
                        <p className="text-xs text-gray-400 truncate">{teamNamePT}</p>
                      </div>
                    </div>

                    {/* Stats (só mostra se a copa já começou) */}
                    {tournamentStarted && (
                      <div className="flex items-center gap-2 shrink-0 text-center">
                        <div>
                          <div className="text-sm font-bold text-orange-400">{goals}</div>
                          <div className="text-xs text-gray-500">gols</div>
                        </div>
                        {assists > 0 && (
                          <div className="hidden sm:block">
                            <div className="text-sm font-bold text-blue-400">{assists}</div>
                            <div className="text-xs text-gray-500">ass</div>
                          </div>
                        )}
                        {appearances > 0 && (
                          <div className="hidden sm:block">
                            <div className="text-sm font-bold text-gray-400">{appearances}</div>
                            <div className="text-xs text-gray-500">jogos</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botão escolher */}
                    {!locked && (
                      <Button
                        variant={isMyPick ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => handlePickScorer(player)}
                        loading={savingPrediction}
                        className="shrink-0 min-w-[44px]"
                      >
                        {isMyPick ? '✓' : 'Escolher'}
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })
          )}
        </div>
      )}

      <Card className="p-4">
        <p className="text-xs text-gray-500 text-center">
          Acerte o artilheiro da Copa e ganhe <span className="text-orange-400 font-semibold">5 pontos extras</span>
        </p>
      </Card>
    </div>
  )
}
