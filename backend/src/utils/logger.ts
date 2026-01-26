/**
 * Структурированное логирование
 * Использует простой формат для начала, можно расширить до winston/pino
 */

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
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.DEBUG:
        if (process.env.NODE_ENV === 'development') {
          console.debug(formattedLog);
        }
        break;
      default:
        console.log(formattedLog);
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
