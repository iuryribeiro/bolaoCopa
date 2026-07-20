'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Trophy, Star, Crown, Medal } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'

interface RankingEntry {
  user_id: string
  name: string
  avatar_url: string | null
  total_points: number
  exact_scores: number
  correct_winners: number
  bonus_points: number
}

function sortByRanking(list: RankingEntry[]): RankingEntry[] {
  return [...list].sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points
    const aGames = (a.exact_scores || 0) + (a.correct_winners || 0)
    const bGames = (b.exact_scores || 0) + (b.correct_winners || 0)
    if (bGames !== aGames) return bGames - aGames
    return a.name.localeCompare(b.name, 'pt-BR')
  })
}

export default function HomenagemPage() {
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    fetch('/api/ranking')
      .then(r => r.json())
      .then(d => {
        const sorted = sortByRanking(d.ranking || [])
        setRanking(sorted)
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false)
        setTimeout(() => setVisible(true), 100)
      })
  }, [])

  const campeao = ranking[0]
  const segundo = ranking[1]
  const terceiro = ranking[2]

  return (
    <div className="max-w-2xl mx-auto space-y-0">

      {/* Hero — imagem do campeão */}
      <div className="relative rounded-2xl overflow-hidden">
        <Image
          src="/campeao.jpg"
          alt="Campeão da Copa"
          width={800}
          height={500}
          className="w-full object-cover"
          priority
        />
        {/* Overlay escuro na parte de baixo */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Estrelas decorativas */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <Star
              key={i}
              className="absolute text-yellow-400 animate-pulse"
              style={{
                width: `${8 + (i % 3) * 4}px`,
                height: `${8 + (i % 3) * 4}px`,
                top: `${10 + (i * 7) % 60}%`,
                left: `${5 + (i * 13) % 90}%`,
                animationDelay: `${(i * 0.3) % 2}s`,
                opacity: 0.6 + (i % 3) * 0.15,
              }}
            />
          ))}
        </div>

        {/* Texto sobre a imagem */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
          <p className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-1">
            Copa do Mundo FIFA 2026
          </p>
          <h1 className="text-white text-2xl font-black drop-shadow-lg">
            Campeão do Bolão
          </h1>
        </div>
      </div>

      {/* Card do campeão */}
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : campeao && (
        <div
          className={cn(
            'relative mt-[-1px] bg-gradient-to-b from-black to-[#0d1f3c] border-x border-b border-yellow-500/30 rounded-b-2xl pb-8 pt-6 px-6 text-center transition-all duration-700',
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          )}
        >
          {/* Coroa */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-yellow-400/20 blur-xl scale-150" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-amber-400 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                <Crown className="w-10 h-10 text-white drop-shadow" />
              </div>
            </div>
          </div>

          <p className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-3">
            🏆 Parabéns, campeão! 🏆
          </p>

          {/* Avatar + nome */}
          <div className="flex flex-col items-center gap-3 mb-5">
            <div className="p-1 rounded-full bg-gradient-to-br from-yellow-500 to-amber-400 shadow-lg shadow-yellow-500/20">
              <Avatar src={campeao.avatar_url} name={campeao.name} size="lg" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white">{campeao.name}</h2>
              <p className="text-gray-400 text-sm mt-0.5">Vencedor do Bolão da Copa 2026</p>
            </div>
          </div>

          {/* Pontuação */}
          <div className="inline-flex items-end gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-8 py-4 mb-5">
            <span className="text-5xl font-black text-yellow-400 leading-none">{campeao.total_points}</span>
            <span className="text-yellow-600 font-semibold pb-1">pontos</span>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-6 text-center mb-6">
            <div>
              <p className="text-2xl font-bold text-white">{campeao.exact_scores}</p>
              <p className="text-xs text-gray-500">placares exatos</p>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <p className="text-2xl font-bold text-white">{campeao.correct_winners}</p>
              <p className="text-xs text-gray-500">vencedores certos</p>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <p className="text-2xl font-bold text-white">{(campeao.exact_scores || 0) + (campeao.correct_winners || 0)}</p>
              <p className="text-xs text-gray-500">jogos acertados</p>
            </div>
          </div>

          {campeao.bonus_points > 0 && (
            <p className="text-sm text-purple-400 mb-4">
              +{campeao.bonus_points} pontos bônus (artilheiro, campeão, classificados…)
            </p>
          )}
        </div>
      )}

      {/* Pódio completo */}
      {(segundo || terceiro) && (
        <div
          className={cn(
            'mt-6 space-y-2 transition-all duration-700 delay-300',
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          )}
        >
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest text-center mb-3">
            Pódio Final
          </p>

          {[
            { entry: segundo, pos: 2, color: 'text-gray-300', bg: 'bg-gray-400/10', border: 'border-gray-400/20', icon: Medal },
            { entry: terceiro, pos: 3, color: 'text-amber-600', bg: 'bg-amber-700/10', border: 'border-amber-700/20', icon: Medal },
          ].filter(r => r.entry).map(({ entry, pos, color, bg, border, icon: Icon }) => (
            <div key={pos} className={cn('flex items-center gap-3 p-3 rounded-xl border', bg, border)}>
              <div className={cn('w-7 text-center font-bold text-sm', color)}>
                <Icon className="w-4 h-4 mx-auto" />
              </div>
              <Avatar src={entry!.avatar_url} name={entry!.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{entry!.name}</p>
                <p className="text-xs text-gray-500">
                  {(entry!.exact_scores || 0) + (entry!.correct_winners || 0)} jogos certos
                </p>
              </div>
              <p className={cn('text-base font-bold shrink-0', color)}>{entry!.total_points} pts</p>
            </div>
          ))}
        </div>
      )}

      {/* Rodapé */}
      <div
        className={cn(
          'mt-8 text-center transition-all duration-700 delay-500',
          visible ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="flex justify-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Trophy key={i} className="w-4 h-4 text-yellow-500/40 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
        <p className="text-xs text-gray-600">Bolão da Copa do Mundo FIFA 2026</p>
      </div>

    </div>
  )
}
