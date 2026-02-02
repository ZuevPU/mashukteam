import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { logger } from '../utils/logger';

export class AnalyticsController {
  /**
   * POST /api/admin/analytics/user-activity
   * Статистика активности пользователей
   */
  static async getUserActivity(req: Request, res: Response) {
    try {
      const { dateFrom, dateTo } = req.body;

      const stats = await AnalyticsService.getUserActivityStats(dateFrom, dateTo);

      return res.json({
        success: true,
        stats,
      });
    } catch (error: any) {
      logger.error('Get user activity stats error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении статистики активности',
        message: error.message || 'Неизвестная ошибка',
      });
    }
  }

  /**
   * POST /api/admin/analytics/directions
   * Статистика по направлениям
   */
  static async getDirectionStats(req: Request, res: Response) {
    try {
      const stats = await AnalyticsService.getDirectionStats();

      return res.json({
        success: true,
        stats,
      });
    } catch (error: any) {
      logger.error('Get direction stats error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении статистики по направлениям',
        message: error.message || 'Неизвестная ошибка',
      });
    }
  }

  /**
   * POST /api/admin/analytics/events
   * Статистика по мероприятиям
   */
  static async getEventStats(req: Request, res: Response) {
    try {
      const { eventId } = req.body;

      const stats = await AnalyticsService.getEventParticipationStats(eventId);

      return res.json({
        success: true,
        stats,
      });
    } catch (error: any) {
      logger.error('Get event stats error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении статистики по мероприятиям',
        message: error.message || 'Неизвестная ошибка',
      });
    }
  }

  /**
   * POST /api/admin/analytics/questions
   * Статистика по вопросам
   */
  static async getQuestionStats(req: Request, res: Response) {
    try {
      const { questionId } = req.body;

      const stats = await AnalyticsService.getQuestionAnswerStats(questionId);

      return res.json({
        success: true,
        stats,
      });
    } catch (error: any) {
      logger.error('Get question stats error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: 'Ошибка при получении статистики по вопросам',
        message: error.message || 'Неизвестная ошибка',
      });
    }
  }
}
