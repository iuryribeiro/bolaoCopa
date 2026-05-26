import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabase = await createClient()

    let query = supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: true })
      .limit(limit)

    if (stage) query = query.eq('stage', stage)
    if (status) {
      if (status === 'live') {
        query = query.in('status', ['1H', 'HT', '2H', 'ET', 'P', 'BT'])
      } else if (status === 'finished') {
        query = query.in('status', ['FT', 'AET', 'PEN'])
      } else if (status === 'upcoming') {
        query = query.eq('status', 'NS').gte('match_date', new Date().toISOString())
      } else {
        query = query.eq('status', status)
      }
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ matches: data || [] })
  } catch (error) {
    console.error('Error fetching matches:', error)
    return NextResponse.json({ error: 'Erro ao buscar jogos' }, { status: 500 })
  }
}
