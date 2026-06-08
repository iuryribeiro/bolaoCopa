'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Users, TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/Loading'
import { translateTeamName } from '@/lib/team-names'
import { cn } from '@/lib/utils'

interface TeamRow {
  position: number
  team_id: number
  team_name: string
  team_logo: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_diff: number
  points: number
}

interface GroupStanding {
  group: string
  table: TeamRow[]
}

export default function ClassificadosPage() {
  const [standings, setStandings] = useState<GroupStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/classificados')
      .then(r => r.json())
      .then(data => {
        setStandings(data.standings || [])
        if (data.error) setError(data.error)
      })
      .catch(() => setError('Erro ao carregar classificação'))
      .finally(() => setLoading(false))
  }, [])

  const groupLabel = (g: string) => `Grupo ${g.replace('Group ', '')}`

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Classificados</h1>
          <p className="text-sm text-gray-400">Calculado automaticamente pelos placares dos jogos</p>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40 border border-emerald-500/60 inline-block" />
          Classificado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500/30 border border-yellow-500/50 inline-block" />
          Possível 3º melhor
        </span>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error && standings.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">Classificação ainda não disponível</p>
          <p className="text-sm text-gray-600 mt-1">Sincronize os jogos e aguarde os primeiros resultados</p>
        </div>
      ) : standings.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">Nenhum resultado de jogo ainda</p>
          <p className="text-sm text-gray-600 mt-1">A tabela aparece automaticamente quando jogos forem encerrados</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {standings.map(({ group, table }) => (
            <Card key={group}>
              <CardHeader>
                <h3 className="text-sm font-semibold text-white">{groupLabel(group)}</h3>
              </CardHeader>
              <CardContent className="p-0">
                {/* Cabeçalho da tabela */}
                <div className="flex items-center px-3 py-1.5 border-b border-white/5 text-[10px] text-gray-600 font-medium">
                  <span className="w-5 shrink-0">#</span>
                  <span className="flex-1">Time</span>
                  <span className="w-6 text-center">J</span>
                  <span className="w-6 text-center">V</span>
                  <span className="w-6 text-center">E</span>
                  <span className="w-6 text-center">D</span>
                  <span className="w-8 text-center">SG</span>
                  <span className="w-8 text-center font-bold text-gray-400">Pts</span>
                </div>

                {table.map((team, idx) => {
                  const isQualified = idx < 2
                  const isThird = idx === 2
                  const namePT = translateTeamName(team.team_name)

                  return (
                    <div
                      key={team.team_id}
                      className={cn(
                        'flex items-center px-3 py-2.5 border-b border-white/5 last:border-0',
                        isQualified && 'bg-emerald-500/8 border-l-2 border-l-emerald-500/60',
                        isThird && 'bg-yellow-500/5 border-l-2 border-l-yellow-500/40',
                        !isQualified && !isThird && 'border-l-2 border-l-transparent'
                      )}
                    >
                      <span className={cn(
                        'w-5 shrink-0 text-xs font-bold',
                        isQualified ? 'text-emerald-400' : isThird ? 'text-yellow-400' : 'text-gray-600'
                      )}>
                        {team.position}
                      </span>

                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {team.team_logo ? (
                          <Image
                            src={team.team_logo}
                            alt={namePT}
                            width={20}
                            height={20}
                            className="object-contain shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-white/10 shrink-0" />
                        )}
                        <span className="text-sm text-white truncate">{namePT}</span>
                      </div>

                      <span className="w-6 text-center text-xs text-gray-400">{team.played}</span>
                      <span className="w-6 text-center text-xs text-gray-400">{team.won}</span>
                      <span className="w-6 text-center text-xs text-gray-400">{team.drawn}</span>
                      <span className="w-6 text-center text-xs text-gray-400">{team.lost}</span>
                      <span className={cn(
                        'w-8 text-center text-xs',
                        team.goal_diff > 0 ? 'text-emerald-400' : team.goal_diff < 0 ? 'text-red-400' : 'text-gray-400'
                      )}>
                        {team.goal_diff > 0 ? `+${team.goal_diff}` : team.goal_diff}
                      </span>
                      <span className={cn(
                        'w-8 text-center text-xs font-bold',
                        isQualified ? 'text-emerald-400' : 'text-white'
                      )}>
                        {team.points}
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
