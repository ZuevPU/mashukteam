import { Request, Response } from 'express';
import { ExportService } from '../services/exportService';

export class ExportController {
  /**
   * Экспорт всех ответов в Excel
   */
  static async exportAnswers(req: Request, res: Response) {
    try {
      const excelBuffer = await ExportService.exportAnswersToExcel();
      
      // Устанавливаем заголовки для скачивания файла
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=answers_export.xlsx');
      res.setHeader('Content-Length', excelBuffer.length);
      
      return res.send(excelBuffer);
    } catch (error) {
      console.error('Export answers error:', error);
      return res.status(500).json({ error: 'Ошибка при экспорте данных' });
    }
  }
}
