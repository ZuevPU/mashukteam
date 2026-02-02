-- Миграция для системы уровней рефлексии
-- Выполняется после 008_add_directions_system.sql

-- Добавление полей для рефлексии в таблицу users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reflection_level INTEGER DEFAULT 1 CHECK (reflection_level >= 1 AND reflection_level <= 5);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reflection_points INTEGER DEFAULT 0 CHECK (reflection_points >= 0);

-- Комментарии к полям
COMMENT ON COLUMN public.users.reflection_level IS 'Уровень рефлексии пользователя (1-5)';
COMMENT ON COLUMN public.users.reflection_points IS 'Баллы рефлексии для расчета уровня';

-- Таблица для отслеживания активности рефлексии
CREATE TABLE IF NOT EXISTS public.reflection_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('event_answer', 'diagnostic_answer', 'targeted_answer', 'assignment_completed')),
    points_awarded INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_reflection_actions_user_id ON public.reflection_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_reflection_actions_created_at ON public.reflection_actions(created_at DESC);

-- Комментарии
COMMENT ON TABLE public.reflection_actions IS 'История активности рефлексии пользователей';
COMMENT ON COLUMN public.reflection_actions.action_type IS 'Тип действия: event_answer, diagnostic_answer, targeted_answer, assignment_completed';
COMMENT ON COLUMN public.reflection_actions.points_awarded IS 'Количество баллов рефлексии за действие';

-- Функция для автоматического расчета уровня рефлексии
CREATE OR REPLACE FUNCTION calculate_reflection_level(points INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF points <= 20 THEN
    RETURN 1; -- "Начал задумываться"
  ELSIF points <= 50 THEN
    RETURN 2; -- "Поймал смысл"
  ELSIF points <= 100 THEN
    RETURN 3; -- "Опять рефлексирует"
  ELSIF points <= 200 THEN
    RETURN 4; -- "Уже хватит рефлексировать"
  ELSE
    RETURN 5; -- "Мастер рефлексии"
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Функция для обновления уровня рефлексии при изменении баллов
CREATE OR REPLACE FUNCTION update_reflection_level()
RETURNS TRIGGER AS $$
DECLARE
  new_level INTEGER;
BEGIN
  new_level := calculate_reflection_level(NEW.reflection_points);
  NEW.reflection_level := new_level;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления уровня рефлексии
CREATE TRIGGER update_user_reflection_level
  BEFORE UPDATE OF reflection_points ON public.users
  FOR EACH ROW
  WHEN (OLD.reflection_points IS DISTINCT FROM NEW.reflection_points)
  EXECUTE FUNCTION update_reflection_level();

-- Включение RLS для reflection_actions
ALTER TABLE public.reflection_actions ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
DROP POLICY IF EXISTS "Service role full access on reflection_actions" ON public.reflection_actions;
CREATE POLICY "Service role full access on reflection_actions" 
  ON public.reflection_actions FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Deny anonymous access to reflection_actions" ON public.reflection_actions;
CREATE POLICY "Deny anonymous access to reflection_actions" 
  ON public.reflection_actions FOR ALL 
  USING (false);
