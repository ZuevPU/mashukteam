-- Миграция для исправления статусов пользователей
-- Устанавливает статус 'new' для пользователей с NULL или невалидным статусом
-- Устанавливает статус 'registered' для пользователей с заполненной мотивацией

-- Обновляем пользователей с NULL статусом или невалидным статусом на 'new'
UPDATE users
SET status = 'new'
WHERE status IS NULL 
   OR status NOT IN ('new', 'registered');

-- Примечание: Мотивация больше не используется для определения статуса регистрации
-- Статус 'registered' устанавливается только при явном завершении регистрации через API

-- Добавляем ограничение для статуса, если его еще нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_status_check'
  ) THEN
    ALTER TABLE users 
    ADD CONSTRAINT users_status_check 
    CHECK (status IN ('new', 'registered'));
  END IF;
END $$;
