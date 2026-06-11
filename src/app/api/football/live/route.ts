import { NextResponse } from 'next/server'
import { footballData } from '@/lib/football-data/client'
import { mapFDMatchToSupabase } from '@/lib/football-data/mapper'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createAdminClient()

    // Verificar se há jogos que devem estar ao vivo
    const twoHoursAgo = new Date(Date.now() - 180 * 60 * 1000).toISOString()
    const now = new Date().toISOString()

    const { data: currentLiveInDB } = await supabase
      .from('matches')
      .select('id')
      .in('status', ['1H', 'HT', '2H', 'ET', 'P', 'BT'])
      .limit(1)

    const { data: possiblyStarted } = await supabase
      .from('matches')
      .select('id')
      .eq('status', 'NS')
      .gte('match_date', twoHoursAgo)
      .lte('match_date', now)
      .limit(1)

    const shouldSync = (currentLiveInDB?.length ?? 0) > 0 || (possiblyStarted?.length ?? 0) > 0

    if (shouldSync) {
      // getLiveMatches busca todos os jogos da competição (2min cache)
      const result = await footballData.getLiveMatches()

      if (!result.fromCache) {
        for (const fdMatch of result.data) {
          const matchData = mapFDMatchToSupabase(fdMatch)
          await supabase.from('matches').upsert(matchData, { onConflict: 'api_fixture_id' })

          // Recalcular pontos quando jogo encerrar
          if (['FT', 'AET', 'PEN', 'AWD'].includes(matchData.status)) {
            const { data: match } = await supabase
              .from('matches').select('id').eq('api_fixture_id', fdMatch.id).single()
            if (match) {
              await supabase.rpc('recalculate_match_points', { p_match_id: match.id })
            }
          }
        }
      }
    }

    const { data: liveMatches, error } = await supabase
      .from('matches')
      .select('*')
      .in('status', ['1H', 'HT', '2H', 'ET', 'P', 'BT'])
      .order('match_date')

    if (error) throw error
    return NextResponse.json({ matches: liveMatches || [] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro ao buscar ao vivo'
    return NextResponse.json({ matches: [], error: msg }, { status: 500 })
  }
}
