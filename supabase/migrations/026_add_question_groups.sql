-- Миграция для добавления группировки вопросов
-- Аналогично группировке мероприятий (events)

-- 1. Добавляем поля для группировки в targeted_questions
ALTER TABLE public.targeted_questions ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE public.targeted_questions ADD COLUMN IF NOT EXISTS group_order INTEGER DEFAULT 0;
ALTER TABLE public.targeted_questions ADD COLUMN IF NOT EXISTS question_order INTEGER DEFAULT 0;

-- 2. Комментарии к новым полям
COMMENT ON COLUMN public.targeted_questions.group_name IS 'Название группы вопросов (например, "Рефлексия", "Обратная связь")';
COMMENT ON COLUMN public.targeted_questions.group_order IS 'Порядок группы для сортировки (меньше = выше)';
COMMENT ON COLUMN public.targeted_questions.question_order IS 'Порядок вопроса внутри группы (меньше = выше)';

-- 3. Индексы для сортировки
CREATE INDEX IF NOT EXISTS idx_targeted_questions_group_name ON public.targeted_questions(group_name);
CREATE INDEX IF NOT EXISTS idx_targeted_questions_group_order ON public.targeted_questions(group_order, question_order);

-- 4. Устанавливаем значения по умолчанию для существующих записей
UPDATE public.targeted_questions 
SET group_name = 'Общие вопросы', group_order = 0, question_order = 0 
WHERE group_name IS NULL;
