import { Request, Response } from 'express';
import { validateInitData, getTelegramIdFromInitData } from '../utils/telegramAuth';
import { UserService } from '../services/supabase';
import {
  PointsService,
  AchievementService,
  LevelService,
  AnalyticsService,
} from '../services/gamification';
import { AddPointsDto, UnlockAchievementDto } from '../types';
import { logger } from '../utils/logger';

/**
 * Контроллер для работы с геймификацией
 */

interface GamificationRequest extends Request {
  body: {
    initData: string;
    points?: number;
    reason?: string;
    achievement_id?: string;
  };
  params: {
    userId?: string;
  };
}

/**
 * POST /api/gamification/points/add
 * Начисление баллов пользователю
 */
export async function addPoints(req: GamificationRequest, res: Response) {
  try {
    const { initData, points, reason } = req.body;

    if (!initData) {
      return res.status(400).json({ error: 'initData обязателен' });
    }

    if (!validateInitData(initData)) {
      return res.status(401).json({ error: 'Невалидный initData' });
    }

    if (points === undefined || points === null) {
      return res.status(400).json({ error: 'Количество баллов обязательно' });
    }

    if (typeof points !== 'number' || points === 0) {
      return res.status(400).json({ error: 'Количество баллов должно быть ненулевым числом' });
    }

    const telegramId = getTelegramIdFromInitData(initData);
    if (!telegramId) {
      return res.status(400).json({ error: 'Не удалось извлечь telegram_id' });
    }

    const user = await UserService.getUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const transaction = await PointsService.addPoints(user.id, points, reason);

    // Логируем действие
    await AnalyticsService.logAction(user.id, 'points_added', {
      points,
      reason,
      transaction_id: transaction.id,
    });

    return res.json({
      success: true,
      transaction,
      total_points: await PointsService.getUserTotalPoints(user.id),
    });
  } catch (error: any) {
    logger.error(error instanceof Error ? error : new Error(String(error)), 'Error in addPoints');
    return res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}

/**
 * GET /api/gamification/points/:userId
 * Получение истории баллов пользователя
 */
export async function getUserPoints(req: GamificationRequest, res: Response) {
  try {
    const { initData } = req.body;
    const userId = req.params.userId;

    if (!initData) {
      return res.status(400).json({ error: 'initData обязателен' });
    }

    if (!validateInitData(initData)) {
      return res.status(401).json({ error: 'Невалидный initData' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'userId обязателен' });
    }

    // Проверяем, что пользователь запрашивает свои данные
    const telegramId = getTelegramIdFromInitData(initData);
    if (!telegramId) {
      return res.status(400).json({ error: 'Не удалось извлечь telegram_id' });
    }

    const user = await UserService.getUserByTelegramId(telegramId);
    if (!user || user.id !== userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const points = await PointsService.getUserPoints(userId);
    const totalPoints = await PointsService.getUserTotalPoints(userId);

    return res.json({
      success: true,
      points,
      total_points: totalPoints,
    });
  } catch (error: any) {
    logger.error(error instanceof Error ? error : new Error(String(error)), 'Error in getUserPoints');
    return res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}

/**
 * GET /api/gamification/achievements/:userId
 * Получение достижений пользователя
 */
export async function getUserAchievements(req: GamificationRequest, res: Response) {
  try {
    const { initData } = req.body;
    const userId = req.params.userId;

    if (!initData) {
      return res.status(400).json({ error: 'initData обязателен' });
    }

    if (!validateInitData(initData)) {
      return res.status(401).json({ error: 'Невалидный initData' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'userId обязателен' });
    }

    // Проверяем, что пользователь запрашивает свои данные
    const telegramId = getTelegramIdFromInitData(initData);
    if (!telegramId) {
      return res.status(400).json({ error: 'Не удалось извлечь telegram_id' });
    }

    const user = await UserService.getUserByTelegramId(telegramId);
    if (!user || user.id !== userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const achievements = await AchievementService.getUserAchievements(userId);
    const allAchievements = await AchievementService.getAllAchievements();

    return res.json({
      success: true,
      user_achievements: achievements,
      all_achievements: allAchievements,
      unlocked_count: achievements.length,
      total_count: allAchievements.length,
    });
  } catch (error: any) {
    logger.error(error instanceof Error ? error : new Error(String(error)), 'Error in getUserAchievements');
    return res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}

/**
 * POST /api/gamification/achievements/unlock
 * Разблокировка достижения
 */
export async function unlockAchievement(req: GamificationRequest, res: Response) {
  try {
    const { initData, achievement_id } = req.body;

    if (!initData) {
      return res.status(400).json({ error: 'initData обязателен' });
    }

    if (!validateInitData(initData)) {
      return res.status(401).json({ error: 'Невалидный initData' });
    }

    if (!achievement_id) {
      return res.status(400).json({ error: 'achievement_id обязателен' });
    }

    const telegramId = getTelegramIdFromInitData(initData);
    if (!telegramId) {
      return res.status(400).json({ error: 'Не удалось извлечь telegram_id' });
    }

    const user = await UserService.getUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const userAchievement = await AchievementService.unlockAchievement(user.id, achievement_id);

    // Логируем действие
    await AnalyticsService.logAction(user.id, 'achievement_unlocked', {
      achievement_id,
      achievement_name: userAchievement.achievement?.name,
    });

    return res.json({
      success: true,
      achievement: userAchievement,
      message: `Достижение "${userAchievement.achievement?.name}" разблокировано!`,
    });
  } catch (error: any) {
    logger.error(error instanceof Error ? error : new Error(String(error)), 'Error in unlockAchievement');
    return res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}

/**
 * GET /api/gamification/stats/:userId
 * Получение статистики пользователя
 */
export async function getUserStats(req: GamificationRequest, res: Response) {
  try {
    const { initData } = req.body;
    const userId = req.params.userId;

    if (!initData) {
      return res.status(400).json({ error: 'initData обязателен' });
    }

    if (!validateInitData(initData)) {
      return res.status(401).json({ error: 'Невалидный initData' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'userId обязателен' });
    }

    // Проверяем, что пользователь запрашивает свои данные
    const telegramId = getTelegramIdFromInitData(initData);
    if (!telegramId) {
      return res.status(400).json({ error: 'Не удалось извлечь telegram_id' });
    }

    const user = await UserService.getUserByTelegramId(telegramId);
    if (!user || user.id !== userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const stats = await AnalyticsService.getUserStats(userId);

    return res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Error in getUserStats:', error);
    return res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}

/**
 * POST /api/gamification/level/up
 * Повышение уровня (обычно вызывается автоматически, но может быть вызвано вручную)
 */
export async function levelUp(req: GamificationRequest, res: Response) {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ error: 'initData обязателен' });
    }

    if (!validateInitData(initData)) {
      return res.status(401).json({ error: 'Невалидный initData' });
    }

    const telegramId = getTelegramIdFromInitData(initData);
    if (!telegramId) {
      return res.status(400).json({ error: 'Не удалось извлечь telegram_id' });
    }

    const user = await UserService.getUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const userLevel = await LevelService.levelUp(user.id);

    return res.json({
      success: true,
      level: userLevel,
      message: `Поздравляем! Вы достигли уровня ${userLevel.level}!`,
    });
  } catch (error: any) {
    logger.error(error instanceof Error ? error : new Error(String(error)), 'Error in levelUp');
    return res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}
