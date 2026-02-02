import { Request, Response } from 'express';
import { AssignmentService } from '../services/assignmentService';
import { UserService } from '../services/supabase';
import { AchievementService } from '../services/gamification';
import { notifyAssignmentResult, notifyNewAssignment } from '../utils/telegramBot';
import { logger } from '../utils/logger';

export class AssignmentController {
  // === User Types ===
  
  static async getDirections(req: Request, res: Response) {
    try {
      const directions = await AssignmentService.getAllDirections();
      return res.json({ success: true, directions });
    } catch (error) {
      logger.error('Get directions error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении направлений' });
    }
  }

  // === Admin: Assignments CRUD ===

  static async createAssignment(req: Request, res: Response) {
    try {
      const { initData, sendNotification, ...data } = req.body;
      const assignment = await AssignmentService.createAssignment(data);
      
      // Отправка уведомлений, если задание опубликовано и запрошено
      if (sendNotification && assignment.status === 'published') {
        notifyNewAssignment(assignment.title, assignment.reward, assignment.id).catch((err) => 
          logger.error('Error sending assignment notification', err instanceof Error ? err : new Error(String(err)))
        );
      }
      
      return res.status(201).json({ success: true, assignment });
    } catch (error) {
      console.error('Create assignment error:', error);
      return res.status(500).json({ error: 'Ошибка при создании задания' });
    }
  }

  static async updateAssignment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { initData, sendNotification, ...data } = req.body;
      
      // Получаем текущее состояние задания для проверки изменения статуса
      const currentAssignment = await AssignmentService.getAssignmentById(id);
      const wasPublished = currentAssignment?.status === 'published';
      
      const assignment = await AssignmentService.updateAssignment(id, data);
      
      // Отправка уведомления, если статус изменился на published
      if (data.status === 'published' && !wasPublished && sendNotification) {
        notifyNewAssignment(assignment.title, assignment.reward, assignment.id).catch((err) => 
          logger.error('Error sending assignment notification', err instanceof Error ? err : new Error(String(err)))
        );
      }
      
      return res.json({ success: true, assignment });
    } catch (error) {
      logger.error('Update assignment error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при обновлении задания' });
    }
  }

  static async deleteAssignment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await AssignmentService.deleteAssignment(id);
      return res.json({ success: true, message: 'Задание удалено' });
    } catch (error) {
      logger.error('Delete assignment error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при удалении задания' });
    }
  }

  static async getAllAssignments(req: Request, res: Response) {
    try {
      const assignments = await AssignmentService.getAllAssignments();
      return res.json({ success: true, assignments });
    } catch (error) {
      logger.error('Get all assignments error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении заданий' });
    }
  }

  // === Admin: Submissions & Moderation ===

  static async getSubmissionsForAssignment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const submissions = await AssignmentService.getSubmissionsForAssignment(id);
      return res.json({ success: true, submissions });
    } catch (error) {
      console.error('Get submissions error:', error);
      return res.status(500).json({ error: 'Ошибка при получении ответов' });
    }
  }

  static async getAllSubmissions(req: Request, res: Response) {
    try {
      const submissions = await AssignmentService.getAllSubmissions();
      return res.json({ success: true, submissions });
    } catch (error) {
      logger.error('Get all submissions error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении ответов' });
    }
  }

  static async moderateSubmission(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { initData, ...data } = req.body;
      
      // Получаем данные submission ДО модерации, чтобы проверить предыдущий статус
      const { data: subDataBefore, error: fetchError } = await require('../services/supabase').supabase
        .from('assignment_submissions')
        .select('*, user:users(id, telegram_id), assignment:assignments(title, reward)')
        .eq('id', id)
        .single();
      
      if (fetchError || !subDataBefore) {
        return res.status(404).json({ error: 'Submission не найдена' });
      }
      
      const previousStatus = subDataBefore.status;
      const userId = subDataBefore.user?.id;
      
      // Выполняем модерацию
      const submission = await AssignmentService.moderateSubmission(id, data);
      
      // Примечание: баллы рефлексии больше не начисляются за задания
      // Задания влияют только на общие баллы (total_points) и звездочки (stars_count)
      
      // Отправляем уведомление пользователю
      if (subDataBefore.user?.telegram_id && subDataBefore.assignment && submission.user_id) {
        notifyAssignmentResult(
          submission.user_id,
          subDataBefore.user.telegram_id,
          subDataBefore.assignment.title,
          data.status === 'approved',
          subDataBefore.assignment.reward || 0,
          data.admin_comment
        ).catch((err) => logger.error('Error sending assignment result notification', err instanceof Error ? err : new Error(String(err))));
      }
      
      return res.json({ success: true, submission });
    } catch (error) {
      logger.error('Moderate submission error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при модерации ответа' });
    }
  }

  static async getLeaderboard(req: Request, res: Response) {
    try {
      const leaderboard = await AssignmentService.getLeaderboard();
      return res.json({ success: true, leaderboard });
    } catch (error) {
      logger.error('Get leaderboard error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении рейтинга' });
    }
  }

  // === User: Assignments ===

  static async getMyAssignments(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Не авторизован' });
      }

      const assignments = await AssignmentService.getAssignmentsForUser(user.id, user.direction);
      return res.json({ success: true, assignments });
    } catch (error) {
      logger.error('Get my assignments error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении заданий' });
    }
  }

  static async submitAssignment(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Не авторизован' });
      }

      const { id } = req.params;
      const { initData, ...data } = req.body;
      
      const submission = await AssignmentService.submitAssignment(user.id, id, data);
      
      // Начисление баллов рефлексии за выполнение задания
      // Баллы начисляются при одобрении задания, поэтому здесь не начисляем
      
      return res.status(201).json({ success: true, submission });
    } catch (error: any) {
      logger.error('Submit assignment error', error instanceof Error ? error : new Error(String(error)));
      return res.status(400).json({ error: error.message || 'Ошибка при отправке ответа' });
    }
  }

  static async getMySubmissions(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Не авторизован' });
      }

      const submissions = await AssignmentService.getUserSubmissions(user.id);
      return res.json({ success: true, submissions });
    } catch (error) {
      logger.error('Get my submissions error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении моих ответов' });
    }
  }

  /**
   * Пересчёт звёзд для всех пользователей (админ) — для исправления данных после миграции
   */
  static async recalculateAllStars(req: Request, res: Response) {
    try {
      const users = await UserService.getAllUsers();
      let updated = 0;
      for (const u of users) {
        await AssignmentService.recalculateUserStars(u.id);
        updated++;
      }
      return res.json({ success: true, message: `Пересчитаны звёзды для ${updated} пользователей` });
    } catch (error) {
      logger.error('Recalculate all stars error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка пересчёта звёзд' });
    }
  }
}
