import type {
  FDMatch, FDMatchesResponse,
  FDStandingGroup, FDStandingsResponse,
  FDScorer, FDScorersResponse,
} from './types'
import { getCached, setCache, checkAndIncrementUsage, CACHE_TTL } from '@/lib/api-football/cache'

const BASE_URL = 'https://api.football-data.org/v4'
const COMPETITION = process.env.FOOTBALL_COMPETITION_CODE || 'WC'

async function fdFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const res = await fetch(url.toString(), {
    headers: {
      'X-Auth-Token': process.env.FOOTBALL_DATA_TOKEN!,
    },
    cache: 'no-store',
  })

  if (res.status === 429) {
    throw new Error('RATE_LIMIT: Limite de requisições atingido, aguarde um momento')
  }

  if (res.status === 403) {
    throw new Error('API_KEY_INVALID: Token inválido ou sem acesso a esta competição')
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`football-data.org error ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

async function fetchWithCache<T>(
  cacheKey: string,
  ttlMinutes: number,
  fetcher: () => Promise<T>
): Promise<{ data: T; fromCache: boolean }> {
  const cached = await getCached<T>(cacheKey)
  if (cached !== null) return { data: cached, fromCache: true }

  const { allowed } = await checkAndIncrementUsage(1)
  if (!allowed) throw new Error('RATE_LIMIT: Limite diário atingido')

  const data = await fetcher()
  await setCache(cacheKey, data, ttlMinutes)
  return { data, fromCache: false }
}

export const footballData = {
  // Todos os jogos — cache 30min
  async getMatches(params?: Record<string, string>): Promise<{ data: FDMatch[]; fromCache: boolean }> {
    const cacheKey = `fd:matches:${COMPETITION}:${JSON.stringify(params || {})}`
    return fetchWithCache(
      cacheKey,
      CACHE_TTL.FIXTURES,
      async () => {
        const res = await fdFetch<FDMatchesResponse>(`/competitions/${COMPETITION}/matches`, params)
        return res.matches
      }
    )
  },

  // Jogos de um intervalo de datas — economiza quota buscando só os dias relevantes
  async getMatchesByDate(dateFrom: string, dateTo: string): Promise<{ data: FDMatch[]; fromCache: boolean }> {
    const cacheKey = `fd:matches:${COMPETITION}:${dateFrom}:${dateTo}`
    return fetchWithCache(
      cacheKey,
      CACHE_TTL.LIVE, // cache curto (2min) para pegar resultados frescos
      async () => {
        const res = await fdFetch<FDMatchesResponse>(`/competitions/${COMPETITION}/matches`, { dateFrom, dateTo })
        return res.matches
      }
    )
  },

  // Jogos ao vivo — busca TODOS os jogos sem filtro de status (free tier compatível)
  // O cache de 2min garante dados frescos sem estourar a cota
  async getLiveMatches(): Promise<{ data: FDMatch[]; fromCache: boolean }> {
    return fetchWithCache(
      `fd:matches:live:${COMPETITION}`,
      CACHE_TTL.LIVE,
      async () => {
        const res = await fdFetch<FDMatchesResponse>(`/competitions/${COMPETITION}/matches`)
        return res.matches
      }
    )
  },

  // Um jogo específico — cache 2min
  async getMatch(matchId: number): Promise<{ data: FDMatch; fromCache: boolean }> {
    return fetchWithCache(
      `fd:match:${matchId}`,
      CACHE_TTL.LIVE,
      () => fdFetch<FDMatch>(`/matches/${matchId}`)
    )
  },

  // Classificação dos grupos — cache 1h
  async getStandings(): Promise<{ data: FDStandingGroup[]; fromCache: boolean }> {
    return fetchWithCache(
      `fd:standings:${COMPETITION}`,
      CACHE_TTL.STANDINGS,
      async () => {
        const res = await fdFetch<FDStandingsResponse>(`/competitions/${COMPETITION}/standings`)
        return res.standings.filter(s => s.type === 'TOTAL')
      }
    )
  },

  // Artilheiros — cache 1h
  async getScorers(limit = 30): Promise<{ data: FDScorer[]; fromCache: boolean }> {
    return fetchWithCache(
      `fd:scorers:${COMPETITION}:${limit}`,
      CACHE_TTL.SCORERS,
      async () => {
        const res = await fdFetch<FDScorersResponse>(`/competitions/${COMPETITION}/scorers`, { limit: String(limit) })
        return res.scorers
      }
    )
  },
}
