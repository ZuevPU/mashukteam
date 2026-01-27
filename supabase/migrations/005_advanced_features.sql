-- Расширенный функционал: Типы пользователей, Диагностика, Таргетированные вопросы
-- Выполняется после 004_add_event_status.sql

-- 1. Типы пользователей
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT;
COMMENT ON COLUMN users.user_type IS 'Тип пользователя (назначенный администратором)';

-- 2. Тип мероприятия (Событие или Диагностика)
ALTER TABLE events ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'event' CHECK (type IN ('event', 'diagnostic'));
COMMENT ON COLUMN events.type IS 'Тип события: event - мероприятие, diagnostic - входная диагностика';

-- 3. Таргетированные вопросы (не привязанные к событиям)
-- Используем структуру, похожую на questions, но с настройками таргетинга
CREATE TABLE IF NOT EXISTS targeted_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    type question_type NOT NULL, -- enum из прошлой миграции
    options JSONB,
    char_limit INTEGER,
    
    -- Настройки таргетинга
    target_audience TEXT NOT NULL CHECK (target_audience IN ('all', 'by_type', 'individual')),
    target_values JSONB, -- Массив строк: ['type1', 'type2'] или uuid пользователей ['uuid1', 'uuid2']
    
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE targeted_questions IS 'Вопросы, задаваемые отдельно от мероприятий';
COMMENT ON COLUMN targeted_questions.target_audience IS 'Тип аудитории: all - все, by_type - по типу пользователя, individual - конкретным людям';

-- 4. Ответы на таргетированные вопросы
CREATE TABLE IF NOT EXISTS targeted_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES targeted_questions(id) ON DELETE CASCADE,
    answer_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, question_id) -- Один ответ на один вопрос
);

CREATE INDEX IF NOT EXISTS idx_targeted_answers_user_id ON targeted_answers(user_id);
