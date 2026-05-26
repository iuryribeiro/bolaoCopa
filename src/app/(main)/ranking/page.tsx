import { createClient } from '@/lib/supabase/server'
import { RankingTable } from '@/components/ranking/RankingTable'
import { Card, CardContent } from '@/components/ui/Card'
import { Trophy, Users, Star } from 'lucide-react'
import type { RankingEntry } from '@/types'

export const revalidate = 60

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rankingData } = await supabase
    .from('user_profiles')
    .select('user_id, name, avatar_url, total_points, exact_scores, correct_winners, bonus_points')
    .order('total_points', { ascending: false })
    .order('exact_scores', { ascending: false })
    .order('name', { ascending: true })

  const ranking: RankingEntry[] = (rankingData || []).map((u, i) => ({
    position: i + 1,
    ...u,
    predictions_count: 0,
  }))

  const myPosition = ranking.findIndex(r => r.user_id === user?.id) + 1
  const myEntry = ranking.find(r => r.user_id === user?.id)

  const totalParticipants = ranking.length
  const leader = ranking[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-yellow-400" />
        <h1 className="text-2xl font-bold text-white">Ranking</h1>
      </div>

      {/* My position card */}
      {myEntry && (
        <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-black text-emerald-400">{myPosition}º</div>
              <div>
                <p className="text-white font-medium text-sm">Sua posição</p>
                <p className="text-xs text-gray-400">
                  {myEntry.exact_scores} exatos · {myEntry.correct_winners} vencedores
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-400">{myEntry.total_points}</div>
              <div className="text-xs text-gray-500">pontos</div>
            </div>
          </div>
          {leader && user?.id !== leader.user_id && (
            <div className="mt-3 pt-3 border-t border-emerald-500/20 text-xs text-gray-400">
              Faltam <span className="text-emerald-400 font-semibold">{leader.total_points - myEntry.total_points} pts</span> para alcançar o líder
            </div>
          )}
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">{totalParticipants}</div>
            <div className="text-xs text-gray-500">Participantes</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Star className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">{leader?.total_points || 0}</div>
            <div className="text-xs text-gray-500">Maior pontuação</div>
          </div>
        </Card>
      </div>

      {/* Full ranking */}
      <Card>
        <CardContent className="p-4">
          <RankingTable ranking={ranking} currentUserId={user?.id} />
        </CardContent>
      </Card>
    </div>
  )
}
