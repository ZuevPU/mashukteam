-- Скрипт для наполнения базы данных тестовыми данными
-- ВНИМАНИЕ: Этот скрипт удаляет существующие данные! Используйте только для тестирования.

-- Очистка существующих данных (опционально, закомментируйте если нужно сохранить данные)
-- TRUNCATE TABLE public.answers CASCADE;
-- TRUNCATE TABLE public.targeted_answers CASCADE;
-- TRUNCATE TABLE public.assignment_submissions CASCADE;
-- TRUNCATE TABLE public.questions CASCADE;
-- TRUNCATE TABLE public.targeted_questions CASCADE;
-- TRUNCATE TABLE public.events CASCADE;
-- TRUNCATE TABLE public.assignments CASCADE;

-- 1. Направления (если еще не созданы)
INSERT INTO public.directions (name, slug, description) VALUES
('Разработка', 'development', 'Направление для разработчиков'),
('Дизайн', 'design', 'Направление для дизайнеров'),
('Маркетинг', 'marketing', 'Направление для маркетологов'),
('Менеджмент', 'management', 'Направление для менеджеров'),
('Аналитика', 'analytics', 'Направление для аналитиков')
ON CONFLICT (slug) DO NOTHING;

-- 2. Типы пользователей (если еще не созданы)
INSERT INTO public.user_types (name, slug) VALUES
('Студент', 'student'),
('Выпускник', 'graduate'),
('Ментор', 'mentor'),
('Эксперт', 'expert')
ON CONFLICT (slug) DO NOTHING;

-- 3. Тестовые мероприятия (День 1)
INSERT INTO public.events (id, title, speaker, description, audience, event_date, event_time, type, status, group_name, group_order, event_order) VALUES
(gen_random_uuid(), 'Мастер-класс по React', 'Иван Петров', 'Изучение основ React и создание первого приложения', 'Мастер-класс', '2026-02-01', '10:00', 'event', 'published', 'День 1', 1, 1),
(gen_random_uuid(), 'Лекция по TypeScript', 'Мария Сидорова', 'Продвинутые возможности TypeScript', 'Лекция', '2026-02-01', '14:00', 'event', 'published', 'День 1', 1, 2),
(gen_random_uuid(), 'Воркшоп по Git', 'Алексей Иванов', 'Практическая работа с Git и GitHub', 'Воркшоп', '2026-02-01', '16:00', 'event', 'published', 'День 1', 1, 3)
ON CONFLICT DO NOTHING;

-- 4. Тестовые мероприятия (День 2)
INSERT INTO public.events (id, title, speaker, description, audience, event_date, event_time, type, status, group_name, group_order, event_order) VALUES
(gen_random_uuid(), 'Дизайн-системы', 'Елена Козлова', 'Создание и использование дизайн-систем', 'Лекция', '2026-02-02', '10:00', 'event', 'published', 'День 2', 2, 1),
(gen_random_uuid(), 'UX Research', 'Дмитрий Смирнов', 'Методы исследования пользовательского опыта', 'Мастер-класс', '2026-02-02', '14:00', 'event', 'published', 'День 2', 2, 2)
ON CONFLICT DO NOTHING;

-- 5. Тестовые диагностики
INSERT INTO public.events (id, title, description, event_date, type, status, group_name, group_order, event_order) VALUES
(gen_random_uuid(), 'Входное тестирование', 'Оценка начальных знаний участников', '2026-01-30', 'diagnostic', 'published', 'Диагностика', 0, 1),
(gen_random_uuid(), 'Промежуточное тестирование', 'Проверка прогресса обучения', '2026-02-15', 'diagnostic', 'published', 'Диагностика', 0, 2)
ON CONFLICT DO NOTHING;

-- 6. Тестовые задания
INSERT INTO public.assignments (id, title, description, answer_format, reward, target_type, status) VALUES
(gen_random_uuid(), 'Создать компонент кнопки', 'Создайте переиспользуемый компонент кнопки на React', 'link', 50, 'all', 'published'),
(gen_random_uuid(), 'Написать эссе о дизайне', 'Напишите эссе на тему "Роль дизайна в современном мире"', 'text', 30, 'all', 'published'),
(gen_random_uuid(), 'Анализ конкурентов', 'Проведите анализ 3 конкурентов в вашей нише', 'text', 40, 'all', 'published')
ON CONFLICT DO NOTHING;

-- 7. Тестовые персональные вопросы
INSERT INTO public.targeted_questions (id, text, type, options, target_audience, status) VALUES
(gen_random_uuid(), 'Что вас мотивирует в работе?', 'text', NULL, 'all', 'published'),
(gen_random_uuid(), 'Какой формат обучения вам больше нравится?', 'single', '["Лекции", "Практические задания", "Воркшопы", "Самостоятельное изучение"]'::jsonb, 'all', 'published'),
(gen_random_uuid(), 'Какие навыки вы хотели бы развить?', 'multiple', '["Программирование", "Дизайн", "Маркетинг", "Менеджмент"]'::jsonb, 'all', 'published'),
(gen_random_uuid(), 'Оцените свой уровень знаний по шкале от 1 до 10', 'scale', NULL, 'all', 'published')
ON CONFLICT DO NOTHING;

-- Примечание: Для создания вопросов к мероприятиям и ответов пользователей используйте админ-панель приложения
-- или добавьте соответствующие INSERT запросы здесь при необходимости
