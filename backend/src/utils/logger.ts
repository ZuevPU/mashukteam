/**
 * Структурированное логирование
 * Использует простой формат для начала, можно расширить до winston/pino
 * Интегрирован с Sentry для автоматического захвата ошибок
 */

import * as Sentry from '@sentry/node';

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
  error?: Error;
}

/**
 * Форматирование лога
 */
function formatLog(entry: LogEntry): string {
  const { level, message, timestamp, data, error } = entry;
  
  let logMessage = `[${timestamp}] ${level}: ${message}`;
  
  if (data) {
    logMessage += ` | Data: ${JSON.stringify(data)}`;
  }
  
  if (error) {
    logMessage += ` | Error: ${error.message}`;
    if (error.stack) {
      logMessage += ` | Stack: ${error.stack}`;
    }
  }
  
  return logMessage;
}

/**
 * Базовый логгер
 */
class Logger {
  private log(level: LogLevel, message: string, data?: any, error?: Error) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';

    // В production показываем только WARN и ERROR
    if (isProduction && (level === LogLevel.DEBUG || level === LogLevel.INFO)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
      error,
    };

    const formattedLog = formatLog(entry);

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedLog);
        // Отправляем ошибки в Sentry
        if (error) {
          Sentry.captureException(error, {
            extra: data ? { data } : undefined,
          });
        } else {
          Sentry.captureMessage(message, {
            level: 'error',
            extra: data ? { data } : undefined,
          });
        }
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        // Добавляем breadcrumb для предупреждений
        Sentry.addBreadcrumb({
          message,
          level: 'warning',
          data,
        });
        break;
      case LogLevel.DEBUG:
        if (isDevelopment) {
          console.debug(formattedLog);
        }
        break;
      default:
        // INFO логи только в development
        if (isDevelopment) {
          console.log(formattedLog);
        }
        // Добавляем breadcrumb для info
        Sentry.addBreadcrumb({
          message,
          level: 'info',
          data,
        });
    }
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error, data?: any) {
    this.log(LogLevel.ERROR, message, data, error);
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }
}

export const logger = new Logger();
