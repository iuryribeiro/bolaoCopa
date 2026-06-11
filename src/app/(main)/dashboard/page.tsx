import { createClient } from '@/lib/supabase/server'
import { MatchCard } from '@/components/matches/MatchCard'
import { RankingTable } from '@/components/ranking/RankingTable'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Trophy, Calendar, Star, TrendingUp, Bell } from 'lucide-react'
import Link from 'next/link'
import { isMatchLive, isMatchFinished, formatMatchDate } from '@/lib/utils'
import { LiveRefresher } from '@/components/LiveRefresher'
import type { Match, Prediction, RankingEntry } from '@/types'

export const revalidate = 60

async function getDashboardData(userId: string) {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()

  const [
    liveResult,
    upcomingResult,
    recentResult,
    rankingResult,
    profileResult,
    pendingResult,
    potentialLiveResult,
  ] = await Promise.all([
    supabase.from('matches').select('*').in('status', ['1H', 'HT', '2H', 'ET', 'P', 'BT']).order('match_date'),
    supabase.from('matches').select('*').eq('status', 'NS').gte('match_date', now).order('match_date').limit(5),
    supabase.from('matches').select('*').in('status', ['FT', 'AET', 'PEN']).order('match_date', { ascending: false }).limit(5),
    supabase.from('user_profiles').select('user_id, name, avatar_url, total_points, exact_scores, correct_winners, bonus_points').order('total_points', { ascending: false }).limit(10),
    supabase.from('user_profiles').select('*').eq('user_id', userId).single(),
    supabase.from('matches').select('id, match_date, home_team_name, away_team_name, home_team_logo, away_team_logo').eq('status', 'NS').gte('match_date', now).order('match_date').limit(20),
    // Jogos NS que deveriam ter começado há até 3h (free tier: ficam como NS durante o jogo)
    supabase.from('matches').select('id').eq('status', 'NS').gte('match_date', threeHoursAgo).lte('match_date', now).limit(1),
  ])

  // Palpites do usuário
  const matchIds = [
    ...(liveResult.data || []).map((m: Match) => m.id),
    ...(upcomingResult.data || []).map((m: Match) => m.id),
    ...(recentResult.data || []).map((m: Match) => m.id),
  ]

  const { data: predictions } = matchIds.length > 0
    ? await supabase.from('predictions').select('*').eq('user_id', userId).in('match_id', matchIds)
    : { data: [] }

  // Jogos sem palpite
  const pendingMatchIds = (pendingResult.data || []).map((m: { id: string }) => m.id)
  const { data: myPredictions } = pendingMatchIds.length > 0
    ? await supabase.from('predictions').select('match_id').eq('user_id', userId).in('match_id', pendingMatchIds)
    : { data: [] }

  const predictedMatchIds = new Set((myPredictions || []).map((p: { match_id: string }) => p.match_id))
  const pendingPredictions = (pendingResult.data || []).filter((m: { id: string }) => !predictedMatchIds.has(m.id))

  const predMap = new Map((predictions || []).map((p: Prediction) => [p.match_id, p]))

  const ranking: RankingEntry[] = (rankingResult.data || []).map((u, i) => ({
    position: i + 1,
    ...u,
    predictions_count: 0,
  }))

  return {
    live: liveResult.data || [],
    upcoming: upcomingResult.data || [],
    recent: recentResult.data || [],
    ranking,
    profile: profileResult.data,
    predMap,
    pendingCount: pendingPredictions.length,
    hasPotentialLive: (potentialLiveResult.data?.length ?? 0) > 0,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { live, upcoming, recent, ranking, profile, predMap, pendingCount, hasPotentialLive } = await getDashboardData(user.id)

  // Posição do usuário no ranking
  const myRankPosition = ranking.findIndex(r => r.user_id === user.id) + 1

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Olá, {profile?.name?.split(' ')[0] || 'Jogador'}!
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Copa do Mundo FIFA 2026</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-emerald-400">{profile?.total_points || 0}</div>
          <div className="text-xs text-gray-500">pontos totais</div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-gradient-to-br from-yellow-500/15 to-amber-600/5 border-yellow-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-500/25 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">
                {myRankPosition > 0 ? `${myRankPosition}º` : '--'}
              </div>
              <div className="text-xs text-yellow-400/70">Posição</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-500/15 to-teal-600/5 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/25 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{profile?.exact_scores || 0}</div>
              <div className="text-xs text-emerald-400/70">Exatos</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-500/15 to-indigo-600/5 border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/25 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{profile?.correct_winners || 0}</div>
              <div className="text-xs text-blue-400/70">Vencedores</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-500/15 to-red-600/5 border-orange-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/25 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{pendingCount}</div>
              <div className="text-xs text-orange-400/70">Sem palpite</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending predictions alert */}
      {pendingCount > 0 && (
        <Link href="/jogos">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-3 hover:bg-orange-500/15 transition-all cursor-pointer">
            <Bell className="w-5 h-5 text-orange-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-300">
                Você tem {pendingCount} jogo{pendingCount > 1 ? 's' : ''} sem palpite!
              </p>
              <p className="text-xs text-orange-400/70 mt-0.5">Toque para ver os jogos e fazer seus palpites</p>
            </div>
            <Badge variant="yellow">{pendingCount}</Badge>
          </div>
        </Link>
      )}

      {/* Polling silencioso durante jogos (free tier: status fica NS até terminar) */}
      {hasPotentialLive && live.length === 0 && (
        <LiveRefresher intervalSeconds={60} active={true} />
      )}

      <div className="grid lg:grid-cols-3 gap-6 pt-2">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live matches */}
          {live.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="live">AO VIVO</Badge>
                  <h2 className="text-sm font-semibold text-white">Agora</h2>
                </div>
                <LiveRefresher intervalSeconds={60} active={true} />
              </div>
              <div className="space-y-3">
                {live.map((match: Match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={predMap.get(match.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-semibold text-white">Próximos Jogos</h2>
                </div>
                <Link href="/jogos" className="text-xs text-emerald-400 hover:text-emerald-300">
                  Ver todos →
                </Link>
              </div>
              <div className="space-y-3">
                {upcoming.slice(0, 3).map((match: Match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={predMap.get(match.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Recent results */}
          {recent.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Últimos Resultados</h2>
                <Link href="/jogos?status=finished" className="text-xs text-emerald-400 hover:text-emerald-300">
                  Ver todos →
                </Link>
              </div>
              <div className="space-y-3">
                {recent.slice(0, 3).map((match: Match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={predMap.get(match.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {live.length === 0 && upcoming.length === 0 && recent.length === 0 && (
            <Card className="p-8 text-center">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">Nenhum jogo ainda.</p>
              <p className="text-gray-600 text-sm mt-1">Os jogos aparecerão aqui quando forem sincronizados.</p>
            </Card>
          )}
        </div>

        {/* Right Column: Ranking */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <h2 className="text-sm font-semibold text-white">Ranking</h2>
                </div>
                <Link href="/ranking" className="text-xs text-emerald-400 hover:text-emerald-300">
                  Ver completo →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <RankingTable ranking={ranking.slice(0, 5)} currentUserId={user.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
