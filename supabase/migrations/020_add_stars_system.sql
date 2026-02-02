-- Миграция для системы звездочек за выполненные задания
-- Выполняется после 019_add_question_reflection_points.sql

-- Добавляем поле stars_count в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS stars_count INTEGER DEFAULT 0 CHECK (stars_count >= 0);

-- Комментарий к полю
COMMENT ON COLUMN users.stars_count IS 'Количество собранных звездочек за выполненные задания (одобренные администратором)';

-- Обновляем существующих пользователей: устанавливаем значение по умолчанию 0
UPDATE users SET stars_count = 0 WHERE stars_count IS NULL;

-- Функция для подсчета звездочек пользователя
CREATE OR REPLACE FUNCTION calculate_user_stars(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM assignment_submissions
    WHERE user_id = p_user_id
      AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql;

-- Функция для автоматического обновления stars_count при изменении статуса задания
CREATE OR REPLACE FUNCTION update_user_stars_on_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- Если статус изменился на 'approved' и раньше не был 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE users
    SET stars_count = calculate_user_stars(NEW.user_id)
    WHERE id = NEW.user_id;
  -- Если статус изменился с 'approved' на другой
  ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE users
    SET stars_count = calculate_user_stars(NEW.user_id)
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления stars_count
DROP TRIGGER IF EXISTS trigger_update_user_stars ON assignment_submissions;
CREATE TRIGGER trigger_update_user_stars
  AFTER INSERT OR UPDATE OF status ON assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stars_on_submission();

-- Обновляем stars_count для всех существующих пользователей на основе текущих одобренных заданий
UPDATE users
SET stars_count = calculate_user_stars(id);
