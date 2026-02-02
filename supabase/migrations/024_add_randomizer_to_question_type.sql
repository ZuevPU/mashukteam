-- Миграция для добавления типа 'randomizer' в enum question_type
-- Выполняется после 023_create_event_notes.sql

-- Добавляем значение 'randomizer' в enum question_type
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'randomizer';

COMMENT ON TYPE question_type IS 'Типы вопросов: single - один вариант, multiple - несколько вариантов, scale - шкала, text - текст, randomizer - рандомайзер';
