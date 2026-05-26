import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    // Busca notificações broadcast + pessoais, com flag de lida
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        id, title, body, type, action_url, created_at,
        notification_reads!left(read_at)
      `)
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) throw error

    const notifications = (data || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      action_url: n.action_url,
      created_at: n.created_at,
      read: n.notification_reads?.length > 0,
    }))

    return NextResponse.json({ notifications })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar notificações' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await request.json()
    const { title, body: notifBody, type = 'announcement', action_url, user_id } = body

    if (!title || !notifBody) {
      return NextResponse.json({ error: 'title e body são obrigatórios' }, { status: 400 })
    }

    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('notifications')
      .insert({ title, body: notifBody, type, action_url: action_url || null, user_id: user_id || null })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ notification: data })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar notificação' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { notification_ids } = body as { notification_ids: string[] }

    if (!notification_ids?.length) return NextResponse.json({ ok: true })

    const rows = notification_ids.map(id => ({ user_id: user.id, notification_id: id }))

    await supabase
      .from('notification_reads')
      .upsert(rows, { onConflict: 'user_id,notification_id', ignoreDuplicates: true })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao marcar como lida' }, { status: 500 })
  }
}
