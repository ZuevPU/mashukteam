-- Миграция для добавления группировки мероприятий по дням/группам
-- Выполняется после 007_enable_rls_policies.sql

-- Добавление полей для группировки мероприятий
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS group_order INTEGER DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_order INTEGER DEFAULT 0;

-- Комментарии к полям
COMMENT ON COLUMN public.events.group_name IS 'Название группы мероприятий (например, "День 1", "День 2")';
COMMENT ON COLUMN public.events.group_order IS 'Порядок группы для сортировки (меньше = выше)';
COMMENT ON COLUMN public.events.event_order IS 'Порядок мероприятия внутри группы (меньше = выше)';

-- Индексы для быстрой сортировки
CREATE INDEX IF NOT EXISTS idx_events_group_name ON public.events(group_name);
CREATE INDEX IF NOT EXISTS idx_events_group_order ON public.events(group_order, event_order);
