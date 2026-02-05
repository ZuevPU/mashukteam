import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { logger } from '../utils/logger';

// Типы задач
export interface NotificationJob {
  type: 'notification';
  userId: string;
  telegramId: number;
  message: string;
  deepLink?: string;
  notificationType?: string;
  notificationTitle?: string;
}

export interface BroadcastJob {
  type: 'broadcast';
  broadcastId: string;
  userIds: string[];
  message: string;
  imageUrl?: string;
}

export interface ExportJob {
  type: 'export';
  exportType: 'users' | 'events' | 'assignments' | 'questions' | 'all';
  requestedBy: string;
  telegramId: number;
}

export type QueueJob = NotificationJob | BroadcastJob | ExportJob;

// Конфигурация Redis подключения
const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }
  
  // Парсинг Redis URL
  try {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      username: url.username || undefined,
    };
  } catch {
    logger.error('Invalid REDIS_URL format');
    return null;
  }
};

class QueueService {
  private notificationQueue: Queue | null = null;
  private broadcastQueue: Queue | null = null;
  private exportQueue: Queue | null = null;
  private workers: Worker[] = [];
  private isInitialized: boolean = false;

  /**
   * Инициализация очередей
   */
  async initialize(): Promise<void> {
    const connection = getRedisConnection();
    
    if (!connection) {
      logger.warn('Redis не настроен, очереди задач отключены');
      return;
    }

    try {
      // Очередь уведомлений
      this.notificationQueue = new Queue('notifications', {
        connection,
        defaultJobOptions: {
          removeOnComplete: 100, // Хранить последние 100 выполненных
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      });

      // Очередь рассылок
      this.broadcastQueue = new Queue('broadcasts', {
        connection,
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 20,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      // Очередь экспорта
      this.exportQueue = new Queue('exports', {
        connection,
        defaultJobOptions: {
          removeOnComplete: 20,
          removeOnFail: 10,
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 5000,
          },
        },
      });

      this.isInitialized = true;
      logger.info('Очереди задач инициализированы');
    } catch (error) {
      logger.error('Ошибка инициализации очередей', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Запуск воркеров для обработки задач
   */
  async startWorkers(): Promise<void> {
    const connection = getRedisConnection();
    
    if (!connection || !this.isInitialized) {
      return;
    }

    try {
      // Воркер уведомлений
      const notificationWorker = new Worker(
        'notifications',
        async (job: Job<NotificationJob>) => {
          await this.processNotificationJob(job);
        },
        {
          connection,
          concurrency: 5, // Обработка 5 уведомлений одновременно
          limiter: {
            max: 25, // Максимум 25 задач
            duration: 1000, // За 1 секунду (соблюдение rate limit Telegram)
          },
        }
      );

      // Воркер рассылок
      const broadcastWorker = new Worker(
        'broadcasts',
        async (job: Job<BroadcastJob>) => {
          await this.processBroadcastJob(job);
        },
        {
          connection,
          concurrency: 1, // Рассылки обрабатываем последовательно
        }
      );

      // Воркер экспорта
      const exportWorker = new Worker(
        'exports',
        async (job: Job<ExportJob>) => {
          await this.processExportJob(job);
        },
        {
          connection,
          concurrency: 2, // До 2 экспортов одновременно
        }
      );

      // Обработчики событий для всех воркеров
      [notificationWorker, broadcastWorker, exportWorker].forEach((worker, index) => {
        const queueName = ['notifications', 'broadcasts', 'exports'][index];
        
        worker.on('completed', (job) => {
          logger.debug(`Задача ${queueName}:${job.id} выполнена`);
        });

        worker.on('failed', (job, err) => {
          logger.error(`Задача ${queueName}:${job?.id} failed`, err instanceof Error ? err : new Error(String(err)));
        });

        worker.on('error', (err) => {
          logger.error(`Ошибка воркера ${queueName}`, err instanceof Error ? err : new Error(String(err)));
        });
      });

      this.workers = [notificationWorker, broadcastWorker, exportWorker];
      logger.info('Воркеры очередей запущены');
    } catch (error) {
      logger.error('Ошибка запуска воркеров', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Обработка задачи уведомления
   */
  private async processNotificationJob(job: Job<NotificationJob>): Promise<void> {
    const { sendMessageToUser } = await import('../utils/telegramBot');
    const { userId, telegramId, message, deepLink, notificationType, notificationTitle } = job.data;
    
    await sendMessageToUser(
      telegramId,
      message,
      true,
      deepLink,
      userId,
      notificationType as any,
      notificationTitle
    );
  }

  /**
   * Обработка задачи рассылки
   */
  private async processBroadcastJob(job: Job<BroadcastJob>): Promise<void> {
    const { sendBroadcastToUsers } = await import('../utils/telegramBot');
    const { UserService } = await import('./supabase');
    const { BroadcastService } = await import('./broadcastService');
    
    const { broadcastId, userIds, message, imageUrl } = job.data;
    
    // Получаем пользователей
    const allUsers = await UserService.getAllUsers();
    const targetUsers = allUsers.filter(u => userIds.includes(u.id));
    
    // Отправляем рассылку
    const result = await sendBroadcastToUsers(targetUsers, message, imageUrl);
    
    // Обновляем статус рассылки
    await BroadcastService.markAsSent(broadcastId, result.success, result.failed);
    
    logger.info('Broadcast job completed', { broadcastId, success: result.success, failed: result.failed });
  }

  /**
   * Обработка задачи экспорта
   */
  private async processExportJob(job: Job<ExportJob>): Promise<void> {
    const { ExportService } = await import('./exportService');
    const { sendDocumentToUser } = await import('../utils/telegramBot');
    
    const { exportType, telegramId } = job.data;
    
    let buffer: Buffer;
    let filename: string;
    
    switch (exportType) {
      case 'users':
        buffer = await ExportService.exportUsersFull();
        filename = `users_export_${Date.now()}.xlsx`;
        break;
      case 'events':
        buffer = await ExportService.exportEvents();
        filename = `events_export_${Date.now()}.xlsx`;
        break;
      case 'assignments':
        buffer = await ExportService.exportAssignmentsWithResults();
        filename = `assignments_export_${Date.now()}.xlsx`;
        break;
      case 'questions':
        buffer = await ExportService.exportQuestionsWithAnswers();
        filename = `questions_export_${Date.now()}.xlsx`;
        break;
      case 'all':
        buffer = await ExportService.exportFullApplication();
        filename = `full_export_${Date.now()}.xlsx`;
        break;
      default:
        throw new Error(`Unknown export type: ${exportType}`);
    }
    
    // Отправляем файл в Telegram
    await sendDocumentToUser(telegramId, buffer, filename, `📊 Экспорт данных: ${exportType}`);
    
    logger.info('Export job completed', { exportType, telegramId });
  }

  /**
   * Добавление задачи уведомления
   */
  async addNotificationJob(data: Omit<NotificationJob, 'type'>): Promise<string | null> {
    if (!this.notificationQueue) {
      logger.warn('Notification queue not available, sending directly');
      // Fallback: отправляем напрямую
      const { sendMessageToUser } = await import('../utils/telegramBot');
      sendMessageToUser(
        data.telegramId,
        data.message,
        true,
        data.deepLink,
        data.userId,
        data.notificationType as any,
        data.notificationTitle
      ).catch(err => logger.error('Direct notification failed', err instanceof Error ? err : new Error(String(err))));
      return null;
    }

    const job = await this.notificationQueue.add('send', { type: 'notification', ...data });
    return job.id || null;
  }

  /**
   * Добавление задачи массовой рассылки
   */
  async addBroadcastJob(data: Omit<BroadcastJob, 'type'>): Promise<string | null> {
    if (!this.broadcastQueue) {
      logger.warn('Broadcast queue not available');
      return null;
    }

    const job = await this.broadcastQueue.add('send', { type: 'broadcast', ...data });
    return job.id || null;
  }

  /**
   * Добавление задачи экспорта
   */
  async addExportJob(data: Omit<ExportJob, 'type'>): Promise<string | null> {
    if (!this.exportQueue) {
      logger.warn('Export queue not available');
      return null;
    }

    const job = await this.exportQueue.add('export', { type: 'export', ...data });
    return job.id || null;
  }

  /**
   * Получение статистики очередей
   */
  async getStats(): Promise<{
    notifications: { waiting: number; active: number; completed: number; failed: number } | null;
    broadcasts: { waiting: number; active: number; completed: number; failed: number } | null;
    exports: { waiting: number; active: number; completed: number; failed: number } | null;
  }> {
    const getQueueStats = async (queue: Queue | null) => {
      if (!queue) return null;
      
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);
      
      return { waiting, active, completed, failed };
    };

    return {
      notifications: await getQueueStats(this.notificationQueue),
      broadcasts: await getQueueStats(this.broadcastQueue),
      exports: await getQueueStats(this.exportQueue),
    };
  }

  /**
   * Проверка доступности очередей
   */
  isAvailable(): boolean {
    return this.isInitialized;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down queue workers...');
    
    // Закрываем воркеры
    await Promise.all(this.workers.map(worker => worker.close()));
    
    // Закрываем очереди
    const queues = [this.notificationQueue, this.broadcastQueue, this.exportQueue];
    await Promise.all(queues.filter(q => q !== null).map(q => q!.close()));
    
    this.isInitialized = false;
    logger.info('Queue workers shut down');
  }
}

// Singleton
export const queueService = new QueueService();
