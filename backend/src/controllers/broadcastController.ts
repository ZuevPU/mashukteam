import { Request, Response } from 'express';
import { BroadcastService } from '../services/broadcastService';
import { UserService } from '../services/supabase';
import { sendBroadcastToUsers } from '../utils/telegramBot';
import { logger } from '../utils/logger';
import { CreateBroadcastDto } from '../types';
import { SchedulerService } from '../services/schedulerService';

export class BroadcastController {
  /**
   * Создание новой рассылки
   */
  static async createBroadcast(req: Request, res: Response) {
    try {
      const { initData, ...data } = req.body as { initData: string } & CreateBroadcastDto;
      
      // Получаем ID администратора
      let createdBy: string | undefined;
      try {
        const telegramId = JSON.parse(Buffer.from(initData.split('&')[0].split('=')[1], 'base64').toString()).user?.id;
        if (telegramId) {
          const admin = await UserService.getUserByTelegramId(telegramId);
          createdBy = admin?.id;
        }
      } catch (e) {
        // Игнорируем ошибки парсинга
      }

      const broadcast = await BroadcastService.createBroadcast(data, createdBy);
      return res.status(201).json({ success: true, broadcast });
    } catch (error) {
      logger.error('Error creating broadcast', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при создании рассылки' });
    }
  }

  /**
   * Получение всех рассылок
   */
  static async getAllBroadcasts(req: Request, res: Response) {
    try {
      // Проверяем запланированный контент перед получением рассылок
      SchedulerService.checkScheduledContentIfNeeded();
      
      const broadcasts = await BroadcastService.getAllBroadcasts();
      return res.json({ success: true, broadcasts });
    } catch (error) {
      logger.error('Error fetching broadcasts', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении рассылок' });
    }
  }

  /**
   * Получение рассылки по ID
   */
  static async getBroadcastById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const broadcast = await BroadcastService.getBroadcastById(id);
      
      if (!broadcast) {
        return res.status(404).json({ error: 'Рассылка не найдена' });
      }

      return res.json({ success: true, broadcast });
    } catch (error) {
      logger.error('Error fetching broadcast', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении рассылки' });
    }
  }

  /**
   * Обновление рассылки
   */
  static async updateBroadcast(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { initData, ...data } = req.body;

      const broadcast = await BroadcastService.updateBroadcast(id, data);
      return res.json({ success: true, broadcast });
    } catch (error) {
      logger.error('Error updating broadcast', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при обновлении рассылки' });
    }
  }

  /**
   * Удаление рассылки
   */
  static async deleteBroadcast(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await BroadcastService.deleteBroadcast(id);
      return res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting broadcast', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при удалении рассылки' });
    }
  }

  /**
   * Отправка рассылки
   */
  static async sendBroadcast(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const broadcast = await BroadcastService.getBroadcastById(id);
      if (!broadcast) {
        return res.status(404).json({ error: 'Рассылка не найдена' });
      }

      if (broadcast.status === 'sent') {
        return res.status(400).json({ error: 'Рассылка уже отправлена' });
      }

      // Получаем получателей
      const users = await UserService.getAllUsers();
      let targetUsers = users;

      if (broadcast.target_type === 'by_direction' && broadcast.target_values) {
        targetUsers = users.filter(u => u.direction && broadcast.target_values!.includes(u.direction));
      } else if (broadcast.target_type === 'individual' && broadcast.target_values) {
        targetUsers = users.filter(u => broadcast.target_values!.includes(u.id));
      }

      // Отправляем рассылку
      const result = await sendBroadcastToUsers(
        targetUsers,
        broadcast.message,
        broadcast.image_url
      );

      // Обновляем статус
      await BroadcastService.markAsSent(id, result.success, result.failed);

      return res.json({ 
        success: true, 
        sent: result.success, 
        failed: result.failed,
        total: targetUsers.length
      });
    } catch (error) {
      logger.error('Error sending broadcast', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при отправке рассылки' });
    }
  }
}
