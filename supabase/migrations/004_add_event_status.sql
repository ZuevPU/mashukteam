-- Добавление статуса мероприятия
-- Выполняется после 003_create_events_system.sql

-- Создаем тип статуса, если его нет (хотя проще использовать text с check constraint для совместимости)
ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed'));

COMMENT ON COLUMN events.status IS 'Статус мероприятия: draft (черновик), published (опубликовано), completed (завершено)';

-- Обновляем существующие записи, чтобы они были опубликованы (чтобы не сломать текущие данные)
UPDATE events SET status = 'published' WHERE status IS NULL;
