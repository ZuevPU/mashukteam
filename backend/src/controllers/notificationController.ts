import { Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { logger } from '../utils/logger';

export class NotificationController {
  /**
   * Получение уведомлений пользователя
   */
  static async getMyNotifications(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Не авторизован' });
      }

      const limit = parseInt(req.body.limit as string) || 50;
      const notifications = await NotificationService.getUserNotifications(userId, limit);
      const unreadCount = await NotificationService.getUnreadCount(userId);

      return res.json({
        success: true,
        notifications,
        unreadCount
      });
    } catch (error) {
      logger.error('Get notifications error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении уведомлений' });
    }
  }

  /**
   * Отметить уведомление как прочитанное
   */
  static async markAsRead(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Не авторизован' });
      }

      await NotificationService.markAsRead(userId, id);

      return res.json({ success: true });
    } catch (error) {
      logger.error('Mark as read error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при обновлении уведомления' });
    }
  }

  /**
   * Отметить все уведомления как прочитанные
   */
  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Не авторизован' });
      }

      await NotificationService.markAllAsRead(userId);

      return res.json({ success: true });
    } catch (error) {
      logger.error('Mark all as read error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при обновлении уведомлений' });
    }
  }
}
