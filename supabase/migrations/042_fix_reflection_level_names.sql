-- Исправление названий уровней рефлексии и пересчет уровней для всех пользователей
-- Выполняется после 041_allow_multiple_submissions.sql

-- Обновляем функцию calculate_reflection_level с правильными названиями уровней
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
    RETURN 4; -- "Мастер рефлексии"
  ELSE
    RETURN 5; -- "Преисполнился в рефлексии"
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Пересчитываем уровни рефлексии для всех пользователей на основе их текущих баллов
UPDATE public.users 
SET reflection_level = calculate_reflection_level(reflection_points)
WHERE reflection_points IS NOT NULL;

-- Комментарий к функции для документации
COMMENT ON FUNCTION calculate_reflection_level(INTEGER) IS 
'Вычисляет уровень рефлексии на основе баллов:
- <= 20: уровень 1 "Начал задумываться"
- <= 50: уровень 2 "Поймал смысл"
- <= 100: уровень 3 "Опять рефлексирует"
- <= 200: уровень 4 "Мастер рефлексии"
- > 200: уровень 5 "Преисполнился в рефлексии"';
