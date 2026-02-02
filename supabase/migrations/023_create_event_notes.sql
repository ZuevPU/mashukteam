-- Миграция для создания таблицы заметок пользователей по мероприятиям
-- Выполняется после 022_update_stars_calculation.sql

CREATE TABLE IF NOT EXISTS event_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, event_id)
);

-- Индекс для быстрого поиска заметок пользователя
CREATE INDEX IF NOT EXISTS idx_event_notes_user_id ON event_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_event_notes_event_id ON event_notes(event_id);

-- Комментарии
COMMENT ON TABLE event_notes IS 'Заметки пользователей по мероприятиям';
COMMENT ON COLUMN event_notes.note_text IS 'Текст заметки пользователя';
COMMENT ON COLUMN event_notes.user_id IS 'ID пользователя, создавшего заметку';
COMMENT ON COLUMN event_notes.event_id IS 'ID мероприятия, к которому относится заметка';

-- RLS политики
ALTER TABLE event_notes ENABLE ROW LEVEL SECURITY;

-- Пользователи могут читать и изменять только свои заметки
CREATE POLICY "Users can view their own notes" ON event_notes
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own notes" ON event_notes
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own notes" ON event_notes
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own notes" ON event_notes
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Service role имеет полный доступ (для backend)
CREATE POLICY "Service role full access on event_notes" ON event_notes
    FOR ALL USING (true);
