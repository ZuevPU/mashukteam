import { Request, Response } from 'express';
import { validateInitData, getTelegramIdFromInitData } from '../utils/telegramAuth';
import { UserService } from '../services/supabase';

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

    console.log('verifyAuth called:', {
      hasInitData: !!initData,
      initDataLength: initData?.length || 0,
      body: req.body,
    });

    if (!initData) {
      console.warn('verifyAuth: initData отсутствует');
      return res.status(400).json({ 
        success: false,
        error: 'initData обязателен' 
      });
    }

    // Валидация initData
    const isValid = validateInitData(initData);
    console.log('validateInitData result:', isValid);
    
    if (!isValid) {
      console.warn('verifyAuth: Невалидный initData');
      return res.status(401).json({ 
        success: false,
        error: 'Невалидный initData' 
      });
    }

    // Извлечение telegram_id
    const telegramId = getTelegramIdFromInitData(initData);
    console.log('Extracted telegramId:', telegramId);
    
    if (!telegramId) {
      console.warn('verifyAuth: Не удалось извлечь telegram_id');
      return res.status(400).json({ 
        success: false,
        error: 'Не удалось извлечь telegram_id' 
      });
    }

    // Проверка существования пользователя
    let user = await UserService.getUserByTelegramId(telegramId);
    console.log('User exists:', !!user, 'status:', user?.status);

    // Если пользователь не существует, создаём нового со статусом "new"
    if (!user) {
      console.log('Creating new user...');
      // Парсим данные пользователя из initData для создания
      const { parseInitData } = await import('../utils/telegramAuth');
      const parsed = parseInitData(initData);
      
      if (!parsed) {
        console.error('verifyAuth: Ошибка парсинга initData');
        return res.status(400).json({ 
          success: false,
          error: 'Ошибка парсинга initData' 
        });
      }

      console.log('Parsed initData:', parsed);

      user = await UserService.createUser({
        telegram_id: telegramId,
        telegram_username: parsed.username,
        first_name: parsed.first_name,
        last_name: parsed.last_name || '',
        middle_name: undefined,
        motivation: '', // Будет заполнено при регистрации
      });
      
      console.log('User created:', user.id, 'status:', user.status);
    }

    // Нормализуем статус: если не 'registered', считаем 'new'
    // Это важно для старых пользователей, у которых статус может быть NULL или другим значением
    const normalizedStatus = user.status === 'registered' ? 'registered' : 'new';
    
    // Если статус был не 'registered', но пользователь существует, обновляем статус на 'new'
    if (user.status !== 'registered' && user.status !== 'new') {
      console.log('Normalizing user status from', user.status, 'to new');
      try {
        await UserService.updateUserStatus(user.telegram_id, 'new');
        user.status = 'new';
      } catch (error) {
        console.error('Error updating user status:', error);
        // Продолжаем с текущим статусом
      }
    }

    console.log('verifyAuth returning:', {
      userId: user.id,
      telegramId: user.telegram_id,
      status: normalizedStatus,
      originalStatus: user.status,
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
    console.error('Error in verifyAuth:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
