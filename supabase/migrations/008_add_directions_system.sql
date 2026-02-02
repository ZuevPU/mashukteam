-- Миграция для системы направлений
-- Выполняется после 007_enable_rls_policies.sql

-- Создание таблицы направлений
CREATE TABLE IF NOT EXISTS public.directions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Индекс для быстрого поиска по slug
CREATE INDEX IF NOT EXISTS idx_directions_slug ON public.directions(slug);

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_directions_updated_at BEFORE UPDATE ON public.directions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Комментарии
COMMENT ON TABLE public.directions IS 'Таблица направлений для распределения участников';
COMMENT ON COLUMN public.directions.name IS 'Название направления';
COMMENT ON COLUMN public.directions.slug IS 'Уникальный идентификатор направления';
COMMENT ON COLUMN public.directions.description IS 'Описание направления';

-- Добавление полей в таблицу users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS direction_id UUID REFERENCES public.directions(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS direction_selected_at TIMESTAMP WITH TIME ZONE;

-- Комментарии к полям users
COMMENT ON COLUMN public.users.direction_id IS 'ID направления, выбранного пользователем';
COMMENT ON COLUMN public.users.direction_selected_at IS 'Дата и время выбора направления пользователем';

-- Индекс для быстрого поиска пользователей по направлению
CREATE INDEX IF NOT EXISTS idx_users_direction_id ON public.users(direction_id);

-- Включение RLS для directions
ALTER TABLE public.directions ENABLE ROW LEVEL SECURITY;

-- Политики безопасности для directions
DROP POLICY IF EXISTS "Service role full access on directions" ON public.directions;
CREATE POLICY "Service role full access on directions" 
  ON public.directions FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Deny anonymous access to directions" ON public.directions;
CREATE POLICY "Deny anonymous access to directions" 
  ON public.directions FOR ALL 
  USING (false);

-- Вставка примерных направлений (можно будет изменить через админку)
INSERT INTO public.directions (name, slug, description) VALUES
('Направление 1', 'direction_1', 'Описание направления 1'),
('Направление 2', 'direction_2', 'Описание направления 2'),
('Направление 3', 'direction_3', 'Описание направления 3')
ON CONFLICT (slug) DO NOTHING;
