import { Request, Response } from 'express';
import { UserService } from '../services/supabase';
import { DirectionService } from '../services/directionService';
import { getTelegramIdFromInitData, validateInitData } from '../utils/telegramAuth';
import { CreateUserDto } from '../types';
import { requireAuth } from '../middleware/authMiddleware';
import { logger } from '../utils/logger';

/**
 * Контроллер для работы с пользователями
 */

interface UserRequest extends Request {
  body: {
    initData: string;
    registrationData?: CreateUserDto;
  };
  params: {
    telegramId?: string;
  };
}

/**
 * GET /api/user/:telegramId
 * Получение данных пользователя по telegram_id
 */
export async function getUser(req: UserRequest, res: Response) {
  try {
    const telegramId = parseInt(req.params.telegramId || '', 10);

    if (!telegramId || isNaN(telegramId)) {
      return res.status(400).json({ error: 'Некорректный telegram_id' });
    }

    const user = await UserService.getUserByTelegramId(telegramId);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    logger.error('Error in getUser', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

/**
 * GET /api/user/status
 * Проверка статуса регистрации пользователя
 * Требует initData для идентификации
 */
export async function getUserStatus(req: UserRequest, res: Response) {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ error: 'initData обязателен' });
    }

    const telegramId = getTelegramIdFromInitData(initData);
    if (!telegramId) {
      return res.status(400).json({ error: 'Не удалось извлечь telegram_id' });
    }

    const user = await UserService.getUserByTelegramId(telegramId);

    if (!user) {
      return res.json({
        success: true,
        exists: false,
        status: null,
      });
    }

    return res.json({
      success: true,
      exists: true,
      status: user.status,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        status: user.status,
        is_admin: user.is_admin,
        direction: user.direction,
        direction_selected_at: user.direction_selected_at,
      },
    });
  } catch (error) {
    console.error('Error in getUserStatus:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

/**
 * POST /api/user/register
 * Завершение регистрации пользователя
 * Требует initData и данные регистрации
 */
export async function registerUser(req: UserRequest, res: Response) {
  try {
    const { initData, registrationData } = req.body;

    logger.debug('registerUser called', {
      hasInitData: !!initData,
      hasRegistrationData: !!registrationData,
    });

    if (!initData) {
      return res.status(400).json({ 
        success: false,
        error: 'initData обязателен' 
      });
    }

    // Валидация initData
    const isValid = validateInitData(initData);
    if (!isValid) {
      return res.status(401).json({ 
        success: false,
        error: 'Невалидный initData' 
      });
    }

    if (!registrationData) {
      return res.status(400).json({ 
        success: false,
        error: 'Данные регистрации обязательны' 
      });
    }

    // Валидация данных регистрации
    if (!registrationData.first_name || !registrationData.last_name) {
      return res.status(400).json({ 
        success: false,
        error: 'Имя и фамилия обязательны' 
      });
    }

    const telegramId = getTelegramIdFromInitData(initData);
    if (!telegramId) {
      return res.status(400).json({ 
        success: false,
        error: 'Не удалось извлечь telegram_id' 
      });
    }

    // Проверка существования пользователя
    let existingUser = await UserService.getUserByTelegramId(telegramId);
    
    // Если пользователь не найден, создаем его
    if (!existingUser) {
      logger.info('registerUser: Пользователь не найден, создаем нового', { telegramId });
      
      // Парсим данные пользователя из initData для создания
      const { parseInitData } = await import('../utils/telegramAuth');
      const parsed = parseInitData(initData);
      
      if (!parsed) {
        return res.status(400).json({ 
          success: false,
          error: 'Ошибка парсинга initData' 
        });
      }

      // Создаем пользователя со статусом "new"
      existingUser = await UserService.createUser({
        telegram_id: telegramId,
        telegram_username: parsed.username,
        first_name: parsed.first_name || registrationData.first_name,
        last_name: parsed.last_name || registrationData.last_name,
        middle_name: undefined,
        motivation: registrationData.motivation || '', // Мотивация необязательна
      });
      
      logger.info('User created during registration', { userId: existingUser.id });
    }

    // Проверяем, не зарегистрирован ли пользователь уже
    if (existingUser.status === 'registered') {
      logger.info('User already registered', { userId: existingUser.id });
      return res.json({
        success: true,
        user: existingUser,
        message: 'Пользователь уже зарегистрирован',
      });
    }

    logger.info('Completing registration for user', { userId: existingUser.id });

    // Завершение регистрации
    const updatedUser = await UserService.completeRegistration(telegramId, {
      telegram_id: telegramId,
      first_name: registrationData.first_name,
      last_name: registrationData.last_name,
      middle_name: registrationData.middle_name,
      motivation: registrationData.motivation || '', // Мотивация больше не обязательна
    });

    logger.info('Registration completed successfully', { userId: updatedUser.id });

    return res.json({
      success: true,
      user: updatedUser,
      message: 'Регистрация завершена успешно',
    });
  } catch (error) {
    logger.error('Error in registerUser', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ 
      success: false,
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * POST /api/user/direction
 * Выбор направления пользователем
 */
export async function setUserDirection(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      logger.warn('setUserDirection: No user ID found in request');
      return res.status(401).json({ 
        success: false,
        error: 'Не авторизован' 
      });
    }

    const { direction } = req.body;
    
    if (!direction) {
      logger.warn('setUserDirection: No direction provided');
      return res.status(400).json({ 
        success: false,
        error: 'direction обязателен' 
      });
    }

    logger.info('Setting direction for user', { userId, direction });

    await DirectionService.setUserDirection(userId, direction);
    
    logger.info('Direction set successfully', { userId, direction });
    
    return res.status(200).json({ 
      success: true, 
      message: 'Направление выбрано успешно',
      direction: direction
    });
  } catch (error: any) {
    logger.error('Error setting user direction', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Ошибка при выборе направления' 
    });
  }
}

/**
 * PATCH /api/user/profile
 * Обновление профиля пользователя (имя, фамилия, отчество)
 */
export async function updateProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      logger.warn('updateProfile: No user ID found in request');
      return res.status(401).json({ 
        success: false,
        error: 'Не авторизован' 
      });
    }

    const { first_name, last_name, middle_name } = req.body;
    
    const updates: Partial<CreateUserDto> = {};
    if (first_name !== undefined) {
      if (!first_name || first_name.trim() === '') {
        return res.status(400).json({ 
          success: false,
          error: 'Имя не может быть пустым' 
        });
      }
      updates.first_name = first_name.trim();
    }
    if (last_name !== undefined) {
      if (!last_name || last_name.trim() === '') {
        return res.status(400).json({ 
          success: false,
          error: 'Фамилия не может быть пустой' 
        });
      }
      updates.last_name = last_name.trim();
    }
    if (middle_name !== undefined) {
      updates.middle_name = middle_name === '' ? null : middle_name.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Нет данных для обновления' 
      });
    }

    logger.info('Updating user profile', { userId, updates });

    const user = await UserService.updateUserById(userId, updates);
    
    logger.info('Profile updated successfully', { userId });
    
    return res.json({ 
      success: true, 
      user,
      message: 'Профиль обновлен успешно'
    });
  } catch (error: any) {
    logger.error('Error updating profile', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Ошибка обновления профиля' 
    });
  }
}
