import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PredictionForm } from '@/components/matches/PredictionForm'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import {
  formatFullDate, getMatchStatusLabel, getStageLabel,
  getGroupLabel, isMatchLive, isMatchFinished
} from '@/lib/utils'
import { translateTeamName } from '@/lib/team-names'
import { MapPin, Clock, Users, ChevronLeft, ChevronRight, LayoutList } from 'lucide-react'
import type { Prediction } from '@/types'

export const revalidate = 30

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [matchResult, rulesResult, allPredictionsResult, myPredResult] = await Promise.all([
    supabase.from('matches').select('*').eq('id', id).single(),
    supabase.from('scoring_rules').select('*').eq('is_active', true).single(),
    supabase.from('predictions').select('*, user:user_profiles(name, avatar_url)').eq('match_id', id).order('points', { ascending: false }),
    supabase.from('predictions').select('*').eq('match_id', id).eq('user_id', user.id).maybeSingle(),
  ])

  if (matchResult.error || !matchResult.data) return notFound()

  const match = matchResult.data
  const rules = rulesResult.data
  const allPredictions: (Prediction & { user: { name: string; avatar_url: string | null } })[] = allPredictionsResult.data || []
  const myPrediction = myPredResult.data

  // Adjacent matches for navigation
  const [prevResult, nextResult] = await Promise.all([
    supabase.from('matches')
      .select('id, home_team_name, away_team_name, home_team_logo, away_team_logo')
      .lt('match_date', match.match_date)
      .order('match_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('matches')
      .select('id, home_team_name, away_team_name, home_team_logo, away_team_logo')
      .gt('match_date', match.match_date)
      .order('match_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  const prevMatch = prevResult.data
  const nextMatch = nextResult.data

  const live = isMatchLive(match.status)
  const finished = isMatchFinished(match.status)
  const hasScore = match.home_score !== null
  const homePT = translateTeamName(match.home_team_name)
  const awayPT = translateTeamName(match.away_team_name)

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Match Navigation */}
      <div className="flex items-center justify-between gap-2">
        {prevMatch ? (
          <Link
            href={`/jogos/${prevMatch.id}`}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors py-1.5 group min-w-0"
          >
            <ChevronLeft className="w-4 h-4 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
            <div className="flex items-center gap-1.5 min-w-0 hidden sm:flex">
              {prevMatch.home_team_logo && (
                <Image src={prevMatch.home_team_logo} alt="" width={16} height={16} className="object-contain shrink-0" />
              )}
              <span className="truncate max-w-[90px]">{translateTeamName(prevMatch.home_team_name)}</span>
              <span className="text-gray-700">×</span>
              <span className="truncate max-w-[90px]">{translateTeamName(prevMatch.away_team_name)}</span>
              {prevMatch.away_team_logo && (
                <Image src={prevMatch.away_team_logo} alt="" width={16} height={16} className="object-contain shrink-0" />
              )}
            </div>
            <span className="sm:hidden">Anterior</span>
          </Link>
        ) : (
          <div />
        )}

        <Link
          href="/jogos"
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1 shrink-0"
        >
          <LayoutList className="w-3 h-3" />
          <span>Jogos</span>
        </Link>

        {nextMatch ? (
          <Link
            href={`/jogos/${nextMatch.id}`}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors py-1.5 group min-w-0"
          >
            <div className="flex items-center gap-1.5 min-w-0 hidden sm:flex">
              {nextMatch.home_team_logo && (
                <Image src={nextMatch.home_team_logo} alt="" width={16} height={16} className="object-contain shrink-0" />
              )}
              <span className="truncate max-w-[90px]">{translateTeamName(nextMatch.home_team_name)}</span>
              <span className="text-gray-700">×</span>
              <span className="truncate max-w-[90px]">{translateTeamName(nextMatch.away_team_name)}</span>
              {nextMatch.away_team_logo && (
                <Image src={nextMatch.away_team_logo} alt="" width={16} height={16} className="object-contain shrink-0" />
              )}
            </div>
            <span className="sm:hidden">Próximo</span>
            <ChevronRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ) : (
          <div />
        )}
      </div>

      {/* Match Header */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        {/* Status */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-400">
            {getGroupLabel(match.group_name) || getStageLabel(match.stage)}
          </span>
          {live ? (
            <Badge variant="live">AO VIVO {match.elapsed ? `${match.elapsed}'` : ''}</Badge>
          ) : finished ? (
            <Badge variant="gray">Encerrado</Badge>
          ) : (
            <Badge variant="blue">
              <Clock className="w-3 h-3" />
              {getMatchStatusLabel(match.status)}
            </Badge>
          )}
        </div>

        {/* Teams & Score */}
        <div className="flex items-center justify-between gap-2">
          {/* Home */}
          <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
            {match.home_team_logo ? (
              <Image src={match.home_team_logo} alt={homePT} width={72} height={72} className="object-contain" />
            ) : (
              <div className="w-18 h-18 rounded-full bg-white/10 flex items-center justify-center text-xl text-gray-400">
                {homePT.slice(0, 2)}
              </div>
            )}
            <span className="text-base font-bold text-white text-center">{homePT}</span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1 px-2 shrink-0">
            {hasScore ? (
              <>
                <div className={`text-2xl sm:text-4xl font-black tabular-nums ${live ? 'text-green-400' : 'text-white'}`}>
                  {match.home_score} — {match.away_score}
                </div>
                {match.home_score_ht !== null && (
                  <div className="text-xs text-gray-500">
                    HT: {match.home_score_ht} — {match.away_score_ht}
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-400 text-xl font-medium">VS</div>
            )}
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatFullDate(match.match_date)}
            </div>
          </div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
            {match.away_team_logo ? (
              <Image src={match.away_team_logo} alt={awayPT} width={72} height={72} className="object-contain" />
            ) : (
              <div className="w-18 h-18 rounded-full bg-white/10 flex items-center justify-center text-xl text-gray-400">
                {awayPT.slice(0, 2)}
              </div>
            )}
            <span className="text-base font-bold text-white text-center">{awayPT}</span>
          </div>
        </div>

        {/* Venue */}
        {match.venue_name && (
          <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-gray-500">
            <MapPin className="w-3 h-3" />
            {match.venue_name}, {match.venue_city}
          </div>
        )}
      </div>

      {/* Prediction Form */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Seu Palpite</h2>
        <PredictionForm
          match={match}
          existingPrediction={myPrediction || undefined}
          deadlineHours={rules?.prediction_deadline_hours || 1}
        />
      </div>

      {/* Scoring Rules */}
      <Card>
        <CardContent className="flex items-center justify-around text-center gap-4">
          <div>
            <div className="text-lg font-bold text-emerald-400">{rules?.exact_score_points || 3}</div>
            <div className="text-xs text-gray-500">Placar exato</div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <div className="text-lg font-bold text-yellow-400">{rules?.correct_winner_points || 1}</div>
            <div className="text-xs text-gray-500">Vencedor/Empate</div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <div className="text-lg font-bold text-red-400">0</div>
            <div className="text-xs text-gray-500">Errou tudo</div>
          </div>
        </CardContent>
      </Card>

      {/* All Predictions */}
      {allPredictions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-white">
                Palpites dos participantes ({allPredictions.length})
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {allPredictions.map((pred: Prediction & { user: { name: string; avatar_url: string | null } }) => (
                <div key={pred.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar src={pred.user?.avatar_url} name={pred.user?.name || 'U'} size="sm" />
                    <span className="text-sm text-white">{pred.user?.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-blue-400">
                      {pred.home_score_prediction} × {pred.away_score_prediction}
                    </span>
                    {pred.calculated_at && (
                      <Badge variant={pred.exact_score ? 'green' : pred.correct_winner ? 'yellow' : 'red'}>
                        {pred.points}pts
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
