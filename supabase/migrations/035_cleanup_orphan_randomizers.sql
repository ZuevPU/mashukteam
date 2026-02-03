-- Очистка осиротевших рандомайзеров (без связанных вопросов или заданий)

-- 1. Удаляем распределения для осиротевших рандомайзеров
DELETE FROM public.randomizer_distributions
WHERE randomizer_id IN (
  SELECT rq.id FROM public.randomizer_questions rq
  LEFT JOIN public.targeted_questions tq ON rq.question_id = tq.id
  LEFT JOIN public.assignments a ON rq.assignment_id = a.id
  WHERE tq.id IS NULL AND a.id IS NULL
);

-- 2. Удаляем участников для осиротевших рандомайзеров  
DELETE FROM public.randomizer_participants
WHERE randomizer_id IN (
  SELECT rq.id FROM public.randomizer_questions rq
  LEFT JOIN public.targeted_questions tq ON rq.question_id = tq.id
  LEFT JOIN public.assignments a ON rq.assignment_id = a.id
  WHERE tq.id IS NULL AND a.id IS NULL
);

-- 3. Удаляем сами осиротевшие рандомайзеры
DELETE FROM public.randomizer_questions
WHERE id IN (
  SELECT rq.id FROM public.randomizer_questions rq
  LEFT JOIN public.targeted_questions tq ON rq.question_id = tq.id
  LEFT JOIN public.assignments a ON rq.assignment_id = a.id
  WHERE tq.id IS NULL AND a.id IS NULL
);

-- 4. Удаляем осиротевшие submissions (для удалённых заданий)
DELETE FROM public.assignment_submissions
WHERE assignment_id NOT IN (SELECT id FROM public.assignments);

-- 5. Удаляем осиротевшие ответы на вопросы (для удалённых вопросов)
DELETE FROM public.targeted_answers
WHERE question_id NOT IN (SELECT id FROM public.targeted_questions);
