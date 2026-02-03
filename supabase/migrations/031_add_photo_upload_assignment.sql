-- Миграция для добавления типа задания "Загрузка фото"
-- Добавляет поле file_url в таблицу assignment_submissions

-- 1. Добавляем поле file_url для хранения ссылки на загруженный файл
ALTER TABLE assignment_submissions 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- 2. Комментарий к полю
COMMENT ON COLUMN assignment_submissions.file_url IS 'URL загруженного файла в Supabase Storage';

-- 3. Создание бакета для загрузок заданий (выполняется через Supabase Dashboard или API)
-- Бакет: task_submissions
-- Настройки:
--   - Public: false (приватный бакет)
--   - File size limit: 10MB
--   - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp

-- ПРИМЕЧАНИЕ: Следующие команды для Storage нужно выполнить через Supabase Dashboard:
-- 1. Создать бакет 'task_submissions' с настройками:
--    - Public: No
--    - File size limit: 10485760 (10MB)
--    - Allowed mime types: image/*
-- 2. Настроить RLS политики для бакета:
--    - INSERT: authenticated users can upload to their folder
--    - SELECT: authenticated users can view their own files, admins can view all
--    - DELETE: authenticated users can delete their own files

-- Создаем индекс для поиска по file_url
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_file_url 
ON assignment_submissions(file_url) 
WHERE file_url IS NOT NULL;
