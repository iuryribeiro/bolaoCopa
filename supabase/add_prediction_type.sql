-- Adiciona coluna para distinguir previsões de 1º/2º lugar vs melhores 3ºs colocados
ALTER TABLE group_qualification_predictions
ADD COLUMN IF NOT EXISTS prediction_type TEXT NOT NULL DEFAULT 'group_qualified';

-- Índice para facilitar filtros por tipo
CREATE INDEX IF NOT EXISTS idx_gqp_type ON group_qualification_predictions(prediction_type);
