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

    if (!initData) {
      return res.status(400).json({ error: 'initData обязателен' });
    }

    // Валидация initData
    if (!validateInitData(initData)) {
      return res.status(401).json({ error: 'Невалидный initData' });
    }

    // Извлечение telegram_id
    const telegramId = getTelegramIdFromInitData(initData);
    if (!telegramId) {
      return res.status(400).json({ error: 'Не удалось извлечь telegram_id' });
    }

    // Проверка существования пользователя
    let user = await UserService.getUserByTelegramId(telegramId);

    // Если пользователь не существует, создаём нового со статусом "new"
    if (!user) {
      // Парсим данные пользователя из initData для создания
      const { parseInitData } = await import('../utils/telegramAuth');
      const parsed = parseInitData(initData);
      
      if (!parsed) {
        return res.status(400).json({ error: 'Ошибка парсинга initData' });
      }

      user = await UserService.createUser({
        telegram_id: telegramId,
        telegram_username: parsed.username,
        first_name: parsed.first_name,
        last_name: parsed.last_name || '',
        middle_name: undefined,
        motivation: '', // Будет заполнено при регистрации
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        status: user.status,
        first_name: user.first_name,
      },
    });
  } catch (error) {
    console.error('Error in verifyAuth:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
