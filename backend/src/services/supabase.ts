import { createClient } from '@supabase/supabase-js';
import { User, CreateUserDto, UpdateUserStatusDto } from '../types';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_URL и SUPABASE_SERVICE_KEY должны быть установлены в переменных окружения');
}

// Создание Supabase клиента с service role key для полного доступа
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Сервис для работы с пользователями в Supabase
 */
export class UserService {
  /**
   * Проверка существования пользователя по telegram_id
   */
  static async userExists(telegramId: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegramId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking user existence:', error);
      return false;
    }

    return !!data;
  }

  /**
   * Получение пользователя по telegram_id
   */
  static async getUserByTelegramId(telegramId: number): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Пользователь не найден
      }
      console.error('Error getting user:', error);
      throw error;
    }

    return data as User;
  }

  /**
   * Создание нового пользователя со статусом "new"
   */
  static async createUser(userData: CreateUserDto): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        telegram_id: userData.telegram_id,
        telegram_username: userData.telegram_username || null,
        first_name: userData.first_name,
        last_name: userData.last_name,
        middle_name: userData.middle_name || null,
        motivation: userData.motivation,
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }

    return data as User;
  }

  /**
   * Обновление данных пользователя
   */
  static async updateUser(telegramId: number, updates: Partial<CreateUserDto>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('telegram_id', telegramId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }

    return data as User;
  }

  /**
   * Обновление статуса пользователя
   */
  static async updateUserStatus(telegramId: number, status: 'new' | 'registered'): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({ status })
      .eq('telegram_id', telegramId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user status:', error);
      throw error;
    }

    return data as User;
  }

  /**
   * Завершение регистрации пользователя
   * Обновляет все данные и устанавливает статус "registered"
   */
  static async completeRegistration(
    telegramId: number,
    registrationData: CreateUserDto
  ): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({
        first_name: registrationData.first_name,
        last_name: registrationData.last_name,
        middle_name: registrationData.middle_name || null,
        motivation: registrationData.motivation,
        status: 'registered',
      })
      .eq('telegram_id', telegramId)
      .select()
      .single();

    if (error) {
      console.error('Error completing registration:', error);
      throw error;
    }

    return data as User;
  }
}

/**
 * ============================================
 * БУДУЩИЕ СЕРВИСЫ ДЛЯ ГЕЙМИФИКАЦИИ
 * ============================================
 * 
 * Пример структуры будущих сервисов:
 * 
 * export class PointsService {
 *   static async addPoints(userId: string, points: number, reason: string) { ... }
 *   static async getUserPoints(userId: string) { ... }
 *   static async getUserTotalPoints(userId: string) { ... }
 * }
 * 
 * export class AchievementService {
 *   static async unlockAchievement(userId: string, achievementId: string) { ... }
 *   static async getUserAchievements(userId: string) { ... }
 * }
 * 
 * export class LevelService {
 *   static async calculateLevel(experiencePoints: number): number { ... }
 *   static async addExperience(userId: string, exp: number) { ... }
 *   static async levelUp(userId: string) { ... }
 * }
 */
