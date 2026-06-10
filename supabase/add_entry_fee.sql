-- Adiciona valor de entrada (entry fee) por participante nas configurações da competição
ALTER TABLE competition_settings
ADD COLUMN IF NOT EXISTS entry_fee INTEGER NOT NULL DEFAULT 100;
