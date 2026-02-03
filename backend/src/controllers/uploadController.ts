import { Request, Response } from 'express';
import { StorageService } from '../services/storageService';
import { logger } from '../utils/logger';

export class UploadController {
  /**
   * Загрузка файла для задания
   * Ожидает multipart/form-data с полем 'file' и 'assignmentId'
   */
  static async uploadTaskFile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Не авторизован' });
      }

      // Проверяем наличие файла (добавлен multer middleware)
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ error: 'Файл не загружен' });
      }

      const { assignmentId } = req.body;
      if (!assignmentId) {
        return res.status(400).json({ error: 'Не указан ID задания' });
      }
      
      // Загружаем файл в Storage
      const result = await StorageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        user.id,
        assignmentId
      );

      return res.json({
        success: true,
        file_url: result.url,
        path: result.path,
      });
    } catch (error: any) {
      logger.error('Upload error', error);
      return res.status(500).json({ error: error.message || 'Ошибка загрузки файла' });
    }
  }

  /**
   * Получение подписанного URL для приватного файла
   */
  static async getSignedUrl(req: Request, res: Response) {
    try {
      const { path } = req.body;
      if (!path) {
        return res.status(400).json({ error: 'Не указан путь к файлу' });
      }

      const signedUrl = await StorageService.getSignedUrl(path);

      return res.json({
        success: true,
        signed_url: signedUrl,
      });
    } catch (error: any) {
      logger.error('Get signed URL error', error);
      return res.status(500).json({ error: error.message || 'Ошибка получения URL' });
    }
  }
}
