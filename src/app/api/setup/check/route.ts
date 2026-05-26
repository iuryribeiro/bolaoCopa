import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const results: Record<string, { ok: boolean; detail: string }> = {}

  try {
    const supabase = await createAdminClient()

    // 1. Testar conexão Supabase
    const tables = ['user_profiles', 'matches', 'predictions', 'scoring_rules',
      'competition_settings', 'api_sync_logs', 'api_cache', 'api_daily_usage']

    for (const table of tables) {
      const { error, count } = await supabase
        .from(table).select('*', { count: 'exact', head: true })

      results[`tabela_${table}`] = {
        ok: !error,
        detail: error ? `ERRO: ${error.message}` : `OK (${count ?? 0} registros)`,
      }
    }

    // 2. Verificar token da API
    results['api_token'] = {
      ok: !!process.env.FOOTBALL_DATA_TOKEN && process.env.FOOTBALL_DATA_TOKEN !== 'SEU_TOKEN_AQUI',
      detail: process.env.FOOTBALL_DATA_TOKEN
        ? `Configurado (${process.env.FOOTBALL_DATA_TOKEN.slice(0, 6)}...)`
        : 'FALTANDO: FOOTBALL_DATA_TOKEN não definido',
    }

    // 3. Verificar se tem usuários admin
    const { data: admins } = await supabase
      .from('user_profiles').select('name, is_admin').eq('is_admin', true)

    results['admin_configurado'] = {
      ok: (admins?.length ?? 0) > 0,
      detail: admins?.length
        ? `Admin: ${admins.map(a => a.name).join(', ')}`
        : 'NENHUM admin configurado — execute o SQL para definir um',
    }

    // 4. Verificar regras de pontuação
    const { data: rules } = await supabase.from('scoring_rules').select('id').limit(1)
    results['regras_pontuacao'] = {
      ok: (rules?.length ?? 0) > 0,
      detail: (rules?.length ?? 0) > 0 ? 'OK' : 'FALTANDO — execute o schema.sql',
    }

    // 5. Verificar configurações da competição
    const { data: settings } = await supabase.from('competition_settings').select('id').limit(1)
    results['competition_settings'] = {
      ok: (settings?.length ?? 0) > 0,
      detail: (settings?.length ?? 0) > 0 ? 'OK' : 'FALTANDO — execute o schema.sql',
    }

    // 6. Contar jogos sincronizados
    const { count: matchCount } = await supabase
      .from('matches').select('*', { count: 'exact', head: true })
    results['jogos_sincronizados'] = {
      ok: (matchCount ?? 0) > 0,
      detail: (matchCount ?? 0) > 0
        ? `${matchCount} jogos no banco`
        : 'ZERO jogos — vá em /admin e clique em Sincronizar',
    }

    const allOk = Object.values(results).every(r => r.ok)

    return NextResponse.json({
      status: allOk ? 'OK' : 'PROBLEMAS ENCONTRADOS',
      allOk,
      checks: results,
      nextSteps: allOk ? ['Tudo configurado! Acesse /dashboard'] : Object.entries(results)
        .filter(([, v]) => !v.ok)
        .map(([k, v]) => `${k}: ${v.detail}`),
    })
  } catch (err) {
    return NextResponse.json({
      status: 'ERRO CRÍTICO',
      error: err instanceof Error ? err.message : String(err),
      message: 'Verifique as variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY',
    }, { status: 500 })
  }
}
