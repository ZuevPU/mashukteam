import { Request, Response, NextFunction } from 'express';
import { getTelegramIdFromInitData } from '../utils/telegramAuth';
import { UserService } from '../services/supabase';

// Расширяем интерфейс Request для добавления пользователя
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Middleware для проверки авторизации через initData
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const initData = req.body.initData || req.headers['x-telegram-init-data'];

    if (!initData) {
      return res.status(401).json({ error: 'Требуется авторизация (initData)' });
    }

    const telegramId = getTelegramIdFromInitData(initData);
    if (!telegramId) {
      return res.status(401).json({ error: 'Невалидные данные авторизации' });
    }

    const user = await UserService.getUserByTelegramId(telegramId);
    if (!user) {
      return res.status(403).json({ error: 'Пользователь не найден' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Ошибка авторизации' });
  }
};

/**
 * Middleware для проверки прав администратора
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Пользователь не авторизован' });
  }

  // Проверка флага is_admin (1 - админ, 0 - нет)
  if (req.user.is_admin !== 1) {
    return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора.' });
  }

  next();
};
