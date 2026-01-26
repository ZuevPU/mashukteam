import { Request, Response } from 'express';
import { UserService } from '../services/supabase';
import { getTelegramIdFromInitData } from '../utils/telegramAuth';
import { CreateUserDto } from '../types';

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
    console.error('Error in getUser:', error);
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

    if (!initData) {
      return res.status(400).json({ error: 'initData обязателен' });
    }

    if (!registrationData) {
      return res.status(400).json({ error: 'Данные регистрации обязательны' });
    }

    // Валидация данных регистрации
    if (!registrationData.first_name || !registrationData.last_name) {
      return res.status(400).json({ error: 'Имя и фамилия обязательны' });
    }

    if (!registrationData.motivation || registrationData.motivation.length < 10) {
      return res.status(400).json({ 
        error: 'Мотивация обязательна и должна содержать минимум 10 символов' 
      });
    }

    const telegramId = getTelegramIdFromInitData(initData);
    if (!telegramId) {
      return res.status(400).json({ error: 'Не удалось извлечь telegram_id' });
    }

    // Проверка существования пользователя
    const existingUser = await UserService.getUserByTelegramId(telegramId);
    if (!existingUser) {
      return res.status(404).json({ error: 'Пользователь не найден. Сначала выполните аутентификацию.' });
    }

    // Завершение регистрации
    const updatedUser = await UserService.completeRegistration(telegramId, {
      telegram_id: telegramId,
      first_name: registrationData.first_name,
      last_name: registrationData.last_name,
      middle_name: registrationData.middle_name,
      motivation: registrationData.motivation,
    });

    return res.json({
      success: true,
      user: updatedUser,
      message: 'Регистрация завершена успешно',
    });
  } catch (error) {
    console.error('Error in registerUser:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
