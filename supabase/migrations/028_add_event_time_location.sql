-- Миграция для добавления полей времени и места в таблицу events
-- Добавляет start_time, end_time и location для программы обучения

-- 1. Добавляем новые поля
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS location TEXT;

-- 2. Комментарии к полям
COMMENT ON COLUMN events.start_time IS 'Время начала мероприятия';
COMMENT ON COLUMN events.end_time IS 'Время окончания мероприятия';
COMMENT ON COLUMN events.location IS 'Место проведения';

-- 3. Миграция данных: копируем event_time в start_time для существующих записей
UPDATE events 
SET start_time = event_time 
WHERE event_time IS NOT NULL AND start_time IS NULL;
