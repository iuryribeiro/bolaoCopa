import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles').select('is_admin').eq('user_id', user.id).single()

  return profile?.is_admin ? user : null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const admin = await checkAdmin(supabase)
    if (!admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const [settingsResult, rulesResult] = await Promise.all([
      supabase.from('competition_settings').select('*').eq('is_active', true).single(),
      supabase.from('scoring_rules').select('*').eq('is_active', true).single(),
    ])

    return NextResponse.json({
      settings: settingsResult.data,
      rules: rulesResult.data,
    })
  } catch {
    return NextResponse.json({ settings: null, rules: null }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const admin = await checkAdmin(supabase)
    if (!admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await request.json()

    const { data, error } = await supabase
      .from('competition_settings')
      .update(body)
      .eq('is_active', true)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ settings: data })
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}
