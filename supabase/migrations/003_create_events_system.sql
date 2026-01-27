-- Миграция для системы мероприятий и опросов
-- Выполняется после 002_create_gamification_tables.sql

-- 1. Добавление флага администратора в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin INTEGER DEFAULT 0 CHECK (is_admin IN (0, 1));
COMMENT ON COLUMN users.is_admin IS 'Флаг администратора: 0 - пользователь, 1 - администратор';

-- 2. Таблица мероприятий (events)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    speaker TEXT,
    description TEXT,
    audience TEXT,
    event_date DATE,
    event_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE events IS 'Таблица мероприятий';

-- 3. Тип вопроса (enum)
DO $$ BEGIN
    CREATE TYPE question_type AS ENUM ('single', 'multiple', 'scale', 'text');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Таблица вопросов (questions)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type question_type NOT NULL,
    options JSONB, -- Варианты ответов для single/multiple
    char_limit INTEGER, -- Лимит символов для text
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_index INTEGER DEFAULT 0 -- Для сортировки вопросов
);

CREATE INDEX IF NOT EXISTS idx_questions_event_id ON questions(event_id);

COMMENT ON TABLE questions IS 'Таблица вопросов к мероприятиям';
COMMENT ON COLUMN questions.options IS 'JSON массив вариантов ответов';

-- 5. Таблица ответов (answers)
CREATE TABLE IF NOT EXISTS answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_data JSONB NOT NULL, -- Ответ пользователя
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_answers_user_id ON answers(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_event_id ON answers(event_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);

COMMENT ON TABLE answers IS 'Таблица ответов пользователей';
