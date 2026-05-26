import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getApiUsage } from '@/lib/api-football/cache'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles').select('is_admin').eq('user_id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const usage = await getApiUsage()

    // Buscar histórico dos últimos 7 dias
    const { data: history } = await supabase
      .from('api_daily_usage')
      .select('date, requests_count, requests_limit')
      .order('date', { ascending: false })
      .limit(7)

    return NextResponse.json({ usage, history: history || [] })
  } catch {
    return NextResponse.json({ usage: null }, { status: 500 })
  }
}
