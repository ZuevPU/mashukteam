-- Миграция для обновления направлений
-- Удаляем старые направления и добавляем новые

-- Удаляем старые направления
DELETE FROM public.directions;

-- Вставляем новые направления
INSERT INTO public.directions (name, slug, description) VALUES
('Опытные модераторы', 'experienced_moderators', 'Направление для опытных модераторов'),
('Начинающие модераторы', 'beginner_moderators', 'Направление для начинающих модераторов'),
('Игропрактики', 'game_practitioners', 'Направление для игропрактиков'),
('Школа Послов «ЦЗ «Машук»', 'ambassadors_school', 'Школа Послов Центра знаний «Машук»'),
('Добровольцы', 'volunteers', 'Направление для добровольцев');

-- Обновляем пользователей, у которых было старое направление
-- (сбрасываем direction_id, так как старые направления удалены)
UPDATE public.users 
SET direction_id = NULL, direction_selected_at = NULL 
WHERE direction_id IS NOT NULL 
  AND direction_id NOT IN (SELECT id FROM public.directions);
