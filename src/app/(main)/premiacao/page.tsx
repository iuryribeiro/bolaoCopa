import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { Trophy, Medal, Users, DollarSign, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

export const revalidate = 60

const ENTRY_FEE = 100
const PRIZE_SPLIT = [0.60, 0.25, 0.15]

export default async function PremiacaoPage() {
  const supabase = await createClient()

  const [profilesRes, rankingRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('user_id, name, avatar_url, total_points, payment_confirmed')
      .order('total_points', { ascending: false }),
    supabase
      .from('user_profiles')
      .select('user_id, name, avatar_url, total_points, exact_scores, correct_winners')
      .eq('payment_confirmed', true)
      .order('total_points', { ascending: false })
      .limit(10),
  ])

  const allProfiles = profilesRes.data || []
  const confirmed = allProfiles.filter(p => p.payment_confirmed)
  const pending = allProfiles.filter(p => !p.payment_confirmed)
  const ranking = rankingRes.data || []

  const totalPool = confirmed.length * ENTRY_FEE
  const prizes = PRIZE_SPLIT.map(pct => Math.floor(totalPool * pct))

  const podium = ranking.slice(0, 3)

  const podiumConfig = [
    { position: 1, label: '1º Lugar', color: 'from-yellow-500 to-amber-400', border: 'border-yellow-500/40', bg: 'bg-yellow-500/10', textColor: 'text-yellow-400', icon: Crown, height: 'h-24' },
    { position: 2, label: '2º Lugar', color: 'from-gray-400 to-gray-300',    border: 'border-gray-400/40',   bg: 'bg-gray-400/10',   textColor: 'text-gray-300',   icon: Medal,  height: 'h-16' },
    { position: 3, label: '3º Lugar', color: 'from-amber-700 to-amber-600',  border: 'border-amber-700/40',  bg: 'bg-amber-700/10',  textColor: 'text-amber-600',  icon: Medal,  height: 'h-12' },
  ]

  // Reordenar pódio: 2 - 1 - 3
  const podiumOrder = [1, 0, 2]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-yellow-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Premiação</h1>
          <p className="text-sm text-gray-400">Copa do Mundo FIFA 2026</p>
        </div>
      </div>

      {/* Caixa do bolão */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-400">
                R$ {totalPool.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500">Prêmio total</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-blue-500/5 border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-blue-400">{confirmed.length}</p>
              <p className="text-xs text-gray-500">
                confirmados
                {pending.length > 0 && <span className="text-orange-400 ml-1">· {pending.length} pendentes</span>}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Distribuição */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold text-white mb-3">Distribuição dos Prêmios</h2>
        <div className="space-y-2">
          {podiumConfig.map((cfg, i) => {
            const Icon = cfg.icon
            return (
              <div key={i} className={cn('flex items-center gap-3 p-3 rounded-xl border', cfg.bg, cfg.border)}>
                <div className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0', cfg.color)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{cfg.label}</p>
                  <p className="text-xs text-gray-500">{PRIZE_SPLIT[i] * 100}% do total</p>
                </div>
                <p className={cn('text-lg font-bold', cfg.textColor)}>
                  R$ {prizes[i].toLocaleString('pt-BR')}
                </p>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-600 text-center mt-3">
          R$ {ENTRY_FEE} por participante · {confirmed.length} confirmados
        </p>
      </Card>

      {/* Pódio atual */}
      {podium.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white mb-4">Pódio Atual</h2>
          <div className="flex items-end justify-center gap-2">
            {podiumOrder.map(idx => {
              const cfg = podiumConfig[idx]
              const player = podium[idx]
              if (!player) return <div key={idx} className="flex-1" />
              const Icon = cfg.icon

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  {/* Avatar + info */}
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn('p-0.5 rounded-full bg-gradient-to-br', cfg.color)}>
                      <Avatar src={player.avatar_url} name={player.name} size="md" />
                    </div>
                    <p className="text-xs font-semibold text-white text-center leading-tight px-1 truncate w-full text-center">
                      {player.name.split(' ')[0]}
                    </p>
                    <p className={cn('text-sm font-bold', cfg.textColor)}>{player.total_points} pts</p>
                    <p className="text-xs font-bold text-emerald-400">
                      R$ {prizes[idx].toLocaleString('pt-BR')}
                    </p>
                  </div>

                  {/* Barra do pódio */}
                  <div className={cn(
                    'w-full rounded-t-xl flex flex-col items-center justify-center gap-1 border-t border-x',
                    cfg.height,
                    cfg.bg,
                    cfg.border
                  )}>
                    <Icon className={cn('w-5 h-5', cfg.textColor)} />
                    <span className={cn('text-xs font-bold', cfg.textColor)}>{cfg.position}º</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Ranking completo dos confirmados */}
      {ranking.length > 3 && (
        <Card>
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white">Classificação Geral</h2>
          </div>
          <div className="divide-y divide-white/5">
            {ranking.map((p, i) => (
              <div key={p.user_id} className={cn(
                'flex items-center gap-3 px-4 py-3',
                i < 3 ? 'bg-white/[0.02]' : ''
              )}>
                <span className={cn(
                  'text-sm font-bold w-6 text-center shrink-0',
                  i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-600'
                )}>
                  {i + 1}
                </span>
                <Avatar src={p.avatar_url} name={p.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.exact_scores} exatos · {p.correct_winners} vencedores</p>
                </div>
                <p className="text-sm font-bold text-emerald-400 shrink-0">{p.total_points} pts</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Participantes confirmados */}
      {confirmed.length > 0 && (
        <Card>
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Participantes Confirmados</h2>
              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{confirmed.length}</span>
            </div>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {confirmed.map(p => (
              <div key={p.user_id} className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/10">
                <Avatar src={p.avatar_url} name={p.name} size="xs" />
                <span className="text-xs text-gray-300">{p.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pendentes */}
      {pending.length > 0 && (
        <Card className="border-orange-500/20">
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Aguardando Confirmação</h2>
              <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">{pending.length}</span>
            </div>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {pending.map(p => (
              <div key={p.user_id} className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5 border border-orange-500/10 opacity-60">
                <Avatar src={p.avatar_url} name={p.name} size="xs" />
                <span className="text-xs text-gray-400">{p.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
