# API Документация

## Базовый URL

```
http://localhost:3000/api
```

## Аутентификация

Все запросы (кроме health check) требуют передачи `initData` от Telegram WebApp в теле запроса.

### POST /auth/verify

Проверка initData и получение/создание пользователя.

**Request Body:**
```json
{
  "initData": "query_id=...&user=...&auth_date=...&hash=..."
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "telegram_id": 123456789,
    "status": "new" | "registered",
    "first_name": "Имя"
  }
}
```

## Пользователи

### GET /user/:telegramId

Получение данных пользователя по telegram_id.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "telegram_id": 123456789,
    "first_name": "Имя",
    "last_name": "Фамилия",
    "status": "registered"
  }
}
```

### POST /user/status

Проверка статуса регистрации пользователя.

**Request Body:**
```json
{
  "initData": "..."
}
```

**Response:**
```json
{
  "success": true,
  "exists": true,
  "status": "registered",
  "user": {
    "id": "uuid",
    "telegram_id": 123456789,
    "first_name": "Имя",
    "status": "registered"
  }
}
```

### POST /user/register

Завершение регистрации пользователя.

**Request Body:**
```json
{
  "initData": "...",
  "registrationData": {
    "first_name": "Имя",
    "last_name": "Фамилия",
    "middle_name": "Отчество",
    "motivation": "Мотивация для участия"
  }
}
```

**Response:**
```json
{
  "success": true,
  "user": { ... },
  "message": "Регистрация завершена успешно"
}
```

## Геймификация

### POST /gamification/points/add

Начисление баллов пользователю.

**Request Body:**
```json
{
  "initData": "...",
  "points": 100,
  "reason": "За выполнение задания"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": "uuid",
    "user_id": "uuid",
    "points": 100,
    "reason": "За выполнение задания",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "total_points": 150
}
```

### POST /gamification/points/:userId

Получение истории баллов пользователя.

**Request Body:**
```json
{
  "initData": "..."
}
```

**Response:**
```json
{
  "success": true,
  "points": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "points": 100,
      "reason": "...",
      "created_at": "..."
    }
  ],
  "total_points": 150
}
```

### POST /gamification/achievements/:userId

Получение достижений пользователя.

**Request Body:**
```json
{
  "initData": "..."
}
```

**Response:**
```json
{
  "success": true,
  "user_achievements": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "achievement_id": "uuid",
      "unlocked_at": "...",
      "achievement": {
        "id": "uuid",
        "name": "Первая регистрация",
        "description": "...",
        "points_reward": 50
      }
    }
  ],
  "all_achievements": [ ... ],
  "unlocked_count": 1,
  "total_count": 5
}
```

### POST /gamification/achievements/unlock

Разблокировка достижения.

**Request Body:**
```json
{
  "initData": "...",
  "achievement_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "achievement": { ... },
  "message": "Достижение \"Название\" разблокировано!"
}
```

### POST /gamification/stats/:userId

Получение статистики пользователя.

**Request Body:**
```json
{
  "initData": "..."
}
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "user_id": "uuid",
    "total_points": 150,
    "current_level": 2,
    "experience_points": 250,
    "experience_to_next_level": 150,
    "achievements_count": 1,
    "recent_achievements": [ ... ],
    "recent_points_transactions": [ ... ]
  }
}
```

### POST /gamification/level/up

Повышение уровня.

**Request Body:**
```json
{
  "initData": "..."
}
```

**Response:**
```json
{
  "success": true,
  "level": {
    "id": "uuid",
    "user_id": "uuid",
    "level": 3,
    "experience_points": 400,
    "updated_at": "..."
  },
  "message": "Поздравляем! Вы достигли уровня 3!"
}
```

## Коды ошибок

- `400` - Ошибка валидации данных
- `401` - Ошибка аутентификации (невалидный initData)
- `403` - Доступ запрещен
- `404` - Ресурс не найден
- `429` - Слишком много запросов (rate limit)
- `500` - Внутренняя ошибка сервера

## Rate Limiting

- **Аутентификация**: 5 запросов за 15 минут
- **Геймификация**: 30 запросов за 1 минуту
- **Остальные API**: 100 запросов за 15 минут

В режиме разработки rate limiting отключен.
