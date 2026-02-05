import Redis from 'ioredis';
import { logger } from '../utils/logger';

// Интерфейс для настроек кэша
interface CacheConfig {
  defaultTTL: number; // в секундах
  prefix: string;
}

const config: CacheConfig = {
  defaultTTL: 300, // 5 минут по умолчанию
  prefix: 'mashuk:'
};

// TTL для разных типов данных (в секундах)
export const CacheTTL = {
  USER: 300,           // 5 минут - данные пользователя
  USER_PREFERENCES: 600, // 10 минут - настройки уведомлений
  DIRECTIONS: 3600,    // 1 час - список направлений
  ANALYTICS: 60,       // 1 минута - аналитика (часто обновляется)
  EVENTS: 300,         // 5 минут - мероприятия
  ASSIGNMENTS: 300,    // 5 минут - задания
  LEADERBOARD: 120,    // 2 минуты - лидерборд
} as const;

// Ключи кэша
export const CacheKeys = {
  user: (id: string) => `${config.prefix}user:${id}`,
  userByTelegramId: (telegramId: number) => `${config.prefix}user:tg:${telegramId}`,
  userPreferences: (userId: string) => `${config.prefix}prefs:${userId}`,
  allUsers: () => `${config.prefix}users:all`,
  directions: () => `${config.prefix}directions`,
  analytics: (type: string) => `${config.prefix}analytics:${type}`,
  events: (status?: string) => `${config.prefix}events:${status || 'all'}`,
  assignments: (status?: string) => `${config.prefix}assignments:${status || 'all'}`,
  leaderboard: () => `${config.prefix}leaderboard`,
} as const;

class CacheService {
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private connectionAttempted: boolean = false;

  /**
   * Инициализация подключения к Redis
   */
  async connect(): Promise<void> {
    if (this.connectionAttempted) {
      return;
    }
    this.connectionAttempted = true;

    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      logger.warn('REDIS_URL не установлен, кэширование отключено');
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            logger.error('Redis: превышено количество попыток подключения');
            return null; // Прекратить попытки
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis: подключение установлено');
      });

      this.client.on('error', (err) => {
        logger.error('Redis ошибка', err instanceof Error ? err : new Error(String(err)));
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis: соединение закрыто');
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Redis: ошибка подключения', error instanceof Error ? error : new Error(String(error)));
      this.client = null;
    }
  }

  /**
   * Проверка доступности кэша
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Получение значения из кэша
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const data = await this.client!.get(key);
      if (data) {
        return JSON.parse(data) as T;
      }
      return null;
    } catch (error) {
      logger.error('Redis get error', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Сохранение значения в кэш
   */
  async set<T>(key: string, value: T, ttl: number = config.defaultTTL): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client!.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      logger.error('Redis set error', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Удаление значения из кэша
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.client!.del(key);
      return true;
    } catch (error) {
      logger.error('Redis delete error', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Удаление значений по паттерну
   */
  async deletePattern(pattern: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const keys = await this.client!.keys(pattern);
      if (keys.length > 0) {
        await this.client!.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error('Redis deletePattern error', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Инвалидация кэша пользователя
   */
  async invalidateUser(userId: string, telegramId?: number): Promise<void> {
    await this.delete(CacheKeys.user(userId));
    if (telegramId) {
      await this.delete(CacheKeys.userByTelegramId(telegramId));
    }
    await this.delete(CacheKeys.userPreferences(userId));
    await this.delete(CacheKeys.allUsers());
  }

  /**
   * Инвалидация кэша всех пользователей
   */
  async invalidateAllUsers(): Promise<void> {
    await this.deletePattern(`${config.prefix}user:*`);
    await this.deletePattern(`${config.prefix}prefs:*`);
    await this.delete(CacheKeys.allUsers());
  }

  /**
   * Инвалидация кэша направлений
   */
  async invalidateDirections(): Promise<void> {
    await this.delete(CacheKeys.directions());
  }

  /**
   * Инвалидация кэша аналитики
   */
  async invalidateAnalytics(): Promise<void> {
    await this.deletePattern(`${config.prefix}analytics:*`);
  }

  /**
   * Инвалидация кэша мероприятий
   */
  async invalidateEvents(): Promise<void> {
    await this.deletePattern(`${config.prefix}events:*`);
  }

  /**
   * Инвалидация кэша заданий
   */
  async invalidateAssignments(): Promise<void> {
    await this.deletePattern(`${config.prefix}assignments:*`);
    await this.delete(CacheKeys.leaderboard());
  }

  /**
   * Полная очистка кэша
   */
  async flush(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.deletePattern(`${config.prefix}*`);
      logger.info('Redis: кэш очищен');
      return true;
    } catch (error) {
      logger.error('Redis flush error', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Получение статистики кэша
   */
  async getStats(): Promise<{ keys: number; memory: string } | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const keys = await this.client!.keys(`${config.prefix}*`);
      const info = await this.client!.info('memory');
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      
      return {
        keys: keys.length,
        memory: memoryMatch ? memoryMatch[1] : 'unknown'
      };
    } catch (error) {
      logger.error('Redis getStats error', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Закрытие соединения
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info('Redis: соединение закрыто');
    }
  }
}

// Экспорт singleton
export const cacheService = new CacheService();

/**
 * Хелпер для получения данных с кэшированием
 * @param key - ключ кэша
 * @param ttl - время жизни в секундах
 * @param fetchFn - функция для получения данных при cache miss
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Попытка получить из кэша
  const cached = await cacheService.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - получаем данные
  const data = await fetchFn();
  
  // Сохраняем в кэш (fire-and-forget)
  cacheService.set(key, data, ttl).catch(() => {});
  
  return data;
}
