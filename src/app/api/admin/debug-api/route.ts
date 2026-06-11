import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { invalidateCache } from '@/lib/api-football/cache'

const BASE_URL = 'https://api.football-data.org/v4'
const COMPETITION = process.env.FOOTBALL_COMPETITION_CODE || 'WC'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles').select('is_admin').eq('user_id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    // Limpa cache para forçar chamada real à API
    await invalidateCache(`fd:matches:live:${COMPETITION}`)

    const res = await fetch(`${BASE_URL}/competitions/${COMPETITION}/matches`, {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_TOKEN! },
      cache: 'no-store',
    })

    const body = await res.text()

    if (!res.ok) {
      return NextResponse.json({ status: res.status, error: body, competition: COMPETITION })
    }

    const data = JSON.parse(body)
    const matches = (data.matches || []).map((m: { id: number; status: string; homeTeam: { name: string }; awayTeam: { name: string }; utcDate: string; score: unknown }) => ({
      id: m.id,
      status: m.status,
      home: m.homeTeam?.name,
      away: m.awayTeam?.name,
      date: m.utcDate,
      score: m.score,
    }))

    const liveMatches = matches.filter((m: { status: string }) =>
      ['LIVE', 'IN_PLAY', 'PAUSED'].includes(m.status)
    )

    return NextResponse.json({
      competition: COMPETITION,
      total: matches.length,
      live_count: liveMatches.length,
      live: liveMatches,
      all_statuses: [...new Set(matches.map((m: { status: string }) => m.status))],
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
