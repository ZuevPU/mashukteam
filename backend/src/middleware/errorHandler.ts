import { Request, Response, NextFunction } from 'express';

/**
 * Типы ошибок приложения
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL = 'INTERNAL',
}

/**
 * Кастомный класс ошибок приложения
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Централизованный обработчик ошибок
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Логирование ошибки
  logger.error(err instanceof Error ? err : new Error(String(err)), 'Request error', {
    url: req.url,
    method: req.method,
  });

  // Если это AppError, используем его свойства
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      type: err.type,
      details: err.details,
    });
  }

  // Для неизвестных ошибок возвращаем безопасное сообщение
  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Внутренняя ошибка сервера'
      : err.message,
    type: ErrorType.INTERNAL,
  });
}

/**
 * Middleware для обработки 404 ошибок
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new AppError(
    ErrorType.NOT_FOUND,
    `Маршрут ${req.method} ${req.path} не найден`,
    404
  );
  next(error);
}
