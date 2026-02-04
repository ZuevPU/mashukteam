import { Request, Response, NextFunction } from 'express';
import { getTelegramIdFromInitData } from '../utils/telegramAuth';
import { UserService } from '../services/supabase';
import { logger } from '../utils/logger';

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
    const initData = req.body?.initData || req.headers['x-telegram-init-data'] || req.headers['x-init-data'] || req.query?.initData;

    if (!initData) {
      // #region agent log
      try{const fs=require('fs');const path=require('path');const logPath=path.join(process.cwd(),'.cursor','debug.log');const logEntry={id:`log_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,timestamp:Date.now(),location:'authMiddleware.ts:23',message:'no initData',data:{path:req.path},sessionId:'debug-session',runId:'run1',hypothesisId:'C'};fs.appendFileSync(logPath,JSON.stringify(logEntry)+'\n');}catch(e){}
      // #endregion
      return res.status(401).json({ error: 'Требуется авторизация (initData)' });
    }

    const telegramId = getTelegramIdFromInitData(initData);
    if (!telegramId) {
      // #region agent log
      try{const fs=require('fs');const path=require('path');const logPath=path.join(process.cwd(),'.cursor','debug.log');const logEntry={id:`log_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,timestamp:Date.now(),location:'authMiddleware.ts:28',message:'invalid initData',data:{path:req.path},sessionId:'debug-session',runId:'run1',hypothesisId:'C'};fs.appendFileSync(logPath,JSON.stringify(logEntry)+'\n');}catch(e){}
      // #endregion
      return res.status(401).json({ error: 'Невалидные данные авторизации' });
    }

    const user = await UserService.getUserByTelegramId(telegramId);
    if (!user) {
      // #region agent log
      try{const fs=require('fs');const path=require('path');const logPath=path.join(process.cwd(),'.cursor','debug.log');const logEntry={id:`log_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,timestamp:Date.now(),location:'authMiddleware.ts:33',message:'user not found',data:{telegramId},sessionId:'debug-session',runId:'run1',hypothesisId:'C'};fs.appendFileSync(logPath,JSON.stringify(logEntry)+'\n');}catch(e){}
      // #endregion
      return res.status(403).json({ error: 'Пользователь не найден' });
    }

    req.user = user;
    // #region agent log
    try{const fs=require('fs');const path=require('path');const logPath=path.join(process.cwd(),'.cursor','debug.log');const logEntry={id:`log_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,timestamp:Date.now(),location:'authMiddleware.ts:37',message:'auth success',data:{userId:user.id,isAdmin:user.is_admin,path:req.path},sessionId:'debug-session',runId:'run1',hypothesisId:'C'};fs.appendFileSync(logPath,JSON.stringify(logEntry)+'\n');}catch(e){}
    // #endregion
    next();
  } catch (error) {
    // #region agent log
    try{const fs=require('fs');const path=require('path');const logPath=path.join(process.cwd(),'.cursor','debug.log');const logEntry={id:`log_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,timestamp:Date.now(),location:'authMiddleware.ts:40',message:'auth error',data:{errorMessage:error instanceof Error ? error.message : String(error),path:req.path},sessionId:'debug-session',runId:'run1',hypothesisId:'C'};fs.appendFileSync(logPath,JSON.stringify(logEntry)+'\n');}catch(e){}
    // #endregion
    logger.error('Auth error', error instanceof Error ? error : new Error(String(error)));
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
