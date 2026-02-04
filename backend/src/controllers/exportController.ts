import { Request, Response } from 'express';
import { ExportService } from '../services/exportService';
import { logger } from '../utils/logger';
import { ExportFilters } from '../types';
import { sendDocumentToUser } from '../utils/telegramBot';

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
      logger.info('Starting export users');
      
      // Получаем фильтры из body запроса
      const filters: ExportFilters = {
        dateFrom: req.body.dateFrom,
        dateTo: req.body.dateTo,
        direction: req.body.direction,
        eventId: req.body.eventId,
      };
      
      // Удаляем undefined значения
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof ExportFilters] === undefined) {
          delete filters[key as keyof ExportFilters];
        }
      });
      
      const excelBuffer = await ExportService.exportUsersFull(Object.keys(filters).length > 0 ? filters : undefined);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=users_export.xlsx');
      res.setHeader('Content-Length', excelBuffer.length);
      
      logger.info('Export users completed successfully', { size: excelBuffer.length, filters });
      return res.send(excelBuffer);
    } catch (error: any) {
      logger.error('Export users error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ 
        error: 'Ошибка при экспорте пользователей',
        message: error.message || 'Неизвестная ошибка'
      });
    }
  }

  /**
   * Полный экспорт всех таблиц (сырые данные)
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

  /**
   * Полный экспорт приложения с человекочитаемыми данными
   */
  static async exportFullApplication(req: Request, res: Response) {
    try {
      logger.info('Starting full application export');
      const excelBuffer = await ExportService.exportFullApplication();
      
      const filename = `mashuk_full_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Length', excelBuffer.length);
      
      logger.info('Full application export completed successfully', { size: excelBuffer.length });
      return res.send(excelBuffer);
    } catch (error: any) {
      logger.error('Full application export error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ 
        error: 'Ошибка при полном экспорте приложения',
        message: error.message || 'Неизвестная ошибка'
      });
    }
  }

  /**
   * Отправка экспорта в Telegram администратору
   */
  static async sendExportToTelegram(req: Request, res: Response) {
    try {
      const { exportType } = req.body;
      const user = (req as any).user;
      
      if (!user || !user.telegram_id) {
        return res.status(401).json({ error: 'Не удалось получить данные пользователя' });
      }
      
      logger.info('Starting export to Telegram', { exportType, userId: user.id, telegramId: user.telegram_id });
      
      // Получаем фильтры из body запроса
      const filters: ExportFilters = {
        dateFrom: req.body.dateFrom,
        dateTo: req.body.dateTo,
        direction: req.body.direction,
        eventId: req.body.eventId,
      };
      
      // Удаляем undefined значения
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof ExportFilters] === undefined) {
          delete filters[key as keyof ExportFilters];
        }
      });
      
      let excelBuffer: Buffer;
      let filename: string;
      let label: string;
      
      // Генерируем Excel в зависимости от типа экспорта
      switch (exportType) {
        case 'full':
          excelBuffer = await ExportService.exportFullApplication();
          filename = `mashuk_full_export_${new Date().toISOString().split('T')[0]}.xlsx`;
          label = 'Полный экспорт';
          break;
        case 'users':
          excelBuffer = await ExportService.exportUsersFull(Object.keys(filters).length > 0 ? filters : undefined);
          filename = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;
          label = 'Пользователи';
          break;
        case 'answers':
          excelBuffer = await ExportService.exportAnswersToExcel();
          filename = `answers_export_${new Date().toISOString().split('T')[0]}.xlsx`;
          label = 'Ответы';
          break;
        case 'events':
          excelBuffer = await ExportService.exportEvents();
          filename = `events_export_${new Date().toISOString().split('T')[0]}.xlsx`;
          label = 'Программы';
          break;
        case 'diagnostics':
          excelBuffer = await ExportService.exportDiagnosticsWithResults();
          filename = `diagnostics_export_${new Date().toISOString().split('T')[0]}.xlsx`;
          label = 'Диагностики';
          break;
        case 'assignments':
          excelBuffer = await ExportService.exportAssignmentsWithResults();
          filename = `assignments_export_${new Date().toISOString().split('T')[0]}.xlsx`;
          label = 'Задания';
          break;
        case 'questions':
          excelBuffer = await ExportService.exportQuestionsWithAnswers();
          filename = `questions_export_${new Date().toISOString().split('T')[0]}.xlsx`;
          label = 'Вопросы';
          break;
        case 'all':
          excelBuffer = await ExportService.exportAllTables();
          filename = `raw_tables_export_${new Date().toISOString().split('T')[0]}.xlsx`;
          label = 'Сырые таблицы БД';
          break;
        default:
          return res.status(400).json({ error: 'Неизвестный тип экспорта' });
      }
      
      // Отправляем документ в Telegram
      const caption = `📊 <b>Экспорт: ${label}</b>\n\nДата: ${new Date().toLocaleDateString('ru-RU')}`;
      const success = await sendDocumentToUser(user.telegram_id, excelBuffer, filename, caption);
      
      if (success) {
        logger.info('Export sent to Telegram successfully', { exportType, filename, telegramId: user.telegram_id });
        return res.json({ success: true, message: 'Отчёт отправлен в Telegram' });
      } else {
        logger.error('Failed to send export to Telegram', new Error(`Failed for user ${user.telegram_id}`));
        return res.status(500).json({ error: 'Не удалось отправить файл в Telegram' });
      }
    } catch (error: any) {
      logger.error('Send export to Telegram error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ 
        error: 'Ошибка при отправке экспорта в Telegram',
        message: error.message || 'Неизвестная ошибка'
      });
    }
  }
}
