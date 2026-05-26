-- Adiciona campo de pagamento confirmado no perfil do usuário
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS payment_confirmed BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice para filtrar confirmados
CREATE INDEX IF NOT EXISTS idx_profiles_payment ON user_profiles(payment_confirmed);
