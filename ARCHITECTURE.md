# Архитектурная документация

## Общая схема взаимодействия

```
┌─────────────────────────────────────────────────────────────┐
│                    TELEGRAM ECOSYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────────┐              │
│  │ Telegram Bot │────────▶│  Telegram Mini   │              │
│  │   (Bot API)  │  Открывает│   App (WebApp)   │              │
│  └──────────────┘         └────────┬─────────┘              │
│                                     │                         │
│                                     │ initData                │
│                                     │ HTTP запросы            │
│                                     ▼                         │
│                          ┌──────────────────┐                │
│                          │  Backend API      │                │
│                          │  (Node.js/Express)│                │
│                          └────────┬─────────┘                │
│                                    │                          │
│                                    │ SQL запросы              │
│                                    ▼                          │
│                          ┌──────────────────┐                │
│                          │    Supabase      │                │
│                          │   (PostgreSQL)   │                │
│                          └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

## Компоненты системы

### 1. Telegram Bot
**Роль**: Точка входа для пользователей

**Функции**:
- Обработка команды `/start`
- Открытие Mini App через кнопку или команду
- Использует Bot API Token для взаимодействия с Telegram

**Технологии**: Telegram Bot API

---

### 2. Frontend (Telegram Mini App)
**Роль**: Пользовательский интерфейс приложения

**Структура**:
```
frontend/
├── src/
│   ├── screens/          # Экраны приложения
│   │   ├── WelcomeScreen.tsx
│   │   ├── RegistrationScreen.tsx
│   │   └── BentoMenuScreen.tsx
│   ├── components/       # Переиспользуемые компоненты
│   ├── services/         # API клиент
│   │   └── api.ts
│   ├── hooks/           # React hooks
│   │   └── useTelegram.ts
│   └── types/           # TypeScript типы
```

**Технологии**:
- React 18
- Vite (сборщик)
- TypeScript
- @twa-dev/sdk (Telegram WebApp SDK)

**Поток данных**:
1. Получение `initData` из `window.Telegram.WebApp.initData`
2. Отправка `initData` на backend для аутентификации
3. Получение статуса пользователя
4. Навигация между экранами на основе статуса

---

### 3. Backend API
**Роль**: Бизнес-логика, валидация, работа с БД

**Структура**:
```
backend/
├── src/
│   ├── routes/          # API маршруты
│   │   └── index.ts
│   ├── controllers/     # Обработчики запросов
│   │   ├── authController.ts
│   │   └── userController.ts
│   ├── services/        # Бизнес-логика
│   │   └── supabase.ts
│   ├── utils/           # Утилиты
│   │   └── telegramAuth.ts
│   └── types/           # TypeScript типы
```

**Технологии**:
- Node.js
- Express
- TypeScript
- @supabase/supabase-js

**API Эндпоинты**:

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/verify` | Проверка initData и получение/создание пользователя |
| GET | `/api/user/:telegramId` | Получение данных пользователя |
| POST | `/api/user/status` | Проверка статуса регистрации |
| POST | `/api/user/register` | Завершение регистрации |

**Безопасность**:
- Валидация `initData` от Telegram
- Проверка `auth_date` (не старше 24 часов)
- TODO: Полная валидация hash через HMAC-SHA-256

---

### 4. Supabase (PostgreSQL)
**Роль**: Хранение данных пользователей

**Таблица `users`**:
```sql
- id (UUID, PK)
- telegram_id (BIGINT, UNIQUE, NOT NULL)
- telegram_username (TEXT, nullable)
- first_name (TEXT, NOT NULL)
- last_name (TEXT, NOT NULL)
- middle_name (TEXT, nullable)
- motivation (TEXT, NOT NULL)
- status (TEXT: 'new' | 'registered')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**Индексы**:
- `idx_users_telegram_id` - для быстрого поиска по telegram_id
- `idx_users_status` - для фильтрации по статусу

---

## Поток регистрации пользователя

### Сценарий 1: Новый пользователь

```
1. Пользователь открывает Bot → нажимает "Начать"
   ↓
2. Bot открывает Mini App
   ↓
3. Frontend получает initData
   ↓
4. Frontend отправляет POST /api/auth/verify с initData
   ↓
5. Backend валидирует initData
   ↓
6. Backend проверяет существование пользователя в БД
   ↓
7. Пользователь не найден → создаётся новый со status='new'
   ↓
