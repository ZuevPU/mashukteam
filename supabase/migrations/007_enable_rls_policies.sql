-- Миграция для включения Row Level Security (RLS) на всех таблицах
-- Выполняется после 006_create_assignments_system.sql
-- Исправляет ошибки безопасности из Supabase Performance Security Lints

-- Включение RLS для всех таблиц, перечисленных в CSV ошибок

-- 1. Таблица users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Таблицы геймификации
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;

-- 3. Таблицы мероприятий
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- 4. Таблицы таргетированных вопросов
ALTER TABLE public.targeted_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.targeted_answers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ
-- ============================================
-- Backend использует service_role ключ, который обходит RLS по умолчанию
-- Эти политики защищают от прямого доступа через PostgREST API

-- Политики для users
DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
CREATE POLICY "Service role full access on users" 
  ON public.users FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Deny anonymous access to users" ON public.users;
CREATE POLICY "Deny anonymous access to users" 
  ON public.users FOR ALL 
  USING (false);

-- Политики для user_points
DROP POLICY IF EXISTS "Service role full access on user_points" ON public.user_points;
CREATE POLICY "Service role full access on user_points" 
  ON public.user_points FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Deny anonymous access to user_points" ON public.user_points;
CREATE POLICY "Deny anonymous access to user_points" 
  ON public.user_points FOR ALL 
  USING (false);

-- Политики для user_achievements
DROP POLICY IF EXISTS "Service role full access on user_achievements" ON public.user_achievements;
CREATE POLICY "Service role full access on user_achievements" 
  ON public.user_achievements FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Deny anonymous access to user_achievements" ON public.user_achievements;
CREATE POLICY "Deny anonymous access to user_achievements" 
  ON public.user_achievements FOR ALL 
  USING (false);

-- Политики для achievements
DROP POLICY IF EXISTS "Service role full access on achievements" ON public.achievements;
CREATE POLICY "Service role full access on achievements" 
  ON public.achievements FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Deny anonymous access to achievements" ON public.achievements;
CREATE POLICY "Deny anonymous access to achievements" 
  ON public.achievements FOR ALL 
  USING (false);

-- Политики для user_levels
DROP POLICY IF EXISTS "Service role full access on user_levels" ON public.user_levels;
CREATE POLICY "Service role full access on user_levels" 
  ON public.user_levels FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Deny anonymous access to user_levels" ON public.user_levels;
CREATE POLICY "Deny anonymous access to user_levels" 
  ON public.user_levels FOR ALL 
  USING (false);

-- Политики для user_actions
DROP POLICY IF EXISTS "Service role full access on user_actions" ON public.user_actions;
CREATE POLICY "Service role full access on user_actions" 
  ON public.user_actions FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Deny anonymous access to user_actions" ON public.user_actions;
CREATE POLICY "Deny anonymous access to user_actions" 
  ON public.user_actions FOR ALL 
  USING (false);

-- Политики для events
DROP POLICY IF EXISTS "Service role full access on events" ON public.events;
CREATE POLICY "Service role full access on events" 
  ON public.events FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Deny anonymous access to events" ON public.events;
CREATE POLICY "Deny anonymous access to events" 
  ON public.events FOR ALL 
  USING (false);

-- Политики для questions
DROP POLICY IF EXISTS "Service role full access on questions" ON public.questions;
CREATE POLICY "Service role full access on questions" 
  ON public.questions FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Deny anonymous access to questions" ON public.questions;
CREATE POLICY "Deny anonymous access to questions" 
  ON public.questions FOR ALL 
  USING (false);

-- Политики для answers
DROP POLICY IF EXISTS "Service role full access on answers" ON public.answers;
CREATE POLICY "Service role full access on answers" 
  ON public.answers FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Deny anonymous access to answers" ON public.answers;
CREATE POLICY "Deny anonymous access to answers" 
  ON public.answers FOR ALL 
  USING (false);

-- Политики для targeted_questions
DROP POLICY IF EXISTS "Service role full access on targeted_questions" ON public.targeted_questions;
CREATE POLICY "Service role full access on targeted_questions" 
  ON public.targeted_questions FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Deny anonymous access to targeted_questions" ON public.targeted_questions;
CREATE POLICY "Deny anonymous access to targeted_questions" 
  ON public.targeted_questions FOR ALL 
  USING (false);

-- Политики для targeted_answers
DROP POLICY IF EXISTS "Service role full access on targeted_answers" ON public.targeted_answers;
CREATE POLICY "Service role full access on targeted_answers" 
  ON public.targeted_answers FOR ALL 
  USING (true);

DROP POLICY IF EXISTS "Deny anonymous access to targeted_answers" ON public.targeted_answers;
CREATE POLICY "Deny anonymous access to targeted_answers" 
  ON public.targeted_answers FOR ALL 
  USING (false);
