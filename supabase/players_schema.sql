-- =====================================================
-- Tabela de jogadores para previsão de artilheiro
-- Seed manual + atualização via sync durante a Copa
-- =====================================================

CREATE TABLE IF NOT EXISTS top_scorer_players (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_api_id   INTEGER UNIQUE,          -- ID do football-data.org (preenchido após sync)
  player_name     TEXT NOT NULL,
  team_name       TEXT,
  team_logo       TEXT,                    -- crest URL do football-data.org
  position        TEXT,
  nationality     TEXT,
  goals_scored    INTEGER NOT NULL DEFAULT 0,
  assists         INTEGER NOT NULL DEFAULT 0,
  matches_played  INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE top_scorer_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de jogadores"
  ON top_scorer_players FOR SELECT USING (true);

CREATE POLICY "Apenas admins modificam jogadores"
  ON top_scorer_players FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- =====================================================
-- Seed: ~50 grandes nomes esperados na Copa 2026
-- team_logo será preenchido após sync admin
-- =====================================================
INSERT INTO top_scorer_players (player_name, team_name, position, nationality) VALUES
-- Brasil
('Vinicius Júnior',    'Brazil',   'Atacante', 'Brazilian'),
('Rodrygo',            'Brazil',   'Atacante', 'Brazilian'),
('Endrick',            'Brazil',   'Atacante', 'Brazilian'),
('Raphinha',           'Brazil',   'Atacante', 'Brazilian'),
('Gabriel Martinelli', 'Brazil',   'Atacante', 'Brazilian'),
-- Argentina
('Lionel Messi',       'Argentina','Atacante', 'Argentine'),
('Lautaro Martínez',   'Argentina','Atacante', 'Argentine'),
('Julián Álvarez',     'Argentina','Atacante', 'Argentine'),
('Alejandro Garnacho', 'Argentina','Atacante', 'Argentine'),
-- França
('Kylian Mbappé',      'France',   'Atacante', 'French'),
('Antoine Griezmann',  'France',   'Meia',     'French'),
('Ousmane Dembélé',    'France',   'Atacante', 'French'),
('Marcus Thuram',      'France',   'Atacante', 'French'),
-- Portugal
('Cristiano Ronaldo',  'Portugal', 'Atacante', 'Portuguese'),
('Bruno Fernandes',    'Portugal', 'Meia',     'Portuguese'),
('Rafael Leão',        'Portugal', 'Atacante', 'Portuguese'),
('Diogo Jota',         'Portugal', 'Atacante', 'Portuguese'),
-- Inglaterra
('Harry Kane',         'England',  'Atacante', 'English'),
('Jude Bellingham',    'England',  'Meia',     'English'),
('Phil Foden',         'England',  'Meia',     'English'),
('Bukayo Saka',        'England',  'Atacante', 'English'),
-- Alemanha
('Florian Wirtz',      'Germany',  'Meia',     'German'),
('Jamal Musiala',      'Germany',  'Meia',     'German'),
('Kai Havertz',        'Germany',  'Atacante', 'German'),
('Leroy Sané',         'Germany',  'Atacante', 'German'),
-- Espanha
('Pedri',              'Spain',    'Meia',     'Spanish'),
('Lamine Yamal',       'Spain',    'Atacante', 'Spanish'),
('Álvaro Morata',      'Spain',    'Atacante', 'Spanish'),
('Dani Olmo',          'Spain',    'Meia',     'Spanish'),
-- Holanda
('Cody Gakpo',         'Netherlands','Atacante','Dutch'),
('Memphis Depay',      'Netherlands','Atacante','Dutch'),
('Xavi Simons',        'Netherlands','Meia',   'Dutch'),
-- Marrocos
('Youssef En-Nesyri',  'Morocco',  'Atacante', 'Moroccan'),
('Hakim Ziyech',       'Morocco',  'Meia',     'Moroccan'),
-- Uruguai
('Darwin Núñez',       'Uruguay',  'Atacante', 'Uruguayan'),
('Federico Valverde',  'Uruguay',  'Meia',     'Uruguayan'),
-- Colômbia
('Luis Díaz',          'Colombia', 'Atacante', 'Colombian'),
('James Rodríguez',    'Colombia', 'Meia',     'Colombian'),
-- Noruega
('Erling Haaland',     'Norway',   'Atacante', 'Norwegian'),
-- Coreia do Sul
('Son Heung-min',      'Korea Republic','Atacante','South Korean'),
-- Japão
('Kaoru Mitoma',       'Japan',    'Atacante', 'Japanese'),
('Ayase Ueda',         'Japan',    'Atacante', 'Japanese'),
-- Sérvia
('Aleksandar Mitrović','Serbia',   'Atacante', 'Serbian'),
-- Senegal
('Sadio Mané',         'Senegal',  'Atacante', 'Senegalese'),
-- Nigéria
('Victor Osimhen',     'Nigeria',  'Atacante', 'Nigerian'),
-- Egito
('Mohamed Salah',      'Egypt',    'Atacante', 'Egyptian'),
-- Estados Unidos
('Christian Pulisic',  'United States','Meia', 'American'),
('Folarin Balogun',    'United States','Atacante','American'),
-- México
('Santiago Giménez',   'Mexico',   'Atacante', 'Mexican'),
-- Canadá
('Alphonso Davies',    'Canada',   'Lateral',  'Canadian'),
('Jonathan David',     'Canada',   'Atacante', 'Canadian')
ON CONFLICT DO NOTHING;
