-- Adiciona referência UUID para top_scorer_players e torna player_id opcional
ALTER TABLE top_scorer_predictions
ADD COLUMN IF NOT EXISTS scorer_player_id UUID REFERENCES top_scorer_players(id);

ALTER TABLE top_scorer_predictions
ALTER COLUMN player_id DROP NOT NULL;

-- RLS
ALTER TABLE top_scorer_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública palpite artilheiro"
  ON top_scorer_predictions FOR SELECT USING (true);

CREATE POLICY "Usuário gerencia próprio palpite artilheiro"
  ON top_scorer_predictions FOR ALL USING (auth.uid() = user_id);
