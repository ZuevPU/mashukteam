import { supabase } from './supabase';
import { logger } from '../utils/logger';

// Типы активностей
export type ActivityType = 
  | 'registration'
  | 'achievement'
  | 'assignment_submit'
  | 'assignment_approve'
  | 'event_complete'
  | 'diagnostic_complete'
  | 'level_up'
  | 'question_answer';

// Интерфейс записи активности
export interface Activity {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
  is_public: boolean;
  direction?: string;
  created_at: string;
  // Данные пользователя (join)
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    direction?: string;
  };
}

// DTO для создания активности
export interface CreateActivityDto {
  user_id: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
  is_public?: boolean;
  direction?: string;
}

// Фильтры для получения ленты
export interface ActivityFeedFilters {
  direction?: string; // Фильтр по направлению
  activity_type?: ActivityType; // Фильтр по типу
  user_id?: string; // Фильтр по пользователю
  limit?: number;
  offset?: number;
}

export class ActivityService {
  /**
   * Создание записи активности
   */
  static async createActivity(data: CreateActivityDto): Promise<Activity | null> {
    try {
      const { data: activity, error } = await supabase
        .from('activity_feed')
        .insert({
          user_id: data.user_id,
          activity_type: data.activity_type,
          title: data.title,
          description: data.description,
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          metadata: data.metadata || {},
          is_public: data.is_public ?? true,
          direction: data.direction,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating activity', error instanceof Error ? error : new Error(String(error)));
        return null;
      }

      return activity as Activity;
    } catch (error) {
      logger.error('Error in createActivity', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Получение ленты активности
   */
  static async getActivityFeed(filters: ActivityFeedFilters = {}): Promise<Activity[]> {
    try {
      let query = supabase
        .from('activity_feed')
        .select(`
          *,
          user:users!activity_feed_user_id_fkey(
            id,
            first_name,
            last_name,
            direction
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      // Применяем фильтры
      if (filters.direction) {
        query = query.eq('direction', filters.direction);
      }

      if (filters.activity_type) {
        query = query.eq('activity_type', filters.activity_type);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      // Пагинация
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching activity feed', error instanceof Error ? error : new Error(String(error)));
        return [];
      }

      return data as Activity[];
    } catch (error) {
      logger.error('Error in getActivityFeed', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Получение активности пользователя
   */
  static async getUserActivity(userId: string, limit: number = 20): Promise<Activity[]> {
    try {
      const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error fetching user activity', error instanceof Error ? error : new Error(String(error)));
        return [];
      }

      return data as Activity[];
    } catch (error) {
      logger.error('Error in getUserActivity', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Получение активности команды (по направлению)
   */
  static async getTeamActivity(direction: string, limit: number = 30): Promise<Activity[]> {
    return this.getActivityFeed({ direction, limit });
  }

  // ========== Хелперы для создания типовых активностей ==========

  /**
   * Активность: регистрация пользователя
   */
  static async logRegistration(userId: string, userName: string, direction?: string): Promise<void> {
    await this.createActivity({
      user_id: userId,
      activity_type: 'registration',
      title: `${userName} присоединился к команде`,
      description: direction ? `Направление: ${direction}` : undefined,
      direction,
    });
  }

  /**
   * Активность: получено достижение
   */
  static async logAchievement(
    userId: string,
    userName: string,
    achievementName: string,
    achievementId: string,
    direction?: string
  ): Promise<void> {
    await this.createActivity({
      user_id: userId,
      activity_type: 'achievement',
      title: `${userName} получил достижение "${achievementName}"`,
      entity_type: 'achievement',
      entity_id: achievementId,
      direction,
    });
  }

  /**
   * Активность: сдано задание
   */
  static async logAssignmentSubmit(
    userId: string,
    userName: string,
    assignmentTitle: string,
    assignmentId: string,
    direction?: string
  ): Promise<void> {
    await this.createActivity({
      user_id: userId,
      activity_type: 'assignment_submit',
      title: `${userName} выполнил задание "${assignmentTitle}"`,
      entity_type: 'assignment',
      entity_id: assignmentId,
      direction,
    });
  }

  /**
   * Активность: задание одобрено
   */
  static async logAssignmentApproved(
    userId: string,
    userName: string,
    assignmentTitle: string,
    reward: number,
    assignmentId: string,
    direction?: string
  ): Promise<void> {
    await this.createActivity({
      user_id: userId,
      activity_type: 'assignment_approve',
      title: `${userName} успешно сдал задание "${assignmentTitle}"`,
      description: `Награда: ${reward} звёзд`,
      entity_type: 'assignment',
      entity_id: assignmentId,
      metadata: { reward },
      direction,
    });
  }

  /**
   * Активность: завершено мероприятие
   */
  static async logEventComplete(
    userId: string,
    userName: string,
    eventTitle: string,
    eventId: string,
    points: number,
    direction?: string
  ): Promise<void> {
    await this.createActivity({
      user_id: userId,
      activity_type: 'event_complete',
      title: `${userName} посетил мероприятие "${eventTitle}"`,
      description: `+${points} баллов рефлексии`,
      entity_type: 'event',
      entity_id: eventId,
      metadata: { points },
      direction,
    });
  }

  /**
   * Активность: пройдена диагностика
   */
  static async logDiagnosticComplete(
    userId: string,
    userName: string,
    diagnosticTitle: string,
    diagnosticId: string,
    points: number,
    direction?: string
  ): Promise<void> {
    await this.createActivity({
      user_id: userId,
      activity_type: 'diagnostic_complete',
      title: `${userName} прошёл диагностику "${diagnosticTitle}"`,
      description: `+${points} баллов рефлексии`,
      entity_type: 'diagnostic',
      entity_id: diagnosticId,
      metadata: { points },
      direction,
    });
  }

  /**
   * Активность: повышение уровня рефлексии
   */
  static async logLevelUp(
    userId: string,
    userName: string,
    newLevel: number,
    levelName: string,
    direction?: string
  ): Promise<void> {
    await this.createActivity({
      user_id: userId,
      activity_type: 'level_up',
      title: `${userName} достиг уровня ${newLevel}`,
      description: levelName,
      metadata: { level: newLevel, levelName },
      direction,
    });
  }
}
