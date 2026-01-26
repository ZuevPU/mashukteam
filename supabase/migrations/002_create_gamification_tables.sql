-- Миграция для создания таблиц системы геймификации
-- Выполняется после 001_create_users_table.sql

-- Добавление полей в таблицу users для геймификации
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;

-- Таблица для хранения истории начисления/списания баллов пользователей
CREATE TABLE IF NOT EXISTS user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
-- Индекс для сортировки по дате
CREATE INDEX IF NOT EXISTS idx_user_points_created_at ON user_points(created_at DESC);

-- Таблица достижений (справочник)
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    points_reward INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для поиска достижений по названию
CREATE INDEX IF NOT EXISTS idx_achievements_name ON achievements(name);

-- Связь пользователей и достижений (многие ко многим)
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);

-- Таблица уровней пользователей
CREATE TABLE IF NOT EXISTS user_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    level INTEGER NOT NULL DEFAULT 1 CHECK (level > 0),
    experience_points INTEGER NOT NULL DEFAULT 0 CHECK (experience_points >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для поиска по user_id (уже уникальный, но для производительности)
CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_levels_level ON user_levels(level);

-- Триггер для автоматического обновления updated_at в user_levels
CREATE TRIGGER update_user_levels_updated_at BEFORE UPDATE ON user_levels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- История действий пользователей (для аналитики)
CREATE TABLE IF NOT EXISTS user_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    action_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для аналитики
CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_action_type ON user_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_user_actions_created_at ON user_actions(created_at DESC);
-- GIN индекс для быстрого поиска по JSONB полю
CREATE INDEX IF NOT EXISTS idx_user_actions_action_data ON user_actions USING GIN (action_data);

-- Комментарии к таблицам
COMMENT ON TABLE user_points IS 'История начисления и списания баллов пользователей';
COMMENT ON COLUMN user_points.points IS 'Количество баллов (может быть отрицательным для списания)';
COMMENT ON COLUMN user_points.reason IS 'Причина начисления/списания баллов';

COMMENT ON TABLE achievements IS 'Справочник достижений';
COMMENT ON COLUMN achievements.points_reward IS 'Количество баллов за получение достижения';

COMMENT ON TABLE user_achievements IS 'Связь пользователей и разблокированных достижений';
COMMENT ON COLUMN user_achievements.unlocked_at IS 'Дата и время разблокировки достижения';

COMMENT ON TABLE user_levels IS 'Уровни и опыт пользователей';
COMMENT ON COLUMN user_levels.level IS 'Текущий уровень пользователя';
COMMENT ON COLUMN user_levels.experience_points IS 'Текущее количество опыта';

COMMENT ON TABLE user_actions IS 'История действий пользователей для аналитики';
COMMENT ON COLUMN user_actions.action_type IS 'Тип действия (например: login, register, complete_task)';
COMMENT ON COLUMN user_actions.action_data IS 'Дополнительные данные действия в формате JSON';

-- Функция для автоматического обновления total_points в users при изменении user_points
CREATE OR REPLACE FUNCTION update_user_total_points()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET total_points = (
        SELECT COALESCE(SUM(points), 0)
        FROM user_points
        WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    )
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления total_points
CREATE TRIGGER update_total_points_on_insert
    AFTER INSERT ON user_points
    FOR EACH ROW
    EXECUTE FUNCTION update_user_total_points();

CREATE TRIGGER update_total_points_on_update
    AFTER UPDATE ON user_points
    FOR EACH ROW
    EXECUTE FUNCTION update_user_total_points();

CREATE TRIGGER update_total_points_on_delete
    AFTER DELETE ON user_points
    FOR EACH ROW
    EXECUTE FUNCTION update_user_total_points();

-- Функция для автоматического обновления current_level в users при изменении user_levels
CREATE OR REPLACE FUNCTION update_user_current_level()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET current_level = NEW.level
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления current_level
CREATE TRIGGER update_current_level_on_change
    AFTER INSERT OR UPDATE ON user_levels
    FOR EACH ROW
    EXECUTE FUNCTION update_user_current_level();
