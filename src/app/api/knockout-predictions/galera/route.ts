import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Verifica autenticação com cliente normal
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    // Usa admin client para bypassar RLS e ler palpites de todos os usuários
    const admin = createAdminClient()

    const [predsRes, profilesRes] = await Promise.all([
      admin
        .from('knockout_predictions')
        .select('user_id, stage, match_reference, predicted_team_id, predicted_team_name, predicted_team_logo')
        .order('stage', { ascending: true }),
      admin
        .from('user_profiles')
        .select('user_id, name, avatar_url'),
    ])

    if (predsRes.error) throw predsRes.error
    if (profilesRes.error) throw profilesRes.error

    const profileMap = new Map(
      (profilesRes.data || []).map(p => [p.user_id, { name: p.name, avatar_url: p.avatar_url }])
    )

    // Agrupa palpites por usuário
    const byUser = new Map<string, {
      user_id: string
      name: string
      avatar_url: string | null
      picks: Array<{
        stage: string
        match_reference: string
        predicted_team_id: number
        predicted_team_name: string
        predicted_team_logo: string | null
      }>
    }>()

    for (const row of (predsRes.data || [])) {
      if (!byUser.has(row.user_id)) {
        const profile = profileMap.get(row.user_id)
        byUser.set(row.user_id, {
          user_id: row.user_id,
          name: profile?.name ?? 'Usuário',
          avatar_url: profile?.avatar_url ?? null,
          picks: [],
        })
      }
      byUser.get(row.user_id)!.picks.push({
        stage: row.stage,
        match_reference: row.match_reference,
        predicted_team_id: row.predicted_team_id,
        predicted_team_name: row.predicted_team_name,
        predicted_team_logo: row.predicted_team_logo,
      })
    }

    const participants = Array.from(byUser.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    return NextResponse.json({ participants, currentUserId: user.id })
  } catch (error) {
    console.error('knockout galera error:', error)
    return NextResponse.json({ error: 'Erro ao buscar palpites da galera' }, { status: 500 })
  }
}
