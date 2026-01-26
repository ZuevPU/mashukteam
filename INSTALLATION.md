# Инструкция по установке зависимостей

## Backend

После клонирования репозитория выполните:

```bash
cd backend
npm install
```

### Дополнительные зависимости

План разработки добавил следующие зависимости, которые нужно установить:

```bash
npm install express-rate-limit
```

## Frontend

Зависимости уже установлены через `npm run install:all` или вручную.

## База данных

Выполните миграции в Supabase:

1. Выполните `supabase/migrations/001_create_users_table.sql`
2. Выполните `supabase/migrations/002_create_gamification_tables.sql`

## Проверка установки

После установки всех зависимостей:

1. Backend должен запускаться без ошибок: `cd backend && npm run dev`
2. Frontend должен запускаться без ошибок: `cd frontend && npm run dev`
3. Все импорты должны разрешаться корректно
