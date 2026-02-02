-- Миграция для добавления режима предпросмотра распределения рандомайзера
-- Выполняется после 020_add_stars_system.sql

-- Добавляем поле preview_mode в таблицу randomizer_distributions
ALTER TABLE randomizer_distributions ADD COLUMN IF NOT EXISTS preview_mode BOOLEAN DEFAULT false;

-- Комментарий к полю
COMMENT ON COLUMN randomizer_distributions.preview_mode IS 'Режим предпросмотра (true) или финальное распределение (false). В режиме предпросмотра администратор может редактировать распределение перед публикацией';

-- Обновляем существующие распределения: устанавливаем preview_mode = false (финальное распределение)
UPDATE randomizer_distributions SET preview_mode = false WHERE preview_mode IS NULL;

-- Добавляем индекс для быстрого поиска по randomizer_id и preview_mode
CREATE INDEX IF NOT EXISTS idx_randomizer_distributions_preview ON randomizer_distributions(randomizer_id, preview_mode);

-- Обновляем уникальное ограничение: один пользователь может быть в одном рандомайзере только один раз в финальном распределении
-- Но может быть несколько раз в предпросмотре (для редактирования)
-- Удаляем старое ограничение и создаем новое с учетом preview_mode
ALTER TABLE randomizer_distributions DROP CONSTRAINT IF EXISTS randomizer_distributions_randomizer_id_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_randomizer_distributions_unique_final 
  ON randomizer_distributions(randomizer_id, user_id) 
  WHERE preview_mode = false;

-- Комментарий к таблице
COMMENT ON TABLE randomizer_distributions IS 'Распределение участников по столам. preview_mode=true - предпросмотр (можно редактировать), preview_mode=false - финальное распределение (опубликовано)';
