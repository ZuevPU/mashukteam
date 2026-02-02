import { Request, Response } from 'express';
import { TargetedQuestionService } from '../services/targetedQuestionService';
import { ReflectionService } from '../services/reflectionService';
import { AchievementService } from '../services/gamification';
import { notifyTargetedQuestionToUsers } from '../utils/telegramBot';
import { UserService } from '../services/supabase';
import { logger } from '../utils/logger';

export class TargetedQuestionController {
  /**
   * Получение вопросов для пользователя
   */
  static async getMyQuestions(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const userType = req.user.user_type;
      
      const questions = await TargetedQuestionService.getQuestionsForUser(userId, userType);
      const answers = await TargetedQuestionService.getUserAnswers(userId);
      
      return res.json({ success: true, questions, answers });
    } catch (error) {
      console.error('Get my questions error:', error);
      return res.status(500).json({ error: 'Ошибка при получении вопросов' });
    }
  }

  /**
   * Отправка ответа
   */
  static async submitAnswer(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const { questionId, answerData } = req.body;
      
      const answer = await TargetedQuestionService.submitAnswer(userId, questionId, answerData);
      
      // Начисление баллов рефлексии за ответ на персональный вопрос
      try {
        await ReflectionService.addReflectionPoints(userId, 'targeted_answer');
        
        // Проверка достижений после начисления баллов
        try {
          await AchievementService.checkAndUnlockAchievements(userId);
        } catch (achievementError) {
          logger.error('Error checking achievements', achievementError instanceof Error ? achievementError : new Error(String(achievementError)));
          // Не прерываем выполнение, если ошибка проверки достижений
        }
      } catch (reflectionError) {
        logger.error('Error adding reflection points', reflectionError instanceof Error ? reflectionError : new Error(String(reflectionError)));
        // Не прерываем выполнение, если ошибка начисления рефлексии
      }
      
      return res.json({ success: true, answer });
    } catch (error) {
      console.error('Submit targeted answer error:', error);
      return res.status(500).json({ error: 'Ошибка при сохранении ответа' });
    }
  }

  /**
   * Создание вопроса (Админ)
   */
  static async createQuestion(req: Request, res: Response) {
    try {
      const { initData, sendNotification, ...data } = req.body;
      const question = await TargetedQuestionService.createQuestion(data);
      
      // Отправка уведомлений, если запрошено
      if (sendNotification && question.status === 'published') {
        try {
          if (data.target_audience === 'all') {
            // Всем пользователям
            const users = await UserService.getAllUsers();
            const userIds = users.map(u => u.id);
            notifyTargetedQuestionToUsers(userIds, question.text, question.id).catch((err) => 
              logger.error('Error sending targeted question notification', err instanceof Error ? err : new Error(String(err)))
            );
          } else if (data.target_audience === 'by_type' && data.target_values) {
            // По типу пользователя
            const users = await UserService.getAllUsers();
            const targetUsers = users.filter(u => data.target_values.includes(u.user_type));
            const userIds = targetUsers.map(u => u.id);
            notifyTargetedQuestionToUsers(userIds, question.text, question.id).catch((err) => 
              logger.error('Error sending targeted question notification', err instanceof Error ? err : new Error(String(err)))
            );
          } else if (data.target_audience === 'individual' && data.target_values) {
            // Конкретным пользователям
            notifyTargetedQuestionToUsers(data.target_values, question.text, question.id).catch(console.error);
          }
        } catch (notifError) {
          logger.error('Error sending notifications', notifError instanceof Error ? notifError : new Error(String(notifError)));
          // Не прерываем создание вопроса из-за ошибки уведомлений
        }
      }
      
      return res.status(201).json({ success: true, question });
    } catch (error) {
      logger.error('Create targeted question error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при создании вопроса' });
    }
  }

  /**
   * Получение всех вопросов (Админ)
   */
  static async getAllQuestions(req: Request, res: Response) {
    try {
      const questions = await TargetedQuestionService.getAllQuestions();
      return res.json({ success: true, questions });
    } catch (error) {
      logger.error('Get all questions error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении вопросов' });
    }
  }

  /**
   * Получение всех ответов (Админ)
   */
  static async getAllAnswers(req: Request, res: Response) {
    try {
      const answers = await TargetedQuestionService.getAllAnswersWithDetails();
      return res.json({ success: true, answers });
    } catch (error) {
      console.error('Get all answers error:', error);
      return res.status(500).json({ error: 'Ошибка при получении ответов' });
    }
  }

  /**
   * Обновление вопроса (Админ)
   */
  static async updateQuestion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { initData, sendNotification, ...data } = req.body;
      
      // Получаем текущее состояние вопроса для проверки изменения статуса
      const currentQuestion = await TargetedQuestionService.getQuestionById(id);
      const wasPublished = currentQuestion?.status === 'published';
      
      const question = await TargetedQuestionService.updateQuestion(id, data);
      
      // Отправка уведомлений, если статус изменился на published
      if (data.status === 'published' && !wasPublished && sendNotification) {
        try {
          if (question.target_audience === 'all') {
            const users = await UserService.getAllUsers();
            const userIds = users.map(u => u.id);
            notifyTargetedQuestionToUsers(userIds, question.text, question.id).catch((err) => 
              logger.error('Error sending targeted question notification', err instanceof Error ? err : new Error(String(err)))
            );
          } else if (question.target_audience === 'by_type' && question.target_values) {
            const users = await UserService.getAllUsers();
            const targetUsers = users.filter(u => question.target_values.includes(u.user_type));
            const userIds = targetUsers.map(u => u.id);
            notifyTargetedQuestionToUsers(userIds, question.text, question.id).catch((err) => 
              logger.error('Error sending targeted question notification', err instanceof Error ? err : new Error(String(err)))
            );
          } else if (question.target_audience === 'individual' && question.target_values) {
            notifyTargetedQuestionToUsers(question.target_values, question.text, question.id).catch((err) => 
              logger.error('Error sending targeted question notification', err instanceof Error ? err : new Error(String(err)))
            );
          }
        } catch (notifError) {
          logger.error('Error sending notifications', notifError instanceof Error ? notifError : new Error(String(notifError)));
        }
      }
      
      return res.json({ success: true, question });
    } catch (error) {
      logger.error('Update targeted question error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при обновлении вопроса' });
    }
  }

  /**
   * Удаление вопроса (Админ)
   */
  static async deleteQuestion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await TargetedQuestionService.deleteQuestion(id);
      return res.json({ success: true, message: 'Вопрос удален' });
    } catch (error) {
      logger.error('Delete targeted question error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при удалении вопроса' });
    }
  }
}
