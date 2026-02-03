-- Миграция для добавления отложенной публикации
-- Добавляет поле scheduled_at для вопросов и заданий

-- Для вопросов
ALTER TABLE targeted_questions 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- Для заданий  
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- Индексы для планировщика
CREATE INDEX IF NOT EXISTS idx_questions_scheduled 
ON targeted_questions(scheduled_at) 
WHERE status = 'draft' AND scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_scheduled 
ON assignments(scheduled_at) 
WHERE status = 'draft' AND scheduled_at IS NOT NULL;

-- Комментарии
COMMENT ON COLUMN targeted_questions.scheduled_at IS 'Время запланированной публикации';
COMMENT ON COLUMN assignments.scheduled_at IS 'Время запланированной публикации';
