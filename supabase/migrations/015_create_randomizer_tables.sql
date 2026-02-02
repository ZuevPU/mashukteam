-- Миграция для системы рандомайзеров вопросов
-- Выполняется после 005_advanced_features.sql

-- 1. Таблица вопросов-рандомайзеров
CREATE TABLE IF NOT EXISTS randomizer_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES targeted_questions(id) ON DELETE CASCADE,
    tables_count INTEGER NOT NULL CHECK (tables_count > 0),
    participants_per_table INTEGER NOT NULL CHECK (participants_per_table > 0),
    topic TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'distributed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    distributed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_randomizer_questions_question_id ON randomizer_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_randomizer_questions_status ON randomizer_questions(status);

COMMENT ON TABLE randomizer_questions IS 'Вопросы-рандомайзеры для распределения участников по столам';
COMMENT ON COLUMN randomizer_questions.tables_count IS 'Количество столов';
COMMENT ON COLUMN randomizer_questions.participants_per_table IS 'Количество участников на стол';
COMMENT ON COLUMN randomizer_questions.status IS 'Статус: open - открыт для участия, closed - закрыт, distributed - распределен';

-- 2. Таблица участников рандомайзера
CREATE TABLE IF NOT EXISTS randomizer_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    randomizer_id UUID NOT NULL REFERENCES randomizer_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(randomizer_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_randomizer_participants_randomizer_id ON randomizer_participants(randomizer_id);
CREATE INDEX IF NOT EXISTS idx_randomizer_participants_user_id ON randomizer_participants(user_id);

COMMENT ON TABLE randomizer_participants IS 'Участники рандомайзера (кто нажал "Участвую")';

-- 3. Таблица распределения по столам
CREATE TABLE IF NOT EXISTS randomizer_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    randomizer_id UUID NOT NULL REFERENCES randomizer_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    table_number INTEGER NOT NULL CHECK (table_number > 0),
    distributed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(randomizer_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_randomizer_distributions_randomizer_id ON randomizer_distributions(randomizer_id);
CREATE INDEX IF NOT EXISTS idx_randomizer_distributions_user_id ON randomizer_distributions(user_id);
CREATE INDEX IF NOT EXISTS idx_randomizer_distributions_table_number ON randomizer_distributions(randomizer_id, table_number);

COMMENT ON TABLE randomizer_distributions IS 'Распределение участников по столам после подведения итогов';

-- 4. Включение RLS
ALTER TABLE randomizer_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE randomizer_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE randomizer_distributions ENABLE ROW LEVEL SECURITY;

-- 5. Политики безопасности (service_role имеет полный доступ)
DROP POLICY IF EXISTS "Service role full access on randomizer_questions" ON randomizer_questions;
CREATE POLICY "Service role full access on randomizer_questions" 
  ON randomizer_questions FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Deny anonymous access to randomizer_questions" ON randomizer_questions;
CREATE POLICY "Deny anonymous access to randomizer_questions" 
  ON randomizer_questions FOR ALL 
  USING (false);

DROP POLICY IF EXISTS "Service role full access on randomizer_participants" ON randomizer_participants;
CREATE POLICY "Service role full access on randomizer_participants" 
  ON randomizer_participants FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Deny anonymous access to randomizer_participants" ON randomizer_participants;
CREATE POLICY "Deny anonymous access to randomizer_participants" 
  ON randomizer_participants FOR ALL 
  USING (false);

DROP POLICY IF EXISTS "Service role full access on randomizer_distributions" ON randomizer_distributions;
CREATE POLICY "Service role full access on randomizer_distributions" 
  ON randomizer_distributions FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Deny anonymous access to randomizer_distributions" ON randomizer_distributions;
CREATE POLICY "Deny anonymous access to randomizer_distributions" 
  ON randomizer_distributions FOR ALL 
  USING (false);
