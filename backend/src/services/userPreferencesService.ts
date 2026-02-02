import { supabase } from './supabase';
import { logger } from '../utils/logger';

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'auto';
  notifications_enabled: boolean;
  notification_events: boolean;
  notification_questions: boolean;
  notification_assignments: boolean;
  notification_diagnostics: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserPreferencesDto {
  theme?: 'light' | 'dark' | 'auto';
  notifications_enabled?: boolean;
  notification_events?: boolean;
  notification_questions?: boolean;
  notification_assignments?: boolean;
  notification_diagnostics?: boolean;
}

/**
 * Сервис для работы с настройками пользователя
 */
export class UserPreferencesService {
  /**
   * Получение настроек пользователя
   * Если настроек нет, возвращает дефолтные значения
   */
  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching user preferences', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Ошибка получения настроек: ${error.message}`);
    }

    // Если настроек нет, возвращаем дефолтные значения
    if (!data) {
      return {
        id: '',
        user_id: userId,
        theme: 'auto',
        notifications_enabled: true,
        notification_events: true,
        notification_questions: true,
        notification_assignments: true,
        notification_diagnostics: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return data as UserPreferences;
  }

  /**
   * Обновление настроек пользователя
   * Если настроек нет, создает новую запись
   */
  static async updateUserPreferences(
    userId: string,
    preferences: Partial<CreateUserPreferencesDto>
  ): Promise<UserPreferences> {
    // Проверяем, существуют ли настройки
    const existing = await this.getUserPreferences(userId);

    let result;
    if (existing.id) {
      // Обновляем существующие настройки
      const { data, error } = await supabase
        .from('user_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating user preferences', error instanceof Error ? error : new Error(String(error)));
        throw new Error(`Ошибка обновления настроек: ${error.message}`);
      }

      result = data;
    } else {
      // Создаем новые настройки
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          theme: preferences.theme || 'auto',
          notifications_enabled: preferences.notifications_enabled ?? true,
          notification_events: preferences.notification_events ?? true,
          notification_questions: preferences.notification_questions ?? true,
          notification_assignments: preferences.notification_assignments ?? true,
          notification_diagnostics: preferences.notification_diagnostics ?? true,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating user preferences', error instanceof Error ? error : new Error(String(error)));
        throw new Error(`Ошибка создания настроек: ${error.message}`);
      }

      result = data;
    }

    return result as UserPreferences;
  }
}
