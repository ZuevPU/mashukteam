import { supabase } from './supabase';
import { logger } from '../utils/logger';

const BUCKET_NAME = 'task_submissions';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class StorageService {
  /**
   * Генерирует уникальное имя файла
   */
  static generateFileName(userId: string, assignmentId: string, originalName: string): string {
    const extension = originalName.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${userId}/${assignmentId}/${timestamp}_${random}.${extension}`;
  }

  /**
   * Проверяет, является ли файл изображением
   */
  static isValidImageType(mimeType: string): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return allowedTypes.includes(mimeType);
  }

  /**
   * Загружает файл в Supabase Storage
   */
  static async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    userId: string,
    assignmentId: string
  ): Promise<{ url: string; path: string }> {
    // Проверка размера
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error('Файл слишком большой. Максимальный размер: 10MB');
    }

    // Проверка типа
    if (!this.isValidImageType(mimeType)) {
      throw new Error('Неподдерживаемый тип файла. Разрешены: JPEG, PNG, GIF, WebP');
    }

    // Генерируем путь к файлу
    const filePath = this.generateFileName(userId, assignmentId, fileName);

    // Загружаем в Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      logger.error('Error uploading file to storage', error);
      throw new Error('Ошибка загрузки файла');
    }

    // Создаем подписанный URL с длительным сроком действия (7 дней)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 дней

    if (signedUrlError) {
      logger.error('Error creating signed URL after upload', signedUrlError);
      // Fallback на публичный URL (на случай если бакет публичный)
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      
      logger.info('File uploaded successfully (public URL)', { 
        path: filePath, 
        size: fileBuffer.length,
        userId,
        assignmentId 
      });

      return {
        url: urlData.publicUrl,
        path: filePath,
      };
    }

    logger.info('File uploaded successfully (signed URL)', { 
      path: filePath, 
      size: fileBuffer.length,
      userId,
      assignmentId 
    });

    return {
      url: signedUrlData.signedUrl,
      path: filePath,
    };
  }

  /**
   * Удаляет файл из Storage
   */
  static async deleteFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      logger.error('Error deleting file from storage', error);
      throw new Error('Ошибка удаления файла');
    }

    logger.info('File deleted successfully', { path: filePath });
  }

  /**
   * Создает подписанный URL для приватного доступа
   */
  static async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      logger.error('Error creating signed URL', error);
      throw new Error('Ошибка получения доступа к файлу');
    }

    return data.signedUrl;
  }

  /**
   * Обновляет подписанный URL для file_url (извлекает path и создает новый подписанный URL)
   */
  static async refreshSignedUrl(fileUrl: string, expiresIn: number = 3600): Promise<string> {
    try {
      // Извлекаем путь из URL
      // URL может быть в формате: 
      // 1. Signed URL: https://xxx.supabase.co/storage/v1/object/sign/task_submissions/path?token=xxx
      // 2. Public URL: https://xxx.supabase.co/storage/v1/object/public/task_submissions/path
      
      let filePath: string | null = null;
      
      // Пробуем извлечь путь из signed URL
      const signedMatch = fileUrl.match(/\/task_submissions\/([^?]+)/);
      if (signedMatch) {
        filePath = signedMatch[1];
      }
      
      // Пробуем извлечь из public URL
      if (!filePath) {
        const publicMatch = fileUrl.match(/\/public\/task_submissions\/(.+)$/);
        if (publicMatch) {
          filePath = publicMatch[1];
        }
      }

      if (!filePath) {
        logger.warn('Could not extract file path from URL', { fileUrl });
        return fileUrl; // Возвращаем оригинальный URL
      }

      // Создаем новый подписанный URL
      const newSignedUrl = await this.getSignedUrl(filePath, expiresIn);
      return newSignedUrl;
    } catch (error) {
      logger.error('Error refreshing signed URL', error instanceof Error ? error : new Error(String(error)));
      return fileUrl; // Возвращаем оригинальный URL в случае ошибки
    }
  }

  /**
   * Обновляет подписанные URL для массива submissions
   */
  static async refreshSubmissionUrls(submissions: any[]): Promise<any[]> {
    const refreshedSubmissions = await Promise.all(
      submissions.map(async (sub) => {
        if (sub.file_url) {
          try {
            const refreshedUrl = await this.refreshSignedUrl(sub.file_url, 60 * 60 * 24); // 24 часа
            return { ...sub, file_url: refreshedUrl };
          } catch (error) {
            logger.error('Error refreshing URL for submission', error instanceof Error ? error : new Error(String(error)));
            return sub;
          }
        }
        return sub;
      })
    );
    return refreshedSubmissions;
  }
}
