'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Swords, Search, Lock, Trophy, Users, Star, X } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingSpinner } from '@/components/ui/Loading'
import { translateTeamName } from '@/lib/team-names'
import { cn } from '@/lib/utils'

interface Player {
  id: string
  player_name: string
  team_name: string | null
  team_logo: string | null
  nationality: string | null
  position: string | null
  goals_scored: number
  assists: number
}

interface Prediction {
  user_id: string
  player_name: string
  team_name: string | null
  scorer_player_id: string | null
  player: { player_name: string; team_name: string | null; team_logo: string | null; goals_scored: number } | null
  profile: { name: string; avatar_url: string | null } | null
}

interface MyPrediction {
  scorer_player_id: string | null
  player_name: string
  team_name: string | null
  player: Player | null
}

type Tab = 'pick' | 'parcial' | 'galera'

export default function ArtilheirosPage() {
  const [locked, setLocked] = useState(true)
  const [myPrediction, setMyPrediction] = useState<MyPrediction | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [allPredictions, setAllPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('pick')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Player | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/predictions/top-scorer')
      .then(r => r.json())
      .then(data => {
        setLocked(data.locked ?? true)
        setMyPrediction(data.myPrediction ?? null)
        setPlayers(data.players ?? [])
        setAllPredictions(data.allPredictions ?? [])
        if (data.myPrediction?.player) {
          setSelected(data.myPrediction.player)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filteredPlayers = useMemo(() => {
    if (!search.trim()) return players
    const q = search.toLowerCase()
    return players.filter(p =>
      p.player_name.toLowerCase().includes(q) ||
      (p.team_name && translateTeamName(p.team_name).toLowerCase().includes(q))
    )
  }, [players, search])

  const scorers = useMemo(() =>
    players.filter(p => p.goals_scored > 0).sort((a, b) => b.goals_scored - a.goals_scored),
    [players]
  )

  async function handleSave() {
    if (!selected || locked) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/predictions/top-scorer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scorer_player_id: selected.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error || 'Erro ao salvar')
        return
      }
      setMyPrediction({
        scorer_player_id: selected.id,
        player_name: selected.player_name,
        team_name: selected.team_name,
        player: selected,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setSaveError('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  const hasPrediction = !!myPrediction?.scorer_player_id
  const isChanged = selected?.id !== myPrediction?.scorer_player_id

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pick', label: 'Meu palpite' },
    { key: 'parcial', label: `Parcial de gols${scorers.length > 0 ? ` (${scorers.length})` : ''}` },
    { key: 'galera', label: `Galera (${allPredictions.length})` },
  ]

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Swords className="w-6 h-6 text-yellow-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Artilheiro da Copa</h1>
          <p className="text-xs text-gray-500 mt-0.5">Quem vai ser o artilheiro do Mundial 2026?</p>
        </div>
      </div>

      {/* Lock banner */}
      {locked && (
        <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <Lock className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">Copa já começou — palpites encerrados.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2 rounded-full text-xs font-medium transition-all border',
              tab === key
                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                : 'bg-white/5 text-gray-400 hover:text-white border-white/10'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Meu palpite ── */}
      {tab === 'pick' && (
        <div className="space-y-4">
          {/* Current pick */}
          {selected ? (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400 font-medium">
                  {hasPrediction && !isChanged ? 'Sua escolha' : 'Selecionado'}
                </span>
                {hasPrediction && !isChanged && locked && (
                  <div className="flex items-center gap-1 text-xs text-red-400">
                    <Lock className="w-3 h-3" /> Bloqueado
                  </div>
                )}
                {hasPrediction && !isChanged && !locked && (
                  <Badge variant="yellow">Confirmado</Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                {selected.team_logo ? (
                  <Image
                    src={selected.team_logo}
                    alt={selected.team_name || ''}
                    width={44}
                    height={44}
                    className="object-contain shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold text-sm shrink-0">
                    {selected.player_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{selected.player_name}</p>
                  <p className="text-xs text-gray-400">
                    {selected.team_name ? translateTeamName(selected.team_name) : '—'}
                    {selected.position ? ` · ${selected.position}` : ''}
                  </p>
                </div>
                {selected.goals_scored > 0 && (
                  <div className="flex items-center gap-1 text-yellow-400 font-bold text-lg shrink-0">
                    ⚽ {selected.goals_scored}
                  </div>
                )}
              </div>

              {/* Save / cancel buttons (only when unlocked and changed) */}
              {!locked && isChanged && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-sm font-medium hover:bg-yellow-500/30 transition-all disabled:opacity-50"
                  >
                    {saving ? 'Salvando…' : 'Confirmar escolha'}
                  </button>
                  <button
                    onClick={() => setSelected(myPrediction?.player ?? null)}
                    className="px-3 py-2 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:text-white transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {saved && (
                <p className="mt-2 text-xs text-green-400 text-center">Palpite salvo com sucesso!</p>
              )}
              {saveError && (
                <p className="mt-2 text-xs text-red-400">{saveError}</p>
              )}
            </Card>
          ) : locked ? (
            <Card className="p-6 text-center">
              <Lock className="w-8 h-8 mx-auto mb-2 text-red-400/60" />
              <p className="text-sm text-gray-400">Você não fez seu palpite antes da Copa começar.</p>
            </Card>
          ) : (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3 text-sm text-yellow-400/70">
              Selecione um jogador abaixo para fazer seu palpite
            </div>
          )}

          {/* Player selection list (only visible when unlocked) */}
          {!locked && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar jogador ou seleção…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/40 text-sm"
                />
              </div>

              <div className="space-y-2">
                {filteredPlayers.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-6">Nenhum jogador encontrado</p>
                ) : (
                  filteredPlayers.map(player => (
                    <button
                      key={player.id}
                      onClick={() => setSelected(player)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                        selected?.id === player.id
                          ? 'bg-yellow-500/15 border-yellow-500/40'
                          : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
                      )}
                    >
                      {player.team_logo ? (
                        <Image
                          src={player.team_logo}
                          alt={player.team_name || ''}
                          width={32}
                          height={32}
                          className="object-contain shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-400 shrink-0">
                          {player.player_name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium truncate',
                          selected?.id === player.id ? 'text-yellow-400' : 'text-white'
                        )}>
                          {player.player_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {player.team_name ? translateTeamName(player.team_name) : ''}
                          {player.position ? ` · ${player.position}` : ''}
                        </p>
                      </div>
                      {player.goals_scored > 0 && (
                        <span className="text-xs text-yellow-400 font-medium shrink-0">
                          ⚽ {player.goals_scored}
                        </span>
                      )}
                      {selected?.id === player.id && (
                        <Star className="w-4 h-4 text-yellow-400 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          <Card className="p-4">
            <p className="text-xs text-gray-500 text-center">
              Acerte o artilheiro da Copa e ganhe{' '}
              <span className="text-yellow-400 font-semibold">5 pontos extras</span>
            </p>
          </Card>
        </div>
      )}

      {/* ── TAB: Parcial de gols ── */}
      {tab === 'parcial' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold text-white">Parcial de artilheiros</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {scorers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                Nenhum gol registrado ainda.
              </p>
            ) : (
              <div className="divide-y divide-white/5">
                {scorers.map((player, i) => (
                  <div key={player.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={cn(
                      'text-sm font-bold w-5 text-center shrink-0',
                      i === 0 ? 'text-yellow-400' :
                      i === 1 ? 'text-gray-300' :
                      i === 2 ? 'text-amber-600' :
                      'text-gray-600'
                    )}>
                      {i + 1}
                    </span>
                    {player.team_logo ? (
                      <Image
                        src={player.team_logo}
                        alt={player.team_name || ''}
                        width={28}
                        height={28}
                        className="object-contain shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white/10 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{player.player_name}</p>
                      <p className="text-xs text-gray-500">
                        {player.team_name ? translateTeamName(player.team_name) : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-yellow-400 font-bold">
                        ⚽ {player.goals_scored}
                      </span>
                      {player.assists > 0 && (
                        <span className="text-xs text-blue-400 hidden sm:inline">
                          {player.assists} ass
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB: O que a galera escolheu ── */}
      {tab === 'galera' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">
                Palpites da galera
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {allPredictions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                Nenhum palpite registrado ainda.
              </p>
            ) : (
              <div className="divide-y divide-white/5">
                {allPredictions.map((pred, i) => {
                  const playerName = pred.player?.player_name || pred.player_name
                  const teamName = pred.player?.team_name || pred.team_name
                  const goals = pred.player?.goals_scored ?? 0
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <Avatar
                        src={pred.profile?.avatar_url}
                        name={pred.profile?.name || 'U'}
                        size="sm"
                      />
                      <span className="text-sm text-white flex-1 min-w-0 truncate">
                        {pred.profile?.name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {pred.player?.team_logo && (
                          <Image
                            src={pred.player.team_logo}
                            alt=""
                            width={20}
                            height={20}
                            className="object-contain"
                          />
                        )}
                        <span className="text-sm text-yellow-400 font-medium">
                          {playerName}
                        </span>
                        {teamName && (
                          <span className="text-xs text-gray-500 hidden sm:inline">
                            · {translateTeamName(teamName)}
                          </span>
                        )}
                        {goals > 0 && (
                          <Badge variant="yellow">⚽ {goals}</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
