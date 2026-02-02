import { Request, Response } from 'express';
import { DirectionService } from '../services/directionService';
import { logger } from '../utils/logger';

export class DirectionController {
  /**
   * Получение всех направлений (публичный доступ)
   */
  static async getAllDirections(req: Request, res: Response) {
    try {
      const directions = await DirectionService.getAllDirections();
      return res.json({ success: true, directions });
    } catch (error) {
      logger.error('Get directions error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении направлений' });
    }
  }

  /**
   * Создание направления (админ)
   */
  static async createDirection(req: Request, res: Response) {
    try {
      const { initData, ...data } = req.body;
      const direction = await DirectionService.createDirection(data);
      return res.status(201).json({ success: true, direction });
    } catch (error) {
      logger.error('Create direction error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при создании направления' });
    }
  }

  /**
   * Обновление направления (админ)
   */
  static async updateDirection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { initData, ...data } = req.body;
      const direction = await DirectionService.updateDirection(id, data);
      return res.json({ success: true, direction });
    } catch (error) {
      console.error('Update direction error:', error);
      return res.status(500).json({ error: 'Ошибка при обновлении направления' });
    }
  }

  /**
   * Удаление направления (админ)
   */
  static async deleteDirection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await DirectionService.deleteDirection(id);
      return res.json({ success: true, message: 'Направление удалено' });
    } catch (error) {
      logger.error('Delete direction error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при удалении направления' });
    }
  }
}
