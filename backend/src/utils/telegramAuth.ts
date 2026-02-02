import crypto from 'crypto';
import { logger } from './logger';

/**
 * Валидация initData от Telegram WebApp
 * 
 * ВАЖНО: В production используйте более строгую валидацию!
 * Здесь базовая проверка для MVP.
 * 
 * Для production рекомендуется:
 * 1. Проверять auth_date (не старше 24 часов)
 * 2. Использовать секретный ключ от Telegram Bot API
 * 3. Валидировать hash через HMAC-SHA-256
 */

export interface ParsedInitData {
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  auth_date: number;
  hash: string;
}

/**
 * Парсинг initData строки от Telegram
 */
export function parseInitData(initData: string): ParsedInitData | null {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    
    if (!userStr) {
      return null;
    }

    const user = JSON.parse(userStr);
    
    return {
      telegram_id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      auth_date: parseInt(params.get('auth_date') || '0', 10),
      hash: params.get('hash') || '',
    };
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), 'Error parsing initData');
    return null;
  }
}

/**
 * Валидация hash через HMAC-SHA-256
 * Согласно документации Telegram: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitDataHash(initData: string, botToken: string): boolean {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) {
      return false;
    }

    // Удаляем hash из параметров для проверки
    params.delete('hash');

    // Сортируем параметры по ключу
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Создаем секретный ключ из bot token
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Вычисляем hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Сравниваем hash
    return calculatedHash === hash;
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), 'Error validating initData hash');
    return false;
  }
}

/**
 * Полная валидация initData
 * 
 * Проверяет:
 * 1. Наличие обязательных полей
 * 2. Валидность auth_date (не старше 24 часов)
 * 3. Валидность hash через HMAC-SHA-256
 */
export function validateInitData(initData: string): boolean {
  const parsed = parseInitData(initData);
  
  if (!parsed) {
    return false;
  }

  // Проверка обязательных полей
  if (!parsed.telegram_id || !parsed.first_name || !parsed.hash) {
    return false;
  }

  // Проверка auth_date (данные не должны быть старше 24 часов)
  const authDate = new Date(parsed.auth_date * 1000);
  const now = new Date();
  const hoursDiff = (now.getTime() - authDate.getTime()) / (1000 * 60 * 60);
  
  if (hoursDiff > 24) {
    return false;
  }

  // Проверка hash через HMAC-SHA-256
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    // В production это критично - валидация должна быть обязательной
    if (process.env.NODE_ENV === 'production') {
      logger.error(new Error('TELEGRAM_BOT_TOKEN не установлен в production'), 'Critical: hash validation disabled');
      return false; // В production не пропускаем без проверки hash
    }
    logger.warn('TELEGRAM_BOT_TOKEN не установлен, пропускаем проверку hash (development mode)');
    return true; // В режиме разработки разрешаем без проверки hash
  }

  const isValidHash = validateInitDataHash(initData, botToken);
  if (!isValidHash) {
    logger.warn('initData hash validation failed', { telegramId: parsed.telegram_id });
  }
  return isValidHash;
}

/**
 * Извлечение telegram_id из initData
 */
export function getTelegramIdFromInitData(initData: string): number | null {
  const parsed = parseInitData(initData);
  return parsed?.telegram_id || null;
}
