-- Миграция для исправления типа вопросов: разрешаем 'randomizer'
-- Выполняется после 024_add_randomizer_to_question_type.sql

-- Способ 1: Пытаемся добавить 'randomizer' в enum (если еще не добавлено)
DO $$ 
BEGIN
    -- Пытаемся добавить значение, если его еще нет
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'randomizer' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'question_type')
    ) THEN
        BEGIN
            ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'randomizer';
        EXCEPTION WHEN OTHERS THEN
            -- Если не получилось добавить в enum, пропускаем
            RAISE NOTICE 'Could not add randomizer to question_type enum: %', SQLERRM;
        END;
    END IF;
END $$;

-- Способ 2 (альтернативный): Изменяем колонку type на TEXT
-- Это более надежный способ, который точно сработает

-- Для таблицы targeted_questions
DO $$
BEGIN
    -- Проверяем, является ли колонка type enum
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'targeted_questions' 
        AND column_name = 'type'
        AND udt_name = 'question_type'
    ) THEN
        -- Меняем тип колонки на TEXT
        ALTER TABLE targeted_questions 
        ALTER COLUMN type TYPE TEXT USING type::TEXT;
        
        -- Добавляем CHECK constraint для валидации
        ALTER TABLE targeted_questions 
        DROP CONSTRAINT IF EXISTS targeted_questions_type_check;
        
        ALTER TABLE targeted_questions 
        ADD CONSTRAINT targeted_questions_type_check 
        CHECK (type IN ('single', 'multiple', 'scale', 'text', 'randomizer'));
        
        RAISE NOTICE 'Changed targeted_questions.type from enum to TEXT';
    END IF;
END $$;

-- Для таблицы questions (если нужно)
DO $$
BEGIN
    -- Проверяем, является ли колонка type enum
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' 
        AND column_name = 'type'
        AND udt_name = 'question_type'
    ) THEN
        -- Меняем тип колонки на TEXT
        ALTER TABLE questions 
        ALTER COLUMN type TYPE TEXT USING type::TEXT;
        
        -- Добавляем CHECK constraint для валидации
        ALTER TABLE questions 
        DROP CONSTRAINT IF EXISTS questions_type_check;
        
        ALTER TABLE questions 
        ADD CONSTRAINT questions_type_check 
        CHECK (type IN ('single', 'multiple', 'scale', 'text', 'randomizer'));
        
        RAISE NOTICE 'Changed questions.type from enum to TEXT';
    END IF;
END $$;

COMMENT ON COLUMN targeted_questions.type IS 'Тип вопроса: single, multiple, scale, text, randomizer';
