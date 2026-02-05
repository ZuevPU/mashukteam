-- Таблица ленты активности пользователей
-- Хранит публичные действия для отображения в ленте команды

CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Тип активности
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'registration',      -- Регистрация пользователя
    'achievement',       -- Получено достижение
    'assignment_submit', -- Сдано задание
    'assignment_approve', -- Одобрено задание
    'event_complete',    -- Завершено мероприятие
    'diagnostic_complete', -- Пройдена диагностика
    'level_up',          -- Повышение уровня рефлексии
    'question_answer'    -- Ответ на вопрос (опционально)
  )),
  
  -- Заголовок активности
  title TEXT NOT NULL,
  
  -- Описание (опционально)
  description TEXT,
  
  -- Связанная сущность (для deep link)
  entity_type TEXT, -- 'assignment', 'event', 'achievement', etc.
  entity_id UUID,
  
  -- Дополнительные данные в JSON
  metadata JSONB DEFAULT '{}',
  
  -- Публичность (можно скрывать некоторые активности)
  is_public BOOLEAN DEFAULT true,
  
  -- Временные метки
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Индекс для направления (для фильтрации по команде)
  direction TEXT
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_direction ON activity_feed(direction);
CREATE INDEX IF NOT EXISTS idx_activity_feed_public ON activity_feed(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON activity_feed(activity_type);

-- RLS политики
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- Все могут читать публичные активности
CREATE POLICY "activity_feed_select_public" ON activity_feed
  FOR SELECT
  USING (is_public = true);

-- Пользователи могут видеть свои приватные активности
CREATE POLICY "activity_feed_select_own" ON activity_feed
  FOR SELECT
  USING (user_id = auth.uid());

-- Только сервис может создавать/обновлять
CREATE POLICY "activity_feed_insert_service" ON activity_feed
  FOR INSERT
  WITH CHECK (true);

-- Комментарий к таблице
COMMENT ON TABLE activity_feed IS 'Лента активности пользователей для социальных функций';
COMMENT ON COLUMN activity_feed.activity_type IS 'Тип активности: registration, achievement, assignment_submit, etc.';
COMMENT ON COLUMN activity_feed.metadata IS 'Дополнительные данные: points, reward, etc.';

-- Расширение таблицы users для публичного профиля
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS show_in_feed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'team' CHECK (profile_visibility IN ('public', 'team', 'private'));

COMMENT ON COLUMN users.bio IS 'Краткая информация о себе';
COMMENT ON COLUMN users.show_in_feed IS 'Показывать активность в ленте';
COMMENT ON COLUMN users.profile_visibility IS 'Видимость профиля: public, team (только свое направление), private';
