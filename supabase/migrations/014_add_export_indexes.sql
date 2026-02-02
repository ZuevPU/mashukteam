-- Добавление индексов для оптимизации запросов экспорта
-- Выполняется после 013_create_user_preferences.sql

-- Индексы для таблицы answers (ответы на мероприятия/диагностики)
CREATE INDEX IF NOT EXISTS idx_answers_user_id_created_at ON answers(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_answers_event_id_created_at ON answers(event_id, created_at DESC);

-- Индексы для таблицы targeted_answers (ответы на персональные вопросы)
CREATE INDEX IF NOT EXISTS idx_targeted_answers_user_id_created_at ON targeted_answers(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_targeted_answers_question_id_created_at ON targeted_answers(question_id, created_at DESC);

-- Индексы для таблицы assignment_submissions (ответы на задания)
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_user_id_created_at ON assignment_submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id_created_at ON assignment_submissions(assignment_id, created_at DESC);

-- Индексы для таблицы users (для фильтрации по направлению и типу)
CREATE INDEX IF NOT EXISTS idx_users_direction_id ON users(direction_id) WHERE direction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type) WHERE user_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Комментарии
COMMENT ON INDEX idx_answers_user_id_created_at IS 'Индекс для быстрого поиска ответов пользователя по дате';
COMMENT ON INDEX idx_targeted_answers_user_id_created_at IS 'Индекс для быстрого поиска ответов на персональные вопросы по пользователю и дате';
COMMENT ON INDEX idx_assignment_submissions_user_id_created_at IS 'Индекс для быстрого поиска выполненных заданий по пользователю и дате';
