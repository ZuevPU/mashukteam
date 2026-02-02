import { Request, Response } from 'express';
import { AssignmentService } from '../services/assignmentService';
import { UserService } from '../services/supabase';
import { notifyAssignmentResult, notifyNewAssignment } from '../utils/telegramBot';

export class AssignmentController {
  // === User Types ===
  
  static async getUserTypes(req: Request, res: Response) {
    try {
      const types = await AssignmentService.getAllUserTypes();
      return res.json({ success: true, types });
    } catch (error) {
      console.error('Get user types error:', error);
      return res.status(500).json({ error: 'Ошибка при получении типов' });
    }
  }

  // === Admin: Assignments CRUD ===

  static async createAssignment(req: Request, res: Response) {
    try {
      const { initData, sendNotification, ...data } = req.body;
      const assignment = await AssignmentService.createAssignment(data);
      
      // Отправка уведомлений, если задание опубликовано и запрошено
      if (sendNotification && assignment.status === 'published') {
        notifyNewAssignment(assignment.title, assignment.reward).catch(console.error);
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
      const { initData, ...data } = req.body;
      const assignment = await AssignmentService.updateAssignment(id, data);
      return res.json({ success: true, assignment });
    } catch (error) {
      console.error('Update assignment error:', error);
      return res.status(500).json({ error: 'Ошибка при обновлении задания' });
    }
  }

  static async deleteAssignment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await AssignmentService.deleteAssignment(id);
      return res.json({ success: true, message: 'Задание удалено' });
    } catch (error) {
      console.error('Delete assignment error:', error);
      return res.status(500).json({ error: 'Ошибка при удалении задания' });
    }
  }

  static async getAllAssignments(req: Request, res: Response) {
    try {
      const assignments = await AssignmentService.getAllAssignments();
      return res.json({ success: true, assignments });
    } catch (error) {
      console.error('Get all assignments error:', error);
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
      console.error('Get all submissions error:', error);
      return res.status(500).json({ error: 'Ошибка при получении ответов' });
    }
  }

  static async moderateSubmission(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { initData, ...data } = req.body;
      
      // Получаем данные submission до модерации для уведомления
      const submissionsBefore = await AssignmentService.getSubmissionsForAssignment('');
      // Получаем конкретный submission с user и assignment
      const { data: subData } = await require('../services/supabase').supabase
        .from('assignment_submissions')
        .select('*, user:users(telegram_id), assignment:assignments(title, reward)')
        .eq('id', id)
        .single();
      
      const submission = await AssignmentService.moderateSubmission(id, data);
      
      // Начисление баллов рефлексии при одобрении задания
      if (data.status === 'approved' && subData?.user?.id) {
        try {
          await ReflectionService.addReflectionPoints(subData.user.id, 'assignment_completed');
        } catch (reflectionError) {
          console.error('Error adding reflection points:', reflectionError);
          // Не прерываем выполнение, если ошибка начисления рефлексии
        }
      }
      
      // Отправляем уведомление пользователю
      if (subData?.user?.telegram_id && subData?.assignment) {
        notifyAssignmentResult(
          subData.user.telegram_id,
          subData.assignment.title,
          data.status === 'approved',
          subData.assignment.reward || 0,
          data.admin_comment
        ).catch(console.error);
      }
      
      return res.json({ success: true, submission });
    } catch (error) {
      console.error('Moderate submission error:', error);
      return res.status(500).json({ error: 'Ошибка при модерации ответа' });
    }
  }

  static async getLeaderboard(req: Request, res: Response) {
    try {
      const leaderboard = await AssignmentService.getLeaderboard();
      return res.json({ success: true, leaderboard });
    } catch (error) {
      console.error('Get leaderboard error:', error);
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

      const assignments = await AssignmentService.getAssignmentsForUser(user.id, user.user_type);
      return res.json({ success: true, assignments });
    } catch (error) {
      console.error('Get my assignments error:', error);
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
      console.error('Submit assignment error:', error);
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
      console.error('Get my submissions error:', error);
      return res.status(500).json({ error: 'Ошибка при получении моих ответов' });
    }
  }
}
