-- Миграция для изменения логики подсчета звездочек
-- Вместо COUNT(*) одобренных заданий суммируем reward из assignments
-- Выполняется после 021_add_randomizer_preview.sql

-- Обновляем функцию для подсчета звездочек пользователя
-- Теперь суммируем reward из одобренных заданий
CREATE OR REPLACE FUNCTION calculate_user_stars(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(a.reward)
    FROM assignment_submissions s
    JOIN assignments a ON s.assignment_id = a.id
    WHERE s.user_id = p_user_id
      AND s.status = 'approved'
  ), 0);
END;
$$ LANGUAGE plpgsql;

-- Обновляем stars_count для всех существующих пользователей на основе новой логики
UPDATE users
SET stars_count = calculate_user_stars(id);

-- Комментарий к функции
COMMENT ON FUNCTION calculate_user_stars(UUID) IS 'Подсчитывает количество звездочек пользователя как сумму reward из одобренных заданий';
