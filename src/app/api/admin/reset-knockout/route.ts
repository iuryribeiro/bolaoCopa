import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('user_profiles').select('is_admin').eq('user_id', user.id).single()
  return profile?.is_admin ? user : null
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const admin = await checkAdmin(supabase)
    if (!admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const { error, count } = await supabase
      .from('knockout_predictions')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000') // deleta tudo

    if (error) throw error
    return NextResponse.json({ deleted: count ?? 0 })
  } catch {
    return NextResponse.json({ error: 'Erro ao limpar mata-mata' }, { status: 500 })
  }
}
