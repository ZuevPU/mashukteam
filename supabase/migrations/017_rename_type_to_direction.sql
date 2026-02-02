-- Миграция для переименования "тип" в "направление"
-- Выполняется после 016_create_notifications_table.sql

-- 1. Переименовываем user_type в direction
ALTER TABLE users RENAME COLUMN user_type TO direction;

-- 2. Обновляем комментарий
COMMENT ON COLUMN users.direction IS 'Направление пользователя (назначенное администратором)';

-- 3. Удаляем колонку direction_id (теперь используем direction как строку)
ALTER TABLE users DROP COLUMN IF EXISTS direction_id;
ALTER TABLE users DROP COLUMN IF EXISTS direction_selected_at;

-- 4. Переименовываем таблицу user_types в directions (если она еще не переименована)
-- Проверяем, существует ли таблица directions
DO $$
BEGIN
    -- Если таблица directions не существует, переименовываем user_types
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'directions') THEN
        ALTER TABLE IF EXISTS user_types RENAME TO directions;
        COMMENT ON TABLE directions IS 'Справочник направлений пользователей';
        COMMENT ON COLUMN directions.slug IS 'Код направления (используется в users.direction)';
    END IF;
END $$;

-- 5. Обновляем индексы
DROP INDEX IF EXISTS idx_users_user_type;
CREATE INDEX IF NOT EXISTS idx_users_direction ON users(direction) WHERE direction IS NOT NULL;

-- 6. Обновляем assignments.target_type: 'user_type' -> 'direction'
UPDATE assignments SET target_type = 'direction' WHERE target_type = 'user_type';
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_target_type_check;
ALTER TABLE assignments ADD CONSTRAINT assignments_target_type_check CHECK (target_type IN ('all', 'direction', 'individual'));

-- 7. Обновляем targeted_questions.target_audience: 'by_type' -> 'by_direction'
UPDATE targeted_questions SET target_audience = 'by_direction' WHERE target_audience = 'by_type';
ALTER TABLE targeted_questions DROP CONSTRAINT IF EXISTS targeted_questions_target_audience_check;
ALTER TABLE targeted_questions ADD CONSTRAINT targeted_questions_target_audience_check CHECK (target_audience IN ('all', 'by_direction', 'individual'));
