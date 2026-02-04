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
        logger.error('Ошибка парсинга initData', new Error('Ошибка парсинга initData'));
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

    // Определяем статус пользователя
    // Если статус 'registered' - оставляем как есть
    // Если статус не 'registered', но есть first_name и last_name - значит регистрация была пройдена, 
    // восстанавливаем статус 'registered'
    // В остальных случаях - статус 'new'
    let normalizedStatus: 'new' | 'registered' = 'new';
    
    if (user.status === 'registered') {
      normalizedStatus = 'registered';
    } else if (user.first_name && user.last_name && user.first_name.trim() && user.last_name.trim()) {
      // Пользователь прошёл регистрацию ранее, но статус сбился - восстанавливаем
      logger.info('Restoring registered status for user with completed profile', { 
        userId: user.id, 
        from: user.status, 
        to: 'registered',
        first_name: user.first_name,
        last_name: user.last_name
      });
      try {
        await UserService.updateUserStatus(user.telegram_id, 'registered');
        user.status = 'registered';
        normalizedStatus = 'registered';
      } catch (error) {
        logger.error('Error restoring user status', error instanceof Error ? error : new Error(String(error)));
        // Всё равно считаем его зарегистрированным на фронтенде
        normalizedStatus = 'registered';
      }
    } else if (user.status !== 'new') {
      // Статус был NULL или другим, обновляем на 'new'
      logger.info('Normalizing user status to new', { from: user.status, to: 'new', userId: user.id });
      try {
        await UserService.updateUserStatus(user.telegram_id, 'new');
        user.status = 'new';
      } catch (error) {
        logger.error('Error updating user status', error instanceof Error ? error : new Error(String(error)));
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
