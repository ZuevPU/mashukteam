# Telegram Mini App - Система регистрации пользователей

## Архитектурная схема

```
┌─────────────────┐
│  Telegram Bot   │
│  (Bot API)      │
└────────┬────────┘
         │
         │ Открывает Mini App
         │
         ▼
┌─────────────────────────────────┐
│   Telegram Mini App (Frontend)  │
│   - React + Vite                 │
│   - Telegram WebApp SDK          │
│   - Получение initData           │
└────────┬────────────────────────┘
         │
         │ HTTP запросы
         │ (с initData для auth)
         │
         ▼
┌─────────────────────────────────┐
│      Backend API (Node.js)      │
│   - Express + TypeScript         │
│   - Валидация initData           │
│   - Бизнес-логика                │
└────────┬────────────────────────┘
         │
         │ SQL запросы
         │
         ▼
┌─────────────────────────────────┐
│      Supabase (PostgreSQL)      │
│   - Таблица users                │
│   - Row Level Security           │
└─────────────────────────────────┘
```

## Компоненты системы

### 1. Telegram Bot
- Обрабатывает команду `/start`
- Открывает Mini App через кнопку или команду
- Использует Bot API Token

### 2. Frontend (Mini App)
- React приложение, запускаемое внутри Telegram
- Использует `@twa-dev/sdk` для работы с Telegram WebApp
- Получает `initData` для аутентификации
- Экран приветствия → Регистрация → Bento Menu

### 3. Backend API
- Express сервер на TypeScript
- Валидация Telegram initData (безопасность)
- Эндпоинты:
  - `POST /api/auth/verify` - проверка initData и получение пользователя
  - `GET /api/user/:telegramId` - получение данных пользователя
  - `POST /api/user/register` - регистрация пользователя
  - `GET /api/user/status` - проверка статуса регистрации

### 4. Supabase
- PostgreSQL база данных
- Таблица `users` для хранения данных пользователей
- Готовность к расширению (баллы, достижения, уровни)

## Структура проекта

```
mashukteam/
├── backend/                 # Node.js + TypeScript backend
│   ├── src/
│   │   ├── routes/         # API маршруты
│   │   ├── controllers/    # Контроллеры
│   │   ├── services/       # Бизнес-логика
│   │   ├── utils/          # Утилиты (валидация initData)
│   │   ├── types/          # TypeScript типы
│   │   └── index.ts        # Точка входа
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/               # React Mini App
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── screens/        # Экраны приложения
│   │   ├── services/        # API клиент
│   │   ├── hooks/          # React hooks
│   │   ├── types/          # TypeScript типы
│   │   └── App.tsx         # Главный компонент
│   ├── package.json
│   └── vite.config.ts
│
├── supabase/               # SQL миграции
│   └── migrations/
│       ├── 001_create_users_table.sql
│       ├── 002_create_gamification_tables.sql
│       ├── 003_create_events_system.sql
│       ├── 004_add_event_status.sql
│       ├── 005_advanced_features.sql
│       ├── 006_create_assignments_system.sql
│       ├── 007_enable_rls_policies.sql
│       ├── 008_add_directions_system.sql
│       ├── 009_add_reflection_levels.sql
│       ├── 010_add_event_groups.sql
│       ├── 011_fix_user_statuses.sql
│       └── 012_make_motivation_optional.sql
│
├── .env.example            # Пример переменных окружения
└── README.md
```

## Реализованный функционал

### Геймификация:
- ✅ Система баллов рефлексии с 5 уровнями
- ✅ История начисления баллов
- ✅ Прогресс-бар рефлексии
- ✅ Начисление баллов за мероприятия (+2), диагностики (+3), вопросы (+1), задания (+5)

### Мероприятия и диагностика:
- ✅ Создание и управление мероприятиями
- ✅ Группировка мероприятий по дням
- ✅ Система вопросов к мероприятиям
- ✅ Отдельная система диагностик

### Задания:
- ✅ Создание заданий с наградами
- ✅ Таргетирование заданий (всем, по типу, индивидуально)
- ✅ Модерация выполненных заданий
- ✅ Начисление баллов при одобрении

### Персональные вопросы:
- ✅ Создание таргетированных вопросов
- ✅ Разные типы вопросов (text, single, multiple, scale)
- ✅ Таргетирование по аудитории

### Админ-панель:
- ✅ Управление мероприятиями, диагностиками, заданиями, вопросами
- ✅ Управление пользователями и направлениями
- ✅ Экспорт данных в Excel
- ✅ Аналитика по мероприятиям

### Уведомления:
- ✅ Уведомления о новых мероприятиях, диагностиках, заданиях, вопросах
- ✅ Уведомления с прямыми ссылками на элементы приложения
- ✅ Уведомления о результатах модерации заданий

### Регистрация:
- ✅ Упрощенная регистрация в один шаг (ФИО)
- ✅ Автоматическое создание пользователя при необходимости
- ✅ Выбор направления при первом входе

## Установка и запуск

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Заполнить переменные окружения
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Заполнить переменные окружения
npm run dev
```

### Supabase
1. Создать проект в Supabase
2. Выполнить SQL миграцию из `supabase/migrations/`
3. Настроить Row Level Security (RLS) политики

## Переменные окружения

### Backend (.env)
```
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
TELEGRAM_BOT_TOKEN=your_bot_token
NODE_ENV=development
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=your_supabase_url
```
