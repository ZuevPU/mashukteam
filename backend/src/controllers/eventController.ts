import { Request, Response } from 'express';
import { EventService } from '../services/eventService';
import { logger } from '../utils/logger';

export class EventController {
  /**
   * Получение списка мероприятий
   */
  static async getEvents(req: Request, res: Response) {
    try {
      // Для пользователей возвращаем только опубликованные
      const events = await EventService.getPublishedEvents();
      return res.json({ success: true, events });
    } catch (error) {
      logger.error('Get events error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении мероприятий' });
    }
  }

  /**
   * Получение деталей мероприятия (только информация о мероприятии)
   */
  static async getEventDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const event = await EventService.getEventById(id);
      
      if (!event) {
        return res.status(404).json({ error: 'Мероприятие не найдено' });
      }

      return res.json({ 
        success: true, 
        event
      });
    } catch (error) {
      logger.error('Get event details error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении деталей мероприятия' });
    }
  }
}
