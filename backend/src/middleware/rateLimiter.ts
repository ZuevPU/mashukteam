// ВАЖНО: Установите пакет express-rate-limit перед использованием:
// npm install express-rate-limit
import rateLimit from 'express-rate-limit';

/**
 * Rate limiter для аутентификации (умеренный)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 20, // максимум 20 запросов за окно (увеличено для нормальной работы)
  message: 'Слишком много попыток аутентификации. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Пропускаем в режиме разработки
    return process.env.NODE_ENV === 'development';
  },
  // Используем telegram_id для идентификации
  keyGenerator: (req) => {
    try {
      let initData = req.body?.initData || req.headers['x-init-data'] || req.headers['x-telegram-init-data'];
      if (!initData && req.query?.initData) {
        initData = req.query.initData as string;
      }
      if (initData && typeof initData === 'string') {
        const params = new URLSearchParams(initData);
        const userStr = params.get('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.id) {
            return `auth_telegram_${user.id}`;
          }
        }
      }
    } catch (e) {
      // Fallback на IP
    }
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
});

/**
 * Rate limiter для регистрации (более мягкий, т.к. может быть несколько попыток)
 */
export const registrationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10, // максимум 10 попыток регистрации за окно
  message: 'Слишком много попыток регистрации. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  },
  keyGenerator: (req) => {
    try {
      let initData = req.body?.initData || req.headers['x-init-data'] || req.headers['x-telegram-init-data'];
      if (!initData && req.query?.initData) {
        initData = req.query.initData as string;
      }
      if (initData && typeof initData === 'string') {
        const params = new URLSearchParams(initData);
        const userStr = params.get('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.id) {
            return `reg_telegram_${user.id}`;
          }
        }
      }
    } catch (e) {
      // Fallback на IP
    }
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
});

/**
 * Rate limiter для обычных API запросов (более мягкий для Telegram Mini App)
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 300, // максимум 300 запросов за окно (увеличено для Telegram Mini App)
  message: 'Слишком много запросов. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Пропускаем в режиме разработки
    return process.env.NODE_ENV === 'development';
  },
  // Используем более гибкий ключ для идентификации
  keyGenerator: (req) => {
    // Пытаемся использовать telegram_id из initData, если доступен
    try {
      // Проверяем body (для POST запросов)
      let initData = req.body?.initData;
      
      // Если нет в body, проверяем headers
      if (!initData) {
        initData = req.headers['x-init-data'] || req.headers['x-telegram-init-data'];
      }
      
      // Если нет в headers, проверяем query параметры
      if (!initData && req.query?.initData) {
        initData = req.query.initData as string;
      }
      
      if (initData && typeof initData === 'string') {
        const params = new URLSearchParams(initData);
        const userStr = params.get('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.id) {
            return `telegram_${user.id}`;
          }
        }
      }
    } catch (e) {
      // Если не удалось извлечь telegram_id, используем IP
    }
    // Fallback на IP адрес
    return req.ip || req.connection.remoteAddress || 'unknown';
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
