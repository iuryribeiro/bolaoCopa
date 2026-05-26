-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = broadcast para todos
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'announcement',  -- 'announcement' | 'match_result' | 'deadline'
  action_url TEXT,                             -- link opcional ao clicar
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leitura de notificações por usuário
CREATE TABLE IF NOT EXISTS notification_reads (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, notification_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_reads_user ON notification_reads(user_id);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- Leitura: usuário vê notificações broadcast (user_id IS NULL) ou próprias
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());

-- Inserção: só admin
CREATE POLICY "notifications_insert_admin" ON notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Leitura de reads: só o próprio usuário
CREATE POLICY "reads_select" ON notification_reads
  FOR SELECT USING (user_id = auth.uid());

-- Inserção de reads: qualquer usuário autenticado
CREATE POLICY "reads_insert" ON notification_reads
  FOR INSERT WITH CHECK (user_id = auth.uid());
