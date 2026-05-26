import { Trophy, Medal, Star } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { cn } from '@/lib/utils'
import type { RankingEntry } from '@/types'

interface RankingTableProps {
  ranking: RankingEntry[]
  currentUserId?: string
}

const positionIcons = [
  <Trophy key={1} className="w-4 h-4 text-yellow-400" />,
  <Medal key={2} className="w-4 h-4 text-gray-300" />,
  <Medal key={3} className="w-4 h-4 text-amber-600" />,
]

export function RankingTable({ ranking, currentUserId }: RankingTableProps) {
  return (
    <div className="space-y-2">
      {ranking.map((entry, index) => {
        const isCurrentUser = entry.user_id === currentUserId
        const isTop3 = index < 3

        return (
          <div
            key={entry.user_id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl border transition-all',
              isCurrentUser
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : isTop3
                  ? 'bg-white/8 border-white/15'
                  : 'bg-white/5 border-white/10'
            )}
          >
            {/* Position */}
            <div className="w-7 flex items-center justify-center shrink-0">
              {index < 3 ? (
                positionIcons[index]
              ) : (
                <span className="text-sm font-bold text-gray-500">{entry.position}</span>
              )}
            </div>

            {/* Avatar */}
            <Avatar src={entry.avatar_url} name={entry.name} size="sm" />

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'text-sm font-medium truncate',
                  isCurrentUser ? 'text-emerald-400' : 'text-white'
                )}>
                  {entry.name}
                </span>
                {isCurrentUser && (
                  <span className="text-xs text-emerald-500 shrink-0">(você)</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                <span title="Placares exatos">{entry.exact_scores} exatos</span>
                <span title="Vencedores corretos">{entry.correct_winners} vencedores</span>
                {entry.bonus_points > 0 && (
                  <span className="text-purple-400" title="Pontos bônus">
                    +{entry.bonus_points} bônus
                  </span>
                )}
              </div>
            </div>

            {/* Points */}
            <div className="text-right shrink-0">
              <div className={cn(
                'text-lg font-bold',
                isTop3 ? 'text-yellow-400' : isCurrentUser ? 'text-emerald-400' : 'text-white'
              )}>
                {entry.total_points}
              </div>
              <div className="text-xs text-gray-500">pts</div>
            </div>
          </div>
        )
      })}

      {ranking.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum resultado ainda</p>
        </div>
      )}
    </div>
  )
}
