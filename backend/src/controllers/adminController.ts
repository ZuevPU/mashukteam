import { Request, Response } from 'express';
import { EventService } from '../services/eventService';
import { UserService } from '../services/supabase';
import { TargetedQuestionService } from '../services/targetedQuestionService';
import { AssignmentService } from '../services/assignmentService';
import { DirectionService } from '../services/directionService';
import { broadcastMessage } from '../utils/telegramBot';

export class AdminController {
  /**
   * Создание мероприятия
   */
  static async createEvent(req: Request, res: Response) {
    try {
      // Извлекаем initData и оставляем только данные события
      const { initData, ...eventData } = req.body;
      
      const event = await EventService.createEvent(eventData);

      // Отправка уведомления
      if (process.env.NODE_ENV === 'production' || process.env.ENABLE_NOTIFICATIONS === 'true') {
        const message = `📢 <b>Анонс нового мероприятия: ${event.title}!</b>\n\nЗаходи в приложение, чтобы узнать подробности!`;
        // Запускаем асинхронно, не блокируя ответ
        broadcastMessage(message).catch(console.error);
      }

      return res.status(201).json({ success: true, event });
    } catch (error) {
      console.error('Create event error:', error);
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
      
      const event = await EventService.updateEvent(id, updates);
      return res.json({ success: true, event });
    } catch (error) {
      console.error('Update event error:', error);
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
      console.error('Delete event error:', error);
      return res.status(500).json({ error: 'Ошибка при удалении мероприятия' });
    }
  }

  /**
   * Добавление вопроса
   */
  static async addQuestion(req: Request, res: Response) {
    try {
      const { id } = req.params; // eventId
      // Извлекаем initData
      const { initData, ...questionData } = req.body;
      
      const question = await EventService.addQuestion(id, questionData);
      return res.status(201).json({ success: true, question });
    } catch (error) {
      console.error('Add question error:', error);
      return res.status(500).json({ error: 'Ошибка при добавлении вопроса' });
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
      console.error('Get all users error:', error);
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

      // Ответы на мероприятия/диагностику
      const answers = await EventService.getUserAnswers(id);
      
      // Ответы на персональные вопросы
      const targetedAnswers = await TargetedQuestionService.getAllUserAnswers(id);
      
      // Выполненные задания
      const submissions = await AssignmentService.getUserSubmissions(id);

      return res.json({ 
        success: true, 
        user: { ...user, answers, targetedAnswers, submissions } 
      });
    } catch (error) {
      console.error('Get user details error:', error);
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
      console.error('Update user error:', error);
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
      console.error('Get all events error:', error);
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
      console.error('Get analytics error:', error);
      return res.status(500).json({ error: 'Ошибка при получении аналитики' });
    }
  }

  /**
   * Назначение типа пользователя
   */
  static async setUserType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userType } = req.body;
      const user = await UserService.setUserType(id, userType);
      return res.json({ success: true, user });
    } catch (error) {
      console.error('Set user type error:', error);
      return res.status(500).json({ error: 'Ошибка при назначении типа' });
    }
  }

  /**
   * Назначение направления пользователю
   */
  static async setUserDirection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { direction_id } = req.body;
      
      await DirectionService.setUserDirection(id, direction_id || null);
      const user = await UserService.getUserById(id);
      
      // Отправка уведомления, если направление назначено
      if (direction_id && user) {
        const direction = await DirectionService.getDirectionById(direction_id);
        if (direction) {
          const { notifyDirectionAssigned } = await import('../utils/telegramBot');
          notifyDirectionAssigned(user.telegram_id, direction.name).catch(console.error);
        }
      }
      
      return res.json({ success: true, user });
    } catch (error) {
      console.error('Set user direction error:', error);
      return res.status(500).json({ error: 'Ошибка при назначении направления' });
    }
  }
}