8. Frontend получает ответ: status='new'
   ↓
9. Frontend показывает WelcomeScreen
   ↓
10. Пользователь нажимает "Начать регистрацию"
    ↓
11. Frontend показывает RegistrationScreen (3 шага)
    ↓
12. Пользователь заполняет данные
    ↓
13. Frontend отправляет POST /api/user/register
    ↓
14. Backend обновляет пользователя, устанавливает status='registered'
    ↓
15. Frontend переходит на BentoMenuScreen
```

### Сценарий 2: Зарегистрированный пользователь

```
1. Пользователь открывает Bot → нажимает "Начать"
   ↓
2. Bot открывает Mini App
   ↓
3. Frontend получает initData
   ↓
4. Frontend отправляет POST /api/auth/verify
   ↓
5. Backend находит пользователя в БД
   ↓
6. Backend возвращает: status='registered'
   ↓
7. Frontend сразу показывает BentoMenuScreen
```

---

## Расширение для геймификации

### Будущие таблицы в Supabase

1. **user_points** - История начисления баллов
   ```sql
   - id, user_id, points, reason, created_at
   ```

2. **achievements** - Достижения
   ```sql
   - id, name, description, icon_url, points_reward
   ```

3. **user_achievements** - Связь пользователей и достижений
   ```sql
   - id, user_id, achievement_id, unlocked_at
   ```

4. **user_levels** - Уровни пользователей
   ```sql
   - id, user_id, level, experience_points
   ```

5. **user_actions** - История действий (аналитика)
   ```sql
   - id, user_id, action_type, action_data (JSONB)
   ```

### Будущие эндпоинты

```
POST /api/gamification/points/add
GET  /api/gamification/points/:userId
GET  /api/gamification/achievements/:userId
POST /api/gamification/achievements/unlock
GET  /api/gamification/stats/:userId
POST /api/gamification/level/up
```

### Будущие компоненты Frontend

- `BentoMenu` - Полноценное меню с карточками
- `PointsDisplay` - Отображение баллов
- `AchievementsList` - Список достижений
- `LevelProgress` - Прогресс уровня
- `ActivityFeed` - Лента активности

---

## Безопасность

### Текущая реализация (MVP)
- Базовая валидация `initData`
- Проверка `auth_date` (не старше 24 часов)
- Использование Service Role Key для Supabase (только на backend)

### TODO для Production
1. **Полная валидация hash**:
   ```typescript
   // Использовать секретный ключ от Telegram Bot API
   const secretKey = crypto.createHmac('sha256', 'WebAppData')
     .update(botToken)
     .digest();
   // Проверить hash через HMAC-SHA-256
   ```

2. **Row Level Security (RLS)** в Supabase:
   - Настроить политики доступа
   - Ограничить прямой доступ к таблицам

3. **Rate Limiting**:
   - Ограничить количество запросов с одного IP
   - Защита от злоупотреблений

4. **HTTPS**:
   - Обязательно для production Mini Apps
   - Валидный SSL сертификат

---

## Масштабируемость

### Текущая архитектура
- Монолитная структура (подходит для MVP)
- Прямое подключение к Supabase
- Простая маршрутизация

### Будущие улучшения
1. **Микросервисы** (при росте):
   - Auth Service
   - User Service
   - Gamification Service

2. **Кэширование**:
   - Redis для кэширования данных пользователей
   - Кэширование достижений и уровней

3. **Очереди задач**:
   - Bull/BullMQ для асинхронных задач
   - Начисление баллов, отправка уведомлений

4. **Аналитика**:
   - Отдельный сервис для сбора метрик
   - Интеграция с аналитическими платформами

---

## Развёртывание

### Development
- Backend: `localhost:3000`
- Frontend: `localhost:5173`
- Supabase: Cloud (или local)

### Production
- Backend: Vercel/Railway/Render
- Frontend: Vercel/Netlify (статический хостинг)
- Supabase: Cloud (managed)
- CDN: Cloudflare (для статики)

---

## Мониторинг и логирование

### Рекомендации
1. **Логирование**:
   - Winston или Pino для структурированных логов
   - Отдельные логи для ошибок и успешных операций

2. **Мониторинг**:
   - Sentry для отслеживания ошибок
   - Uptime monitoring для API

3. **Метрики**:
   - Количество регистраций
   - Активные пользователи
   - Производительность API
