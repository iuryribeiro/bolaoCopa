-- =====================================================
-- EXECUTE ESTE SQL APÓS O schema.sql
-- Adiciona tabelas de cache e contador de requisições
-- =====================================================

-- Cache genérico para dados da API-Football
CREATE TABLE IF NOT EXISTS public.api_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contador diário de requisições à API
CREATE TABLE IF NOT EXISTS public.api_daily_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  requests_count INTEGER DEFAULT 0,
  requests_limit INTEGER DEFAULT 100,
  last_request_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir registro do dia atual
INSERT INTO public.api_daily_usage (date, requests_count)
VALUES (CURRENT_DATE, 0)
ON CONFLICT (date) DO NOTHING;

-- RLS
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache visível para autenticados" ON public.api_cache
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Sistema gerencia cache" ON public.api_cache
  FOR ALL USING (TRUE);

CREATE POLICY "Usage visível para autenticados" ON public.api_daily_usage
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Sistema atualiza usage" ON public.api_daily_usage
  FOR ALL USING (TRUE);

-- Índice para busca rápida por chave
CREATE INDEX IF NOT EXISTS idx_api_cache_key ON public.api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON public.api_cache(expires_at);

-- Função para incrementar contador de uso
CREATE OR REPLACE FUNCTION public.increment_api_usage(p_requests INTEGER DEFAULT 1)
RETURNS void AS $$
BEGIN
  INSERT INTO public.api_daily_usage (date, requests_count, last_request_at)
  VALUES (CURRENT_DATE, p_requests, NOW())
  ON CONFLICT (date) DO UPDATE
  SET
    requests_count = api_daily_usage.requests_count + p_requests,
    last_request_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se pode fazer requisição
CREATE OR REPLACE FUNCTION public.can_call_api(p_needed INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_limit INTEGER;
BEGIN
  SELECT requests_count, requests_limit
  INTO v_count, v_limit
  FROM public.api_daily_usage
  WHERE date = CURRENT_DATE;

  IF NOT FOUND THEN
    INSERT INTO public.api_daily_usage (date, requests_count) VALUES (CURRENT_DATE, 0);
    RETURN TRUE;
  END IF;

  RETURN (v_count + p_needed) <= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
