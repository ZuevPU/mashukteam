-- Миграция для добавления новых типов ответов в assignments
-- Добавляет random_number и photo_upload в CHECK constraint

-- 1. Удаляем старый CHECK constraint
ALTER TABLE assignments 
DROP CONSTRAINT IF EXISTS assignments_answer_format_check;

-- 2. Добавляем новый CHECK constraint с новыми типами
ALTER TABLE assignments 
ADD CONSTRAINT assignments_answer_format_check 
CHECK (answer_format IN ('text', 'number', 'link', 'random_number', 'photo_upload'));

-- 3. Комментарий
COMMENT ON COLUMN assignments.answer_format IS 'Формат ответа: text (текст), number (число), link (ссылка), random_number (случайное число/рандомайзер), photo_upload (загрузка фото)';
