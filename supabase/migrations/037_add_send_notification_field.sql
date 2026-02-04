-- Миграция 037: Добавление поля send_notification для запланированных публикаций
-- Это поле используется scheduler'ом для определения, нужно ли отправлять уведомления

-- Добавляем поле для targeted_questions
ALTER TABLE targeted_questions 
  ADD COLUMN IF NOT EXISTS send_notification BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN targeted_questions.send_notification IS 'Флаг: отправлять ли уведомление при публикации (используется scheduler)';

-- Добавляем поле для assignments
ALTER TABLE assignments 
  ADD COLUMN IF NOT EXISTS send_notification BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN assignments.send_notification IS 'Флаг: отправлять ли уведомление при публикации (используется scheduler)';

-- Добавляем поле для events (программы/диагностики)
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS send_notification BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN events.send_notification IS 'Флаг: отправлять ли уведомление при публикации (используется scheduler)';
