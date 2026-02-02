import { Request, Response } from 'express';
import { UserPreferencesService } from '../services/userPreferencesService';
import { logger } from '../utils/logger';
import { UpdateUserPreferencesDto } from '../types';

export class UserPreferencesController {
  /**
   * GET /api/user/preferences
   * Получение настроек текущего пользователя
   */
  static async getPreferences(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        logger.warn('getPreferences: No user ID found in request');
        return res.status(401).json({
          success: false,
          error: 'Не авторизован'
        });
      }

      const preferences = await UserPreferencesService.getUserPreferences(userId);

      return res.json({
        success: true,
        preferences
      });
    } catch (error: any) {
      logger.error('Get preferences error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении настроек',
        message: error.message || 'Неизвестная ошибка'
      });
    }
  }

  /**
   * PATCH /api/user/preferences
   * Обновление настроек текущего пользователя
   */
  static async updatePreferences(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        logger.warn('updatePreferences: No user ID found in request');
        return res.status(401).json({
          success: false,
          error: 'Не авторизован'
        });
      }

      const updateData: UpdateUserPreferencesDto = req.body;

      // Валидация данных
      if (updateData.theme && !['light', 'dark', 'auto'].includes(updateData.theme)) {
        return res.status(400).json({
          success: false,
          error: 'Некорректное значение темы. Допустимые значения: light, dark, auto'
        });
      }

      const preferences = await UserPreferencesService.updateUserPreferences(userId, updateData);

      return res.json({
        success: true,
        preferences,
        message: 'Настройки обновлены успешно'
      });
    } catch (error: any) {
      logger.error('Update preferences error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении настроек',
        message: error.message || 'Неизвестная ошибка'
      });
    }
  }
}
