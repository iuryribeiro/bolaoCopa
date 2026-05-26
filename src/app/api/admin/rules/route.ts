import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles').select('is_admin').eq('user_id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await request.json()
    const { id, created_at, updated_at, is_active, ...updateData } = body

    const { data, error } = await supabase
      .from('scoring_rules')
      .update(updateData)
      .eq('is_active', true)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ rules: data })
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar regras' }, { status: 500 })
  }
}
