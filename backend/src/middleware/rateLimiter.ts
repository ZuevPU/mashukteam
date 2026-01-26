// ВАЖНО: Установите пакет express-rate-limit перед использованием:
// npm install express-rate-limit
import rateLimit from 'express-rate-limit';

/**
 * Rate limiter для аутентификации (более строгий)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // максимум 5 запросов за окно
  message: 'Слишком много попыток аутентификации. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Пропускаем в режиме разработки
    return process.env.NODE_ENV === 'development';
  },
});

/**
 * Rate limiter для обычных API запросов
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов за окно
  message: 'Слишком много запросов. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Пропускаем в режиме разработки
    return process.env.NODE_ENV === 'development';
  },
});

/**
 * Rate limiter для геймификации (более мягкий, т.к. пользователи могут часто проверять прогресс)
 */
export const gamificationRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 30, // максимум 30 запросов в минуту
  message: 'Слишком много запросов к геймификации. Подождите немного.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Пропускаем в режиме разработки
    return process.env.NODE_ENV === 'development';
  },
});
