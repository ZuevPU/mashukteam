-- Удаление UNIQUE constraint для разрешения множественных попыток выполнения заданий
-- Добавление индекса для быстрого получения последней попытки
-- Добавление поля attempt_number для нумерации попыток

-- Удаляем UNIQUE constraint
ALTER TABLE public.assignment_submissions 
DROP CONSTRAINT IF EXISTS assignment_submissions_user_id_assignment_id_key;

-- Добавляем поле attempt_number
ALTER TABLE public.assignment_submissions 
ADD COLUMN IF NOT EXISTS attempt_number INTEGER;

-- Создаем функцию для автоматического вычисления attempt_number при вставке
CREATE OR REPLACE FUNCTION set_attempt_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Получаем максимальный номер попытки для этого пользователя и задания
  SELECT COALESCE(MAX(attempt_number), 0) + 1
  INTO NEW.attempt_number
  FROM public.assignment_submissions
  WHERE user_id = NEW.user_id 
    AND assignment_id = NEW.assignment_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматической установки attempt_number
DROP TRIGGER IF EXISTS trigger_set_attempt_number ON public.assignment_submissions;
CREATE TRIGGER trigger_set_attempt_number
  BEFORE INSERT ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION set_attempt_number();

-- Обновляем существующие записи, устанавливая attempt_number = 1 для каждой уникальной пары (user_id, assignment_id)
-- Это нужно для корректной работы с уже существующими данными
UPDATE public.assignment_submissions
SET attempt_number = 1
WHERE attempt_number IS NULL;

-- Создаем индекс для быстрого получения последней попытки
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_user_assignment_created 
ON public.assignment_submissions(user_id, assignment_id, created_at DESC);

-- Создаем индекс для быстрого получения всех попыток пользователя по заданию
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_user_assignment_attempt 
ON public.assignment_submissions(user_id, assignment_id, attempt_number DESC);
