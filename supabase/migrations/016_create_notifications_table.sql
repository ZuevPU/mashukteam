-- Миграция для таблицы истории уведомлений
-- Выполняется после 015_create_randomizer_tables.sql

-- Таблица истории уведомлений
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('event', 'question', 'assignment', 'diagnostic', 'achievement', 'randomizer', 'assignment_result')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    deep_link TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

COMMENT ON TABLE notifications IS 'История уведомлений пользователей';
COMMENT ON COLUMN notifications.type IS 'Тип уведомления: event, question, assignment, diagnostic, achievement, randomizer, assignment_result';
COMMENT ON COLUMN notifications.deep_link IS 'Ссылка для перехода в приложение (start параметр)';

-- Включение RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
DROP POLICY IF EXISTS "Service role full access on notifications" ON notifications;
CREATE POLICY "Service role full access on notifications" 
  ON notifications FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Deny anonymous access to notifications" ON notifications;
CREATE POLICY "Deny anonymous access to notifications" 
  ON notifications FOR ALL 
  USING (false);
