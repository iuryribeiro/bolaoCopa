import { createAdminClient } from '@/lib/supabase/server'

// TTLs em minutos
export const CACHE_TTL = {
  SCORERS: 60,       // 1h — muda poucas vezes por dia
  STANDINGS: 60,     // 1h — muda após cada rodada
  FIXTURES: 30,      // 30min — jogos do dia
  LIVE: 2,           // 2min — ao vivo
  ROUNDS: 1440,      // 24h — lista de rodadas raramente muda
} as const

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('api_cache')
      .select('data, expires_at')
      .eq('cache_key', key)
      .single()

    if (error || !data) return null

    // Verificar se o cache ainda é válido
    if (new Date(data.expires_at) < new Date()) return null

    return data.data as T
  } catch {
    return null
  }
}

export async function setCache<T>(key: string, value: T, ttlMinutes: number): Promise<void> {
  try {
    const supabase = await createAdminClient()
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()

    await supabase
      .from('api_cache')
      .upsert(
        { cache_key: key, data: value as object, expires_at: expiresAt, updated_at: new Date().toISOString() },
        { onConflict: 'cache_key' }
      )
  } catch (err) {
    console.error('Cache write error:', err)
  }
}

export async function invalidateCache(keyPattern: string): Promise<void> {
  try {
    const supabase = await createAdminClient()
    await supabase
      .from('api_cache')
      .delete()
      .like('cache_key', `${keyPattern}%`)
  } catch (err) {
    console.error('Cache invalidate error:', err)
  }
}

// Verificar e incrementar contador diário
export async function checkAndIncrementUsage(requestsNeeded = 1): Promise<{
  allowed: boolean
  remaining: number
  used: number
  limit: number
}> {
  try {
    const supabase = await createAdminClient()

    // Garantir registro do dia
    await supabase
      .from('api_daily_usage')
      .upsert({ date: new Date().toISOString().split('T')[0], requests_count: 0 }, { onConflict: 'date', ignoreDuplicates: true })

    const { data } = await supabase
      .from('api_daily_usage')
      .select('requests_count, requests_limit')
      .eq('date', new Date().toISOString().split('T')[0])
      .single()

    const used = data?.requests_count || 0
    const limit = data?.requests_limit || 100
    const remaining = limit - used
    const allowed = (used + requestsNeeded) <= limit

    if (allowed) {
      await supabase.rpc('increment_api_usage', { p_requests: requestsNeeded })
    }

    return { allowed, remaining, used, limit }
  } catch {
    return { allowed: true, remaining: 100, used: 0, limit: 100 }
  }
}

export async function getApiUsage(): Promise<{
  used: number
  limit: number
  remaining: number
  last_request_at: string | null
}> {
  try {
    const supabase = await createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    const { data } = await supabase
      .from('api_daily_usage')
      .select('requests_count, requests_limit, last_request_at')
      .eq('date', today)
      .maybeSingle()

    return {
      used: data?.requests_count || 0,
      limit: data?.requests_limit || 100,
      remaining: (data?.requests_limit || 100) - (data?.requests_count || 0),
      last_request_at: data?.last_request_at || null,
    }
  } catch {
    return { used: 0, limit: 100, remaining: 100, last_request_at: null }
  }
}
