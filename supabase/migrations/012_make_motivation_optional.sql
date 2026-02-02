-- Миграция для изменения поля motivation на необязательное
-- Убираем ограничение NOT NULL и устанавливаем значение по умолчанию

-- Изменяем поле motivation на nullable
ALTER TABLE users 
ALTER COLUMN motivation DROP NOT NULL;

-- Устанавливаем пустую строку по умолчанию для существующих записей с NULL
UPDATE users 
SET motivation = '' 
WHERE motivation IS NULL;

-- Комментарий к полю
COMMENT ON COLUMN users.motivation IS 'Мотивация пользователя для участия в программе (необязательное поле)';
