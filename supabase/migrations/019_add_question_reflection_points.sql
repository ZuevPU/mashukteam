-- Миграция для добавления баллов рефлексии к вопросам
-- Выполняется после 018_remove_questions_from_events.sql

-- Добавляем поле reflection_points в таблицу targeted_questions
ALTER TABLE targeted_questions ADD COLUMN IF NOT EXISTS reflection_points INTEGER DEFAULT 1 CHECK (reflection_points >= 0);

-- Комментарий к полю
COMMENT ON COLUMN targeted_questions.reflection_points IS 'Количество баллов рефлексии за ответ на вопрос (по умолчанию 1)';

-- Обновляем существующие вопросы: устанавливаем значение по умолчанию 1
UPDATE targeted_questions SET reflection_points = 1 WHERE reflection_points IS NULL;
