-- Миграция для создания таблицы рассылок
-- Позволяет админам отправлять информационные сообщения с фото пользователям

CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'by_direction', 'individual')),
  target_values JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'scheduled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled_at ON broadcasts(scheduled_at) WHERE status = 'scheduled';

-- Комментарии
COMMENT ON TABLE broadcasts IS 'Информационные рассылки от администраторов';
COMMENT ON COLUMN broadcasts.target_type IS 'Тип получателей: all, by_direction, individual';
COMMENT ON COLUMN broadcasts.target_values IS 'Значения для фильтрации (направления или ID пользователей)';
COMMENT ON COLUMN broadcasts.image_url IS 'URL изображения в Supabase Storage';
