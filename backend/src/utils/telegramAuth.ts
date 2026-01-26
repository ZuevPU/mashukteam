import crypto from 'crypto';

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
    console.error('Error parsing initData:', error);
    return null;
  }
}

/**
 * Базовая валидация initData
 * 
 * В MVP версии проверяем только наличие обязательных полей.
 * 
 * TODO для production:
 * 1. Добавить проверку auth_date (не старше 24 часов)
 * 2. Реализовать проверку hash через HMAC-SHA-256 с использованием
 *    секретного ключа от Telegram Bot API
 * 3. Добавить rate limiting для предотвращения злоупотреблений
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

  // TODO: Добавить проверку hash через HMAC-SHA-256
  // const botToken = process.env.TELEGRAM_BOT_TOKEN;
  // const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  // ... валидация hash

  return true;
}

/**
 * Извлечение telegram_id из initData
 */
export function getTelegramIdFromInitData(initData: string): number | null {
  const parsed = parseInitData(initData);
  return parsed?.telegram_id || null;
}
