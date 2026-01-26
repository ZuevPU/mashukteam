# Инструкция по настройке проекта

## 1. Настройка Supabase

1. Создайте проект в [Supabase](https://supabase.com)
2. Перейдите в SQL Editor
3. Выполните SQL миграцию из файла `supabase/migrations/001_create_users_table.sql`
4. Скопируйте:
   - Project URL (SUPABASE_URL)
   - Service Role Key (SUPABASE_SERVICE_KEY) - из Settings → API

## 2. Настройка Telegram Bot

1. Создайте бота через [@BotFather](https://t.me/BotFather) в Telegram
2. Получите Bot Token
3. Настройте Mini App:
   ```
   /newapp
   ```
   - Выберите вашего бота
   - Укажите название приложения
   - Укажите URL вашего frontend (например, `https://your-domain.com`)

## 3. Настройка Backend

```bash
cd backend
npm install
cp .env.example .env
```

Отредактируйте `.env`:
```
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
TELEGRAM_BOT_TOKEN=your_bot_token
CORS_ORIGIN=http://localhost:5173
```

Запуск:
```bash
npm run dev
```

## 4. Настройка Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Отредактируйте `.env`:
```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=your_supabase_url
```

Запуск:
```bash
npm run dev
```

## 5. Тестирование

1. Запустите backend и frontend
2. Откройте Telegram Bot
3. Нажмите кнопку "Начать" или отправьте `/start`
4. Откройте Mini App
5. Пройдите регистрацию

## 6. Деплой (Production)

### Backend
- Рекомендуется использовать Vercel, Railway, или Render
- Установите переменные окружения
- Укажите правильный CORS_ORIGIN

### Frontend
- Соберите проект: `npm run build`
- Загрузите `dist/` на хостинг (Vercel, Netlify, или ваш сервер)
- Обновите URL Mini App в BotFather

## Важные замечания

1. **Безопасность**: В production обязательно реализуйте полную валидацию initData через HMAC-SHA-256
2. **CORS**: Настройте CORS для вашего production домена
3. **HTTPS**: Telegram требует HTTPS для Mini Apps в production
4. **Row Level Security**: Настройте RLS политики в Supabase для безопасности данных
