import { Request, Response } from 'express';
import { validateInitData, getTelegramIdFromInitData } from '../utils/telegramAuth';
import { UserService } from '../services/supabase';
import { logger } from '../utils/logger';

/**
 * Контроллер для аутентификации через Telegram initData
 */

interface AuthRequest extends Request {
  body: {
    initData: string;
  };
}

/**
 * POST /api/auth/verify
 * Проверка initData и получение/создание пользователя
 */
export async function verifyAuth(req: AuthRequest, res: Response) {
  try {
    const { initData } = req.body;

    logger.debug('verifyAuth called', {
      hasInitData: !!initData,
      initDataLength: initData?.length || 0,
    });

    if (!initData) {
      logger.warn('verifyAuth: initData отсутствует');
      return res.status(400).json({ 
        success: false,
        error: 'initData обязателен' 
      });
    }

    // Валидация initData
    const isValid = validateInitData(initData);
    logger.debug('validateInitData result', { isValid });
    
    if (!isValid) {
      logger.warn('verifyAuth: Невалидный initData');
      return res.status(401).json({ 
        success: false,
        error: 'Невалидный initData' 
      });
    }

    // Извлечение telegram_id
    const telegramId = getTelegramIdFromInitData(initData);
    logger.debug('Extracted telegramId', { telegramId });
    
    if (!telegramId) {
      logger.warn('verifyAuth: Не удалось извлечь telegram_id');
      return res.status(400).json({ 
        success: false,
        error: 'Не удалось извлечь telegram_id' 
      });
    }

    // Проверка существования пользователя
    let user = await UserService.getUserByTelegramId(telegramId);
    logger.debug('User exists', { exists: !!user, status: user?.status });

    // Если пользователь не существует, создаём нового со статусом "new"
    if (!user) {
      logger.info('Creating new user', { telegramId });
      // Парсим данные пользователя из initData для создания
      const { parseInitData } = await import('../utils/telegramAuth');
      const parsed = parseInitData(initData);
      
      if (!parsed) {
        logger.error(new Error('Ошибка парсинга initData'));
        return res.status(400).json({ 
          success: false,
          error: 'Ошибка парсинга initData' 
        });
      }

      logger.debug('Parsed initData', { username: parsed.username });

      user = await UserService.createUser({
        telegram_id: telegramId,
        telegram_username: parsed.username,
        first_name: parsed.first_name,
        last_name: parsed.last_name || '',
        middle_name: undefined,
        motivation: '', // Будет заполнено при регистрации
      });
      
      logger.info('User created', { userId: user.id, status: user.status });
    }

    // Нормализуем статус: если не 'registered', считаем 'new'
    // Это важно для старых пользователей, у которых статус может быть NULL или другим значением
    const normalizedStatus = user.status === 'registered' ? 'registered' : 'new';
    
    // Если статус был не 'registered', но пользователь существует, обновляем статус на 'new'
    if (user.status !== 'registered' && user.status !== 'new') {
      logger.info('Normalizing user status', { from: user.status, to: 'new', userId: user.id });
      try {
        await UserService.updateUserStatus(user.telegram_id, 'new');
        user.status = 'new';
      } catch (error) {
        logger.error('Error updating user status', error instanceof Error ? error : new Error(String(error)));
        // Продолжаем с текущим статусом
      }
    }

    logger.debug('verifyAuth returning', {
      userId: user.id,
      telegramId: user.telegram_id,
      status: normalizedStatus,
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        status: normalizedStatus,
        first_name: user.first_name,
      },
    });
  } catch (error) {
    logger.error('Error in verifyAuth', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ 
      success: false,
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
