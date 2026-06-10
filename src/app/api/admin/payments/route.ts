import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

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

    // Try with payment_confirmed column first
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, name, avatar_url, total_points, payment_confirmed')
      .order('name')

    if (!error) {
      return NextResponse.json({ participants: data || [] })
    }

    // Column might not exist yet — fall back to query without it
    const { data: fallback, error: fallbackError } = await supabase
      .from('user_profiles')
      .select('user_id, name, avatar_url, total_points')
      .order('name')

    if (fallbackError) throw fallbackError

    const participants = (fallback || []).map(p => ({ ...p, payment_confirmed: false }))
    return NextResponse.json({ participants, migration_needed: true })
  } catch (err) {
    console.error('[payments GET]', err)
    return NextResponse.json({ error: 'Erro ao buscar participantes', participants: [] }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const admin = await checkAdmin(supabase)
    if (!admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const { user_id, payment_confirmed } = await request.json()
    if (!user_id || typeof payment_confirmed !== 'boolean') {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const adminClient = await createAdminClient()
    const { error } = await adminClient
      .from('user_profiles')
      .update({ payment_confirmed })
      .eq('user_id', user_id)

    if (error) {
      console.error('[payments PATCH]', error)
      // Specific message if column doesn't exist
      if (error.message?.includes('payment_confirmed')) {
        return NextResponse.json(
          { error: 'Execute a migration supabase/add_payment_confirmed.sql no banco primeiro.' },
          { status: 500 }
        )
      }
      throw error
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[payments PATCH]', err)
    return NextResponse.json({ error: 'Erro ao atualizar pagamento' }, { status: 500 })
  }
}
