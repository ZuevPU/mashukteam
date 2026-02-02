-- Миграция для добавления типа 'randomizer' в enum question_type
-- Выполняется после 023_create_event_notes.sql

-- Добавляем значение 'randomizer' в enum question_type
-- Используем DO блок для обработки случая, когда значение уже существует
DO $$ 
BEGIN
    -- Пытаемся добавить значение, если его еще нет
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'randomizer' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'question_type')
    ) THEN
        ALTER TYPE question_type ADD VALUE 'randomizer';
    END IF;
END $$;

COMMENT ON TYPE question_type IS 'Типы вопросов: single - один вариант, multiple - несколько вариантов, scale - шкала, text - текст, randomizer - рандомайзер';
