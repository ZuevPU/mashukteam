-- Создание таблицы настроек пользователя
-- Выполняется после 012_make_motivation_optional.sql

-- Таблица настроек пользователя
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
    notifications_enabled BOOLEAN DEFAULT true,
    notification_events BOOLEAN DEFAULT true,
    notification_questions BOOLEAN DEFAULT true,
    notification_assignments BOOLEAN DEFAULT true,
    notification_diagnostics BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Комментарии
COMMENT ON TABLE user_preferences IS 'Настройки пользователя (тема, уведомления)';
COMMENT ON COLUMN user_preferences.theme IS 'Тема интерфейса: light - светлая, dark - темная, auto - автоматическая';
COMMENT ON COLUMN user_preferences.notifications_enabled IS 'Общее включение/выключение уведомлений';
COMMENT ON COLUMN user_preferences.notification_events IS 'Уведомления о новых мероприятиях';
COMMENT ON COLUMN user_preferences.notification_questions IS 'Уведомления о новых вопросах';
COMMENT ON COLUMN user_preferences.notification_assignments IS 'Уведомления о новых заданиях';
COMMENT ON COLUMN user_preferences.notification_diagnostics IS 'Уведомления о новых диагностиках';

-- Включаем RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут читать и обновлять только свои настройки
-- Используем DROP POLICY IF EXISTS для безопасного пересоздания
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
CREATE POLICY "Users can view own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
CREATE POLICY "Users can update own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
CREATE POLICY "Users can insert own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

-- Политика для service_role (backend использует service_role ключ)
DROP POLICY IF EXISTS "Service role full access on user_preferences" ON user_preferences;
CREATE POLICY "Service role full access on user_preferences"
    ON user_preferences FOR ALL
    USING (true)
    WITH CHECK (true);
