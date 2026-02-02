import { Request, Response } from 'express';
import { ExportService } from '../services/exportService';
import { logger } from '../utils/logger';

export class ExportController {
  /**
   * Экспорт всех ответов в Excel
   */
  static async exportAnswers(req: Request, res: Response) {
    try {
      logger.info('Starting export answers');
      const excelBuffer = await ExportService.exportAnswersToExcel();
      
      // Устанавливаем заголовки для скачивания файла
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=answers_export.xlsx');
      res.setHeader('Content-Length', excelBuffer.length);
      
      logger.info('Export answers completed successfully', { size: excelBuffer.length });
      return res.send(excelBuffer);
    } catch (error: any) {
      logger.error('Export answers error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ 
        error: 'Ошибка при экспорте данных',
        message: error.message || 'Неизвестная ошибка'
      });
    }
  }

  /**
   * Экспорт мероприятий
   */
  static async exportEvents(req: Request, res: Response) {
    try {
      logger.info('Starting export events');
      const excelBuffer = await ExportService.exportEvents();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=events_export.xlsx');
      res.setHeader('Content-Length', excelBuffer.length);
      
      logger.info('Export events completed successfully', { size: excelBuffer.length });
      return res.send(excelBuffer);
    } catch (error: any) {
      logger.error('Export events error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ 
        error: 'Ошибка при экспорте мероприятий',
        message: error.message || 'Неизвестная ошибка'
      });
    }
  }

  /**
   * Экспорт диагностик с результатами
   */
  static async exportDiagnostics(req: Request, res: Response) {
    try {
      logger.info('Starting export diagnostics');
      const excelBuffer = await ExportService.exportDiagnosticsWithResults();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=diagnostics_export.xlsx');
      res.setHeader('Content-Length', excelBuffer.length);
      
      logger.info('Export diagnostics completed successfully', { size: excelBuffer.length });
      return res.send(excelBuffer);
    } catch (error: any) {
      logger.error('Export diagnostics error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ 
        error: 'Ошибка при экспорте диагностик',
        message: error.message || 'Неизвестная ошибка'
      });
    }
  }

  /**
   * Экспорт заданий с результатами
   */
  static async exportAssignments(req: Request, res: Response) {
    try {
      logger.info('Starting export assignments');
      const excelBuffer = await ExportService.exportAssignmentsWithResults();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=assignments_export.xlsx');
      res.setHeader('Content-Length', excelBuffer.length);
      
      logger.info('Export assignments completed successfully', { size: excelBuffer.length });
      return res.send(excelBuffer);
    } catch (error: any) {
      logger.error('Export assignments error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ 
        error: 'Ошибка при экспорте заданий',
        message: error.message || 'Неизвестная ошибка'
      });
    }
  }

  /**
   * Экспорт вопросов с ответами
   */
  static async exportQuestions(req: Request, res: Response) {
    try {
      logger.info('Starting export questions');
      const excelBuffer = await ExportService.exportQuestionsWithAnswers();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=questions_export.xlsx');
      res.setHeader('Content-Length', excelBuffer.length);
      
      logger.info('Export questions completed successfully', { size: excelBuffer.length });
      return res.send(excelBuffer);
    } catch (error: any) {
      logger.error('Export questions error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ 
        error: 'Ошибка при экспорте вопросов',
        message: error.message || 'Неизвестная ошибка'
      });
    }
  }

  /**
   * Экспорт пользователей с полной информацией
   */
  static async exportUsers(req: Request, res: Response) {
    try {
      console.log('[ExportController] Starting export users...');
      const excelBuffer = await ExportService.exportUsersFull();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=users_export.xlsx');
      res.setHeader('Content-Length', excelBuffer.length);
      
      console.log('[ExportController] Export users completed successfully');
      return res.send(excelBuffer);
    } catch (error: any) {
      console.error('[ExportController] Export users error:', error);
      return res.status(500).json({ 
        error: 'Ошибка при экспорте пользователей',
        message: error.message || 'Неизвестная ошибка'
      });
    }
  }

  /**
   * Полный экспорт всех таблиц
   */
  static async exportAll(req: Request, res: Response) {
    try {
      logger.info('Starting export all tables');
      const excelBuffer = await ExportService.exportAllTables();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=full_export.xlsx');
      res.setHeader('Content-Length', excelBuffer.length);
      
      logger.info('Export all tables completed successfully', { size: excelBuffer.length });
      return res.send(excelBuffer);
    } catch (error: any) {
      logger.error('Export all tables error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ 
        error: 'Ошибка при полном экспорте данных',
        message: error.message || 'Неизвестная ошибка'
      });
    }
  }
}
