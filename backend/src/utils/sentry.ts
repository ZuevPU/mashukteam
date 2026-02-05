import * as Sentry from '@sentry/node';
import { logger } from './logger';

/**
 * Инициализация Sentry для мониторинга ошибок
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    logger.warn('SENTRY_DSN не установлен, мониторинг ошибок отключен');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    
    // Отправлять только в production
    enabled: process.env.NODE_ENV === 'production',
    
    // Трассировка производительности (10% запросов в production)
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Профилирование (опционально)
    profilesSampleRate: 0.1,
    
    // Интеграции
    integrations: [
      // HTTP запросы
      Sentry.httpIntegration(),
      // Express middleware
      Sentry.expressIntegration(),
    ],
    
    // Фильтрация чувствительных данных
    beforeSend(event) {
      // Удаляем чувствительные данные из запросов
      if (event.request) {
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['x-telegram-init-data'];
          delete event.request.headers['x-init-data'];
        }
        if (event.request.data) {
          // Маскируем потенциально чувствительные поля
          const sensitiveFields = ['password', 'token', 'secret', 'key', 'initData'];
          const data = event.request.data as Record<string, unknown>;
          for (const field of sensitiveFields) {
            if (data[field]) {
              data[field] = '[REDACTED]';
            }
          }
        }
      }
      return event;
    },
    
    // Игнорируем определенные ошибки
    ignoreErrors: [
      // Обычные HTTP ошибки, которые не требуют отслеживания
      'Request aborted',
      'Network Error',
      'ECONNREFUSED',
      'ETIMEDOUT',
      // Rate limit ошибки Telegram API
      'Rate limit exceeded',
      /429 Too Many Requests/,
    ],
  });

  logger.info('Sentry инициализирован', { 
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === 'production'
  });
}

/**
 * Middleware для Express - трассировка запросов
 * В новых версиях Sentry (v8+) используется автоматическая интеграция
 */
export function sentryRequestHandler(req: any, res: any, next: any): void {
  // Добавляем контекст запроса для отслеживания
  Sentry.setContext('request', {
    method: req.method,
    url: req.originalUrl || req.url,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
    },
  });
  next();
}

/**
 * Middleware для отлова ошибок Express
 */
export function sentryErrorHandler(err: any, req: any, res: any, next: any): void {
  // Захватываем ошибку в Sentry с контекстом запроса
  Sentry.captureException(err, {
    extra: {
      method: req.method,
      url: req.originalUrl || req.url,
      body: req.body,
      query: req.query,
    },
  });
  next(err);
}

/**
 * Установка контекста пользователя для отслеживания
 */
export function setUserContext(userId: string, telegramId?: number, username?: string): void {
  Sentry.setUser({
    id: userId,
    username: username || undefined,
    // Добавляем telegram_id как дополнительные данные
    ip_address: undefined, // Не отслеживаем IP
  });
  
  if (telegramId) {
    Sentry.setTag('telegram_id', telegramId.toString());
  }
}

/**
 * Очистка контекста пользователя
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Добавление breadcrumb для отслеживания действий
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Ручной захват исключения с дополнительным контекстом
 */
export function captureException(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: Sentry.SeverityLevel;
  }
): string {
  return Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
    level: context?.level,
  });
}

/**
 * Ручной захват сообщения
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
): string {
  return Sentry.captureMessage(message, {
    level,
    tags: context?.tags,
    extra: context?.extra,
  });
}

/**
 * Установка тега для текущего scope
 */
export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/**
 * Установка дополнительных данных для текущего scope
 */
export function setExtra(key: string, value: unknown): void {
  Sentry.setExtra(key, value);
}

/**
 * Завершение работы Sentry (для graceful shutdown)
 */
export async function closeSentry(): Promise<void> {
  await Sentry.close(2000);
}

// Экспорт Sentry для прямого использования при необходимости
export { Sentry };
