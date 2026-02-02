import { Request, Response } from 'express';
import { EventService } from '../services/eventService';
import { UserService } from '../services/supabase';
import { TargetedQuestionService } from '../services/targetedQuestionService';
import { AssignmentService } from '../services/assignmentService';
import { DirectionService } from '../services/directionService';
import { notifyNewEvent, notifyNewDiagnostic } from '../utils/telegramBot';
import { logger } from '../utils/logger';

export class AdminController {
  /**
   * Создание мероприятия
   */
  static async createEvent(req: Request, res: Response) {
    try {
      // Извлекаем initData и оставляем только данные события
      const { initData, ...eventData } = req.body;
      
      const event = await EventService.createEvent(eventData);

      // Отправка уведомления только если мероприятие опубликовано
      if (event.status === 'published' && (process.env.NODE_ENV === 'production' || process.env.ENABLE_NOTIFICATIONS === 'true')) {
        if (event.type === 'diagnostic') {
          notifyNewDiagnostic(event.title, event.id).catch((err) => 
            logger.error('Error sending diagnostic notification', err instanceof Error ? err : new Error(String(err)))
          );
        } else {
          notifyNewEvent(event.title, event.id).catch((err) => 
            logger.error('Error sending event notification', err instanceof Error ? err : new Error(String(err)))
          );
        }
      }

      return res.status(201).json({ success: true, event });
    } catch (error) {
      logger.error('Create event error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при создании мероприятия' });
    }
  }

  /**
   * Обновление мероприятия
   */
  static async updateEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Извлекаем initData и оставляем только данные для обновления
      const { initData, ...updates } = req.body;
      
      // Получаем текущее состояние мероприятия для проверки изменения статуса
      const currentEvent = await EventService.getEventById(id);
      const wasPublished = currentEvent?.status === 'published';
      
      const event = await EventService.updateEvent(id, updates);
      
      // Отправка уведомления, если статус изменился на published
      if (updates.status === 'published' && !wasPublished && (process.env.NODE_ENV === 'production' || process.env.ENABLE_NOTIFICATIONS === 'true')) {
        if (event.type === 'diagnostic') {
          notifyNewDiagnostic(event.title, event.id).catch((err) => 
            logger.error('Error sending diagnostic notification', err instanceof Error ? err : new Error(String(err)))
          );
        } else {
          notifyNewEvent(event.title, event.id).catch((err) => 
            logger.error('Error sending event notification', err instanceof Error ? err : new Error(String(err)))
          );
        }
      }
      
      return res.json({ success: true, event });
    } catch (error) {
      logger.error('Update event error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при обновлении мероприятия' });
    }
  }

  /**
   * Удаление мероприятия
   */
  static async deleteEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await EventService.deleteEvent(id);
      return res.json({ success: true, message: 'Мероприятие удалено' });
    } catch (error) {
      logger.error('Delete event error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при удалении мероприятия' });
    }
  }


  /**
   * Получение списка пользователей
   */
  static async getAllUsers(req: Request, res: Response) {
    try {
      const users = await UserService.getAllUsers();
      return res.json({ success: true, users });
    } catch (error) {
      logger.error('Get all users error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении пользователей' });
    }
  }

  /**
   * Получение деталей пользователя (включая ответы, targeted вопросы и задания)
   */
  static async getUserDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);
      
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      // Ответы на персональные вопросы
      const targetedAnswers = await TargetedQuestionService.getAllUserAnswers(id);
      
      // Выполненные задания
      const submissions = await AssignmentService.getUserSubmissions(id);

      return res.json({ 
        success: true, 
        user: { ...user, targetedAnswers, submissions } 
      });
    } catch (error) {
      logger.error('Get user details error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении деталей пользователя' });
    }
  }

  /**
   * Редактирование пользователя
   */
  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Извлекаем initData
      const { initData, ...updates } = req.body;
      
      const user = await UserService.updateUserByAdmin(id, updates);
      return res.json({ success: true, user });
    } catch (error) {
      logger.error('Update user error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при обновлении пользователя' });
    }
  }

  /**
   * Получение всех событий (для админки)
   */
  static async getAllEvents(req: Request, res: Response) {
    try {
      const events = await EventService.getAllEvents();
      return res.json({ success: true, events });
    } catch (error) {
      logger.error('Get all events error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении мероприятий' });
    }
  }

  /**
   * Получение аналитики мероприятия
   */
  static async getEventAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { questions, answers } = await EventService.getEventAnalytics(id);
      
      return res.json({ success: true, questions, answers });
    } catch (error) {
      logger.error('Get analytics error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении аналитики' });
    }
  }

  /**
   * Назначение типа пользователя
   */

  /**
   * Назначение направления пользователю
   */
  static async setUserDirectionFromSelection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { direction } = req.body;
      
      await DirectionService.setUserDirection(id, direction || null);
      const user = await UserService.getUserById(id);
      
      // Отправка уведомления, если направление назначено
      if (direction && user) {
        const directions = await DirectionService.getAllDirections();
        const directionObj = directions.find(d => d.slug === direction || d.code === direction);
        if (directionObj) {
          const { notifyDirectionAssigned } = await import('../utils/telegramBot');
          notifyDirectionAssigned(user.telegram_id, directionObj.name).catch((err) => 
            logger.error('Error sending direction notification', err instanceof Error ? err : new Error(String(err)))
          );
        }
      }
      
      return res.json({ success: true, user });
    } catch (error) {
      logger.error('Set user direction error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при назначении направления' });
    }
  }
}
