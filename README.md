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
│       └── 001_create_users_table.sql
│
├── .env.example            # Пример переменных окружения
└── README.md
```

## Расширение для геймификации

### Будущие таблицы в Supabase:
- `user_points` - история начисления баллов
- `achievements` - достижения пользователей
- `user_achievements` - связь пользователей и достижений
- `levels` - уровни пользователей
- `user_actions` - история действий для аналитики

### Будущие эндпоинты:
- `POST /api/gamification/points/add` - начисление баллов
- `GET /api/gamification/achievements` - получение достижений
- `POST /api/gamification/level/up` - повышение уровня
- `GET /api/gamification/stats` - статистика пользователя

### Будущие компоненты Frontend:
- `BentoMenu` - полноценное меню с карточками
- `PointsDisplay` - отображение баллов
- `AchievementsList` - список достижений
- `LevelProgress` - прогресс уровня

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
