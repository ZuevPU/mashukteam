-- Добавляем поле admin_comment для комментария администратора в диагностиках
-- Комментарий будет отображаться курсивом сразу после описания

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS admin_comment TEXT;

COMMENT ON COLUMN public.events.admin_comment IS 'Комментарий администратора (отображается курсивом после описания)';

-- Добавляем поле footer_text для текста в конце диагностики
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS footer_text TEXT;

COMMENT ON COLUMN public.events.footer_text IS 'Текст в конце диагностики (отображается после всех вопросов)';
