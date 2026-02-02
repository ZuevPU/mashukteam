import { Request, Response } from 'express';
import { EventService } from '../services/eventService';
import { ReflectionService } from '../services/reflectionService';
import { AchievementService } from '../services/gamification';
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
   * Получение деталей мероприятия (с вопросами и ответами пользователя)
   */
  static async getEventDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id; // Из auth middleware
      const event = await EventService.getEventById(id);
      
      if (!event) {
        return res.status(404).json({ error: 'Мероприятие не найдено' });
      }

      const questions = await EventService.getEventQuestions(id);
      const userAnswers = await EventService.getUserEventAnswers(userId, id);

      return res.json({ 
        success: true, 
        event,
        questions,
        userAnswers // Возвращаем ответы пользователя
      });
    } catch (error) {
      console.error('Get event details error:', error);
      return res.status(500).json({ error: 'Ошибка при получении деталей мероприятия' });
    }
  }

  /**
   * Отправка ответа
   */
  static async submitAnswer(req: Request, res: Response) {
    try {
      const { id } = req.params; // eventId
      const userId = req.user.id; // Из auth middleware
      const answerData = req.body; // SubmitAnswerDto

      const answer = await EventService.submitAnswer(userId, id, answerData);
      
      // Начисление баллов рефлексии
      try {
        const event = await EventService.getEventById(id);
        if (event) {
          const actionType = event.type === 'diagnostic' ? 'diagnostic_answer' : 'event_answer';
          await ReflectionService.addReflectionPoints(userId, actionType);
          
          // Проверка достижений после начисления баллов
          try {
            await AchievementService.checkAndUnlockAchievements(userId);
          } catch (achievementError) {
            logger.error('Error checking achievements', achievementError instanceof Error ? achievementError : new Error(String(achievementError)));
            // Не прерываем выполнение, если ошибка проверки достижений
          }
        }
      } catch (reflectionError) {
        logger.error('Error adding reflection points', reflectionError instanceof Error ? reflectionError : new Error(String(reflectionError)));
        // Не прерываем выполнение, если ошибка начисления рефлексии
      }
      
      return res.status(201).json({ success: true, answer });
    } catch (error) {
      console.error('Submit answer error:', error);
      return res.status(500).json({ error: 'Ошибка при сохранении ответа' });
    }
  }

  /**
   * Получение ответов пользователя
   */
  static async getMyAnswers(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const answers = await EventService.getUserAnswers(userId);
      return res.json({ success: true, answers });
    } catch (error) {
      logger.error('Get my answers error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении истории ответов' });
    }
  }
}
