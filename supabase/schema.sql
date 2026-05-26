-- =====================================================
-- BOLÃO DA COPA DO MUNDO - Schema Supabase
-- Execute este arquivo no SQL Editor do Supabase
-- =====================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: user_profiles
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  total_points INTEGER DEFAULT 0,
  exact_scores INTEGER DEFAULT 0,
  correct_winners INTEGER DEFAULT 0,
  bonus_points INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: matches
-- =====================================================
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_fixture_id INTEGER UNIQUE NOT NULL,
  round TEXT,
  stage TEXT NOT NULL DEFAULT 'Group Stage',
  group_name TEXT,
  home_team_id INTEGER NOT NULL,
  home_team_name TEXT NOT NULL,
  home_team_logo TEXT,
  away_team_id INTEGER NOT NULL,
  away_team_name TEXT NOT NULL,
  away_team_logo TEXT,
  match_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'NS',
  elapsed INTEGER,
  home_score INTEGER,
  away_score INTEGER,
  home_score_ht INTEGER,
  away_score_ht INTEGER,
  winner_team_id INTEGER,
  venue_name TEXT,
  venue_city TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: predictions (palpites de placar)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  home_score_prediction INTEGER NOT NULL,
  away_score_prediction INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  exact_score BOOLEAN DEFAULT FALSE,
  correct_winner BOOLEAN DEFAULT FALSE,
  calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

-- =====================================================
-- TABELA: group_qualification_predictions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.group_qualification_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_name TEXT NOT NULL,
  team_id INTEGER NOT NULL,
  team_name TEXT NOT NULL,
  team_logo TEXT,
  is_correct BOOLEAN,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, group_name, team_id)
);

-- =====================================================
-- TABELA: knockout_predictions (mata-mata)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.knockout_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stage TEXT NOT NULL,
  match_reference TEXT NOT NULL,
  predicted_team_id INTEGER NOT NULL,
  predicted_team_name TEXT NOT NULL,
  predicted_team_logo TEXT,
  is_correct BOOLEAN,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, stage, match_reference)
);

-- =====================================================
-- TABELA: champion_predictions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.champion_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  champion_team_id INTEGER NOT NULL,
  champion_team_name TEXT NOT NULL,
  champion_team_logo TEXT,
  is_correct BOOLEAN,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: top_scorer_predictions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.top_scorer_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  player_photo TEXT,
  team_id INTEGER,
  team_name TEXT,
  is_correct BOOLEAN,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: scoring_rules
-- =====================================================
CREATE TABLE IF NOT EXISTS public.scoring_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exact_score_points INTEGER DEFAULT 3,
  correct_winner_points INTEGER DEFAULT 1,
  group_qualified_points INTEGER DEFAULT 1,
  knockout_advance_points INTEGER DEFAULT 1,
  finalist_points INTEGER DEFAULT 2,
  champion_points INTEGER DEFAULT 10,
  top_scorer_points INTEGER DEFAULT 5,
  prediction_deadline_hours INTEGER DEFAULT 1,
  group_prediction_deadline TEXT DEFAULT 'after_round1',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: competition_settings
-- =====================================================
CREATE TABLE IF NOT EXISTS public.competition_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id INTEGER DEFAULT 1,
  season INTEGER DEFAULT 2026,
  competition_name TEXT DEFAULT 'Copa do Mundo FIFA 2026',
  phase TEXT DEFAULT 'groups',
  groups_prediction_locked BOOLEAN DEFAULT FALSE,
  knockout_prediction_locked BOOLEAN DEFAULT FALSE,
  champion_prediction_locked BOOLEAN DEFAULT FALSE,
  top_scorer_prediction_locked BOOLEAN DEFAULT FALSE,
  top_scorer_deadline TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: api_sync_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.api_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  records_affected INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Regras de pontuação padrão
INSERT INTO public.scoring_rules (
  exact_score_points, correct_winner_points, group_qualified_points,
  knockout_advance_points, finalist_points, champion_points,
  top_scorer_points, prediction_deadline_hours
) VALUES (3, 1, 1, 1, 2, 10, 5, 1)
ON CONFLICT DO NOTHING;

-- Configurações da competição
INSERT INTO public.competition_settings (league_id, season, competition_name)
VALUES (1, 2026, 'Copa do Mundo FIFA 2026')
ON CONFLICT DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_qualification_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knockout_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.champion_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.top_scorer_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_sync_logs ENABLE ROW LEVEL SECURITY;

-- user_profiles policies
CREATE POLICY "Perfis são visíveis por todos autenticados" ON public.user_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuário edita próprio perfil" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuário cria próprio perfil" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- matches policies
CREATE POLICY "Jogos são visíveis para todos" ON public.matches
  FOR SELECT USING (TRUE);

CREATE POLICY "Só admin insere/atualiza jogos" ON public.matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- predictions policies
CREATE POLICY "Palpites são visíveis para autenticados" ON public.predictions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuário cria próprios palpites" ON public.predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário edita próprios palpites" ON public.predictions
  FOR UPDATE USING (auth.uid() = user_id);

-- group_qualification_predictions policies
CREATE POLICY "Previsões de grupos visíveis para autenticados" ON public.group_qualification_predictions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuário gerencia próprias previsões de grupos" ON public.group_qualification_predictions
  FOR ALL USING (auth.uid() = user_id);

-- knockout_predictions policies
CREATE POLICY "Mata-mata visível para autenticados" ON public.knockout_predictions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuário gerencia próprio mata-mata" ON public.knockout_predictions
  FOR ALL USING (auth.uid() = user_id);

-- champion_predictions policies
CREATE POLICY "Campeão visível para autenticados" ON public.champion_predictions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuário gerencia previsão de campeão" ON public.champion_predictions
  FOR ALL USING (auth.uid() = user_id);

