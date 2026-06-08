-- Execute este SQL no Supabase SQL Editor
-- Tabelas necessárias que não estavam no schema original

-- =====================================================
-- TABELA: api_cache (cache de respostas da API externa)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.api_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_cache_key ON public.api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON public.api_cache(expires_at);

-- =====================================================
-- TABELA: api_daily_usage (controle de requisições diárias)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.api_daily_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  requests_count INTEGER DEFAULT 0,
  requests_limit INTEGER DEFAULT 100,
  last_request_at TIMESTAMPTZ
);

-- Inserir registro do dia atual
INSERT INTO public.api_daily_usage (date, requests_count, requests_limit)
VALUES (CURRENT_DATE, 0, 100)
ON CONFLICT (date) DO NOTHING;

-- =====================================================
-- TABELA: top_scorer_players (jogadores artilheiros)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.top_scorer_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_api_id INTEGER UNIQUE,
  player_name TEXT NOT NULL,
  player_photo TEXT,
  team_name TEXT,
  team_logo TEXT,
  position TEXT,
  nationality TEXT,
  goals_scored INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FUNÇÃO: incrementar uso da API
-- =====================================================
CREATE OR REPLACE FUNCTION public.increment_api_usage(p_requests INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.api_daily_usage
  SET
    requests_count = requests_count + p_requests,
    last_request_at = NOW()
  WHERE date = CURRENT_DATE;
END;
$$;

-- =====================================================
-- RLS para novas tabelas
-- =====================================================
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.top_scorer_players ENABLE ROW LEVEL SECURITY;

-- api_cache: apenas service role acessa (sem política = só service role)
-- (o código usa createAdminClient que bypassa RLS)

-- api_daily_usage: idem
-- top_scorer_players: visível para autenticados
CREATE POLICY "Artilheiros visíveis para autenticados" ON public.top_scorer_players
  FOR SELECT USING (auth.role() = 'authenticated');
