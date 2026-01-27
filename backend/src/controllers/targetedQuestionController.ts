import { Request, Response } from 'express';
import { TargetedQuestionService } from '../services/targetedQuestionService';

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
      const { initData, ...data } = req.body;
      const question = await TargetedQuestionService.createQuestion(data);
      return res.status(201).json({ success: true, question });
    } catch (error) {
      console.error('Create targeted question error:', error);
      return res.status(500).json({ error: 'Ошибка при создании вопроса' });
    }
  }
}