-- top_scorer_predictions policies
CREATE POLICY "Artilheiro visível para autenticados" ON public.top_scorer_predictions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuário gerencia previsão de artilheiro" ON public.top_scorer_predictions
  FOR ALL USING (auth.uid() = user_id);

-- scoring_rules policies
CREATE POLICY "Regras visíveis para autenticados" ON public.scoring_rules
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Só admin edita regras" ON public.scoring_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- competition_settings policies
CREATE POLICY "Configurações visíveis para autenticados" ON public.competition_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Só admin edita configurações" ON public.competition_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- api_sync_logs policies
CREATE POLICY "Logs visíveis para admin" ON public.api_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Sistema pode inserir logs" ON public.api_sync_logs
  FOR INSERT WITH CHECK (TRUE);

-- =====================================================
-- FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para criar perfil automaticamente ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para novo usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_predictions_updated_at
  BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Função para calcular pontos de um palpite
CREATE OR REPLACE FUNCTION public.calculate_prediction_points(
  p_home_pred INTEGER,
  p_away_pred INTEGER,
  p_home_actual INTEGER,
  p_away_actual INTEGER,
  p_exact_points INTEGER DEFAULT 3,
  p_winner_points INTEGER DEFAULT 1
)
RETURNS TABLE(points INTEGER, exact_score BOOLEAN, correct_winner BOOLEAN) AS $$
DECLARE
  v_pred_winner TEXT;
  v_actual_winner TEXT;
BEGIN
  -- Determinar vencedor do palpite
  IF p_home_pred > p_away_pred THEN v_pred_winner := 'home';
  ELSIF p_away_pred > p_home_pred THEN v_pred_winner := 'away';
  ELSE v_pred_winner := 'draw';
  END IF;

  -- Determinar vencedor real
  IF p_home_actual > p_away_actual THEN v_actual_winner := 'home';
  ELSIF p_away_actual > p_home_actual THEN v_actual_winner := 'away';
  ELSE v_actual_winner := 'draw';
  END IF;

  -- Placar exato
  IF p_home_pred = p_home_actual AND p_away_pred = p_away_actual THEN
    RETURN QUERY SELECT p_exact_points, TRUE, TRUE;
  -- Apenas vencedor/empate correto
  ELSIF v_pred_winner = v_actual_winner THEN
    RETURN QUERY SELECT p_winner_points, FALSE, TRUE;
  -- Errou tudo
  ELSE
    RETURN QUERY SELECT 0, FALSE, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para recalcular todos os pontos de um jogo
CREATE OR REPLACE FUNCTION public.recalculate_match_points(p_match_id UUID)
RETURNS void AS $$
DECLARE
  v_match RECORD;
  v_pred RECORD;
  v_result RECORD;
  v_rules RECORD;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  SELECT * INTO v_rules FROM public.scoring_rules WHERE is_active = TRUE LIMIT 1;

  IF v_match.home_score IS NULL OR v_match.away_score IS NULL THEN
    RETURN;
  END IF;

  FOR v_pred IN
    SELECT * FROM public.predictions WHERE match_id = p_match_id
  LOOP
    SELECT * INTO v_result FROM public.calculate_prediction_points(
      v_pred.home_score_prediction, v_pred.away_score_prediction,
      v_match.home_score, v_match.away_score,
      v_rules.exact_score_points, v_rules.correct_winner_points
    );

    UPDATE public.predictions
    SET
      points = v_result.points,
      exact_score = v_result.exact_score,
      correct_winner = v_result.correct_winner,
      calculated_at = NOW()
    WHERE id = v_pred.id;
  END LOOP;

  -- Recalcular totais dos usuários
  PERFORM public.recalculate_all_user_totals();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para recalcular totais de todos os usuários
CREATE OR REPLACE FUNCTION public.recalculate_all_user_totals()
RETURNS void AS $$
BEGIN
  UPDATE public.user_profiles up
  SET
    total_points = COALESCE(pred_totals.total, 0) + COALESCE(bonus_totals.bonus, 0),
    exact_scores = COALESCE(pred_totals.exact, 0),
    correct_winners = COALESCE(pred_totals.winners, 0),
    bonus_points = COALESCE(bonus_totals.bonus, 0),
    updated_at = NOW()
  FROM (
    SELECT
      user_id,
      SUM(points) as total,
      COUNT(*) FILTER (WHERE exact_score = TRUE) as exact,
      COUNT(*) FILTER (WHERE correct_winner = TRUE AND exact_score = FALSE) as winners
    FROM public.predictions
    WHERE calculated_at IS NOT NULL
    GROUP BY user_id
  ) pred_totals
  LEFT JOIN (
    SELECT
      user_id,
      COALESCE(gqp, 0) + COALESCE(kp, 0) + COALESCE(cp, 0) + COALESCE(tsp, 0) as bonus
    FROM (
      SELECT user_id,
        (SELECT SUM(points) FROM public.group_qualification_predictions g WHERE g.user_id = up2.user_id) as gqp,
        (SELECT SUM(points) FROM public.knockout_predictions k WHERE k.user_id = up2.user_id) as kp,
        (SELECT COALESCE(points, 0) FROM public.champion_predictions c WHERE c.user_id = up2.user_id) as cp,
        (SELECT COALESCE(points, 0) FROM public.top_scorer_predictions t WHERE t.user_id = up2.user_id) as tsp
      FROM public.user_profiles up2
    ) bonus_data
  ) bonus_totals ON pred_totals.user_id = bonus_totals.user_id
  WHERE up.user_id = pred_totals.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON public.predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_match_date ON public.matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_api_fixture_id ON public.matches(api_fixture_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_points ON public.user_profiles(total_points DESC);
