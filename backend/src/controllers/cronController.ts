import { Request, Response } from 'express';
import { SchedulerService } from '../services/schedulerService';
import { logger } from '../utils/logger';

const CRON_SECRET = process.env.CRON_SECRET;

export class CronController {
  /**
   * Endpoint для Vercel Cron Jobs
   * Обрабатывает запланированный контент (задания, вопросы, рассылки)
   */
  static async processScheduledContent(req: Request, res: Response) {
    try {
      // Проверяем секретный ключ для защиты от несанкционированного доступа
      const authHeader = req.headers.authorization;
      
      if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        logger.warn('Unauthorized cron request', { 
          ip: req.ip, 
          userAgent: req.headers['user-agent'] 
        });
        return res.status(401).json({ error: 'Unauthorized' });
      }

      logger.info('Cron job started: processScheduledContent');

      const results = await SchedulerService.processScheduledContent();

      logger.info('Cron job completed', results);

      return res.json({ 
        success: true, 
        processed: results,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Cron job error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Health check endpoint для мониторинга
   */
  static async healthCheck(req: Request, res: Response) {
    return res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    });
  }
}
