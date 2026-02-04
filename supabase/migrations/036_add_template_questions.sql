-- Миграция: Добавление поддержки шаблонных вопросов
-- Шаблонные вопросы можно повторно публиковать с автоматической нумерацией

-- Новые поля для targeted_questions
ALTER TABLE targeted_questions 
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS template_name TEXT,
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES targeted_questions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instance_number INTEGER;

-- Комментарии к полям
COMMENT ON COLUMN targeted_questions.is_template IS 'Флаг: является ли вопрос шаблоном для повторной публикации';
COMMENT ON COLUMN targeted_questions.template_name IS 'Название шаблона (например "Мотивация")';
COMMENT ON COLUMN targeted_questions.template_id IS 'Ссылка на родительский шаблон (для экземпляров)';
COMMENT ON COLUMN targeted_questions.instance_number IS 'Номер экземпляра шаблона (1, 2, 3...)';

-- Индекс для быстрого поиска экземпляров шаблона
CREATE INDEX IF NOT EXISTS idx_targeted_questions_template_id ON targeted_questions(template_id);

-- Индекс для поиска шаблонов
CREATE INDEX IF NOT EXISTS idx_targeted_questions_is_template ON targeted_questions(is_template) WHERE is_template = TRUE;
