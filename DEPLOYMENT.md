# Инструкция по деплою

## Настройка переменных окружения в Vercel

### Frontend (Vercel)

В настройках проекта фронтенда добавьте следующие переменные окружения:

```
VITE_API_URL=https://your-backend-project.vercel.app
```

**Важно:** Замените `your-backend-project` на реальное имя вашего проекта бэкенда в Vercel.

### Backend (Vercel)

В настройках проекта бэкенда добавьте следующие переменные окружения:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token (опционально)
CORS_ORIGIN=https://your-frontend-project.vercel.app (опционально, можно оставить пустым)
PORT=3000
NODE_ENV=production
```

## Как найти URL вашего проекта в Vercel

1. Откройте проект в Vercel Dashboard
2. Перейдите в Settings → Domains
3. Скопируйте Production Domain (например: `your-project.vercel.app`)
4. Используйте этот URL в переменных окружения

## Проверка работы

После деплоя проверьте:

1. **Backend Health Check:**
   ```
   https://your-backend.vercel.app/health
   ```
   Должен вернуть: `{"status":"ok","timestamp":"..."}`

2. **Frontend:**
   - Откройте приложение в Telegram Mini App
   - Откройте консоль браузера (F12)
   - Проверьте логи:
     - `API Configuration:` - должен показывать правильный API_URL
     - `API Request:` - должны быть запросы к бэкенду
     - `API Response:` - должны быть успешные ответы

## Решение проблем

### "Failed to fetch"

1. Проверьте, что `VITE_API_URL` установлен в настройках Vercel для фронтенда
2. Проверьте, что URL бэкенда правильный (без `/api` в конце)
3. Проверьте логи в консоли браузера - там будет показан используемый API_URL

### "Маршрут GET /favicon.png не найден"

Эта ошибка теперь игнорируется автоматически. Если она все еще появляется, это не критично - бэкенд просто возвращает 204 (No Content).

### Данные не попадают в Supabase

1. Проверьте, что `SUPABASE_URL` и `SUPABASE_SERVICE_KEY` установлены в бэкенде
2. Проверьте логи бэкенда в Vercel - там должны быть сообщения о создании пользователей
3. Убедитесь, что миграции выполнены в Supabase
