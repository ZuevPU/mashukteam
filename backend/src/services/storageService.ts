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

    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    logger.info('File uploaded successfully', { 
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
}
