-- Миграция для переноса рандомайзера из вопросов в задания
-- Добавляет поддержку типа random_number в заданиях

-- 1. Добавить assignment_id в randomizer_questions
ALTER TABLE randomizer_questions 
ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE;

-- 2. Сделать question_id nullable (для обратной совместимости)
ALTER TABLE randomizer_questions 
ALTER COLUMN question_id DROP NOT NULL;

-- 3. Добавить режим рандомайзера (простое число или столы)
ALTER TABLE randomizer_questions 
ADD COLUMN IF NOT EXISTS randomizer_mode TEXT DEFAULT 'tables' CHECK (randomizer_mode IN ('simple', 'tables'));

-- 4. Добавить поля для простого режима (диапазон чисел)
ALTER TABLE randomizer_questions 
ADD COLUMN IF NOT EXISTS number_min INTEGER DEFAULT 1;

ALTER TABLE randomizer_questions 
ADD COLUMN IF NOT EXISTS number_max INTEGER DEFAULT 100;

-- 5. Добавить индекс для assignment_id
CREATE INDEX IF NOT EXISTS idx_randomizer_questions_assignment_id ON randomizer_questions(assignment_id);

-- 6. Добавить constraint: должен быть либо question_id, либо assignment_id
-- Удаляем старый constraint если есть
DO $$
BEGIN
    ALTER TABLE randomizer_questions DROP CONSTRAINT IF EXISTS check_question_or_assignment;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE randomizer_questions 
ADD CONSTRAINT check_question_or_assignment 
CHECK (question_id IS NOT NULL OR assignment_id IS NOT NULL);

-- 7. Добавить поле для хранения сгенерированного числа (для простого режима)
ALTER TABLE randomizer_distributions 
ADD COLUMN IF NOT EXISTS random_number INTEGER;

-- 8. Комментарии к новым полям
COMMENT ON COLUMN randomizer_questions.assignment_id IS 'ID задания (новая связь вместо question_id)';
COMMENT ON COLUMN randomizer_questions.randomizer_mode IS 'Режим: simple - генерация числа, tables - распределение по столам';
COMMENT ON COLUMN randomizer_questions.number_min IS 'Минимальное значение для простого режима';
COMMENT ON COLUMN randomizer_questions.number_max IS 'Максимальное значение для простого режима';
COMMENT ON COLUMN randomizer_distributions.random_number IS 'Сгенерированное случайное число (для простого режима)';

-- 9. Миграция существующих данных: создаём задания для существующих рандомайзеров
-- Этот шаг выполняется вручную при необходимости, так как требует данных из targeted_questions
-- DO $$
-- DECLARE
--     r RECORD;
--     new_assignment_id UUID;
-- BEGIN
--     FOR r IN SELECT rq.*, tq.text, tq.target_audience, tq.target_values, tq.status as q_status
--              FROM randomizer_questions rq
--              JOIN targeted_questions tq ON rq.question_id = tq.id
--              WHERE rq.assignment_id IS NULL
--     LOOP
--         -- Создаём задание
--         INSERT INTO assignments (title, description, answer_format, reward, target_type, target_values, status)
--         VALUES (r.topic, r.description, 'random_number', 0, 
--                 CASE WHEN r.target_audience = 'all' THEN 'all'
--                      WHEN r.target_audience = 'by_direction' THEN 'direction'
--                      ELSE 'individual' END,
--                 r.target_values,
--                 CASE WHEN r.q_status = 'published' THEN 'published' ELSE 'draft' END)
--         RETURNING id INTO new_assignment_id;
--         
--         -- Обновляем рандомайзер
--         UPDATE randomizer_questions SET assignment_id = new_assignment_id WHERE id = r.id;
--     END LOOP;
-- END $$;
