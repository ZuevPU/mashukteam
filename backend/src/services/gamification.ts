// Импорт конфигурации окружения ПЕРВЫМ
import '../config/env';

import { supabase } from './supabase';
import {
  PointsTransaction,
  Achievement,
  UserAchievement,
  UserLevel,
  UserAction,
  AddPointsDto,
  UserStats,
} from '../types';
import { ReflectionService } from './reflectionService';

/**
 * Сервис для работы с баллами пользователей
 */
export class PointsService {
  /**
   * Начисление баллов пользователю с записью в историю
   */
  static async addPoints(userId: string, points: number, reason?: string): Promise<PointsTransaction> {
    const { data, error } = await supabase
      .from('user_points')
      .insert({
        user_id: userId,
        points,
        reason: reason || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding points:', error);
      throw error;
    }

    return data as PointsTransaction;
  }

  /**
   * Списание баллов пользователя
   */
  static async deductPoints(userId: string, points: number, reason?: string): Promise<PointsTransaction> {
    return this.addPoints(userId, -points, reason || `Списание ${points} баллов`);
  }

  /**
   * Получение истории баллов пользователя
   */
  static async getUserPoints(userId: string, limit: number = 50): Promise<PointsTransaction[]> {
    const { data, error } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting user points:', error);
      throw error;
    }

    return data as PointsTransaction[];
  }

  /**
   * Получение общего количества баллов пользователя
   */
  static async getUserTotalPoints(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('users')
      .select('total_points')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error getting total points:', error);
      throw error;
    }

    return (data as any).total_points || 0;
  }
}

/**
 * Сервис для работы с достижениями
 */
export class AchievementService {
  /**
   * Получение всех достижений
   */
  static async getAllAchievements(): Promise<Achievement[]> {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting achievements:', error);
      throw error;
    }

    return data as Achievement[];
  }

  /**
   * Получение достижений пользователя
   */
  static async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('Error getting user achievements:', error);
      throw error;
    }

    return data as UserAchievement[];
  }

  /**
   * Разблокировка достижения для пользователя
   */
  static async unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement> {
    // Проверяем, не разблокировано ли уже достижение
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .single();

    if (existing) {
      // Достижение уже разблокировано
      const { data: achievement } = await supabase
        .from('achievements')
        .select('*')
        .eq('id', achievementId)
        .single();

      return {
        ...existing,
        achievement: achievement as Achievement,
      } as UserAchievement;
    }

    // Получаем информацию о достижении для начисления баллов
    const { data: achievement, error: achievementError } = await supabase
      .from('achievements')
      .select('*')
      .eq('id', achievementId)
      .single();

    if (achievementError || !achievement) {
      throw new Error('Achievement not found');
    }

    // Разблокируем достижение
    const { data, error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
      })
      .select(`
        *,
        achievement:achievements(*)
      `)
      .single();

    if (error) {
      console.error('Error unlocking achievement:', error);
      throw error;
    }

    // Начисляем баллы за достижение, если они есть
    if (achievement.points_reward > 0) {
      await PointsService.addPoints(
        userId,
        achievement.points_reward,
        `Достижение: ${achievement.name}`
      );
    }

    return data as UserAchievement;
  }

  /**
   * Проверка условий и автоматическая разблокировка достижений
   */
  static async checkAndUnlockAchievements(userId: string): Promise<UserAchievement[]> {
    const unlocked: UserAchievement[] = [];
    
    // Получаем все достижения
    const allAchievements = await this.getAllAchievements();
    
    // Получаем уже разблокированные достижения пользователя
    const userAchievements = await this.getUserAchievements(userId);
    const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id));
    
    // Получаем данные пользователя для проверки условий
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!user) {
      return unlocked;
    }

    // Получаем статистику пользователя для проверки условий
    const reflectionLevel = user.reflection_level || 1;
    const reflectionPoints = user.reflection_points || 0;

    // Подсчитываем количество выполненных заданий
    const { count: assignmentsCount } = await supabase
      .from('assignment_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'approved');

    // Подсчитываем количество ответов на вопросы
    const { count: targetedAnswersCount } = await supabase
      .from('targeted_answers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Подсчитываем количество ответов на мероприятия/диагностики
    const { count: eventAnswersCount } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Проверяем каждое достижение
    for (const achievement of allAchievements) {
      if (unlockedIds.has(achievement.id)) {
        continue; // Уже разблокировано
      }

      let shouldUnlock = false;
      const achievementNameLower = achievement.name.toLowerCase();

      // Проверка условий по названию достижения
      if (achievementNameLower.includes('регистрация') || achievementNameLower.includes('первая регистрация')) {
        if (user.status === 'registered') {
          shouldUnlock = true;
        }
      } else if (achievementNameLower.includes('первые баллы') || achievementNameLower.includes('первые очки')) {
        if ((user.total_points || 0) > 0 || reflectionPoints > 0) {
          shouldUnlock = true;
        }
      } else if (achievementNameLower.includes('уровень 2') || achievementNameLower.includes('уровень рефлексии 2')) {
        if (reflectionLevel >= 2) {
          shouldUnlock = true;
        }
      } else if (achievementNameLower.includes('уровень 3') || achievementNameLower.includes('уровень рефлексии 3')) {
        if (reflectionLevel >= 3) {
          shouldUnlock = true;
        }
      } else if (achievementNameLower.includes('уровень 4') || achievementNameLower.includes('уровень рефлексии 4')) {
        if (reflectionLevel >= 4) {
          shouldUnlock = true;
        }
      } else if (achievementNameLower.includes('уровень 5') || achievementNameLower.includes('мастер рефлексии')) {
        if (reflectionLevel >= 5) {
          shouldUnlock = true;
        }
      } else if (achievementNameLower.includes('задание') || achievementNameLower.includes('заданий')) {
        // Проверка на количество выполненных заданий
        if (achievementNameLower.includes('первое') || achievementNameLower.includes('1')) {
          if ((assignmentsCount || 0) >= 1) {
            shouldUnlock = true;
          }
        } else if (achievementNameLower.includes('5') || achievementNameLower.includes('пять')) {
          if ((assignmentsCount || 0) >= 5) {
            shouldUnlock = true;
          }
        } else if (achievementNameLower.includes('10') || achievementNameLower.includes('десять')) {
          if ((assignmentsCount || 0) >= 10) {
            shouldUnlock = true;
          }
        }
      } else if (achievementNameLower.includes('вопрос') || achievementNameLower.includes('ответ')) {
        // Проверка на количество ответов на вопросы
        const totalAnswers = (targetedAnswersCount || 0) + (eventAnswersCount || 0);
        if (achievementNameLower.includes('первый') || achievementNameLower.includes('1')) {
          if (totalAnswers >= 1) {
            shouldUnlock = true;
          }
        } else if (achievementNameLower.includes('10') || achievementNameLower.includes('десять')) {
          if (totalAnswers >= 10) {
            shouldUnlock = true;
          }
        } else if (achievementNameLower.includes('50') || achievementNameLower.includes('пятьдесят')) {
          if (totalAnswers >= 50) {
            shouldUnlock = true;
          }
        }
      } else if (achievementNameLower.includes('мероприятие') || achievementNameLower.includes('событие')) {
        // Проверка на участие в мероприятиях
        if ((eventAnswersCount || 0) >= 1) {
          shouldUnlock = true;
        }
      } else if (achievementNameLower.includes('балл') || achievementNameLower.includes('очк')) {
        // Проверка на количество баллов рефлексии
        if (achievementNameLower.includes('50') || achievementNameLower.includes('пятьдесят')) {
          if (reflectionPoints >= 50) {
            shouldUnlock = true;
          }
        } else if (achievementNameLower.includes('100') || achievementNameLower.includes('сто')) {
          if (reflectionPoints >= 100) {
            shouldUnlock = true;
          }
        } else if (achievementNameLower.includes('200') || achievementNameLower.includes('двести')) {
          if (reflectionPoints >= 200) {
            shouldUnlock = true;
          }
        }
      }

      if (shouldUnlock) {
        try {
          const unlockedAchievement = await this.unlockAchievement(userId, achievement.id);
          unlocked.push(unlockedAchievement);
        } catch (error) {
          console.error(`Error unlocking achievement ${achievement.id}:`, error);
        }
      }
    }

    return unlocked;
  }
}

/**
 * Сервис для работы с уровнями пользователей
 */
export class LevelService {
  /**
   * Расчет уровня по количеству опыта
   * Формула: level = floor(sqrt(experience_points / 100)) + 1
   */
  static calculateLevel(experiencePoints: number): number {
    return Math.floor(Math.sqrt(experiencePoints / 100)) + 1;
  }

  /**
   * Расчет опыта, необходимого для следующего уровня
   */
  static calculateExperienceForNextLevel(currentLevel: number): number {
    return Math.pow(currentLevel, 2) * 100;
  }

  /**
   * Получение уровня пользователя (создает запись, если не существует)
   */
  static async getUserLevel(userId: string): Promise<UserLevel> {
    const { data, error } = await supabase
      .from('user_levels')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Уровень не существует, создаем начальный уровень
      const { data: newLevel, error: createError } = await supabase
        .from('user_levels')
        .insert({
          user_id: userId,
          level: 1,
          experience_points: 0,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user level:', createError);
        throw createError;
      }

      return newLevel as UserLevel;
    }

    if (error) {
      console.error('Error getting user level:', error);
      throw error;
    }

    return data as UserLevel;
  }

  /**
   * Добавление опыта пользователю с автоматическим повышением уровня
   */
  static async addExperience(userId: string, exp: number): Promise<UserLevel> {
    const currentLevel = await this.getUserLevel(userId);
    const newExperiencePoints = currentLevel.experience_points + exp;
    const newLevel = this.calculateLevel(newExperiencePoints);

    const { data, error } = await supabase
      .from('user_levels')
      .update({
        experience_points: newExperiencePoints,
        level: newLevel,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error adding experience:', error);
      throw error;
    }

    // Если уровень повысился, логируем действие
    if (newLevel > currentLevel.level) {
      await AnalyticsService.logAction(userId, 'level_up', {
        old_level: currentLevel.level,
        new_level: newLevel,
        experience_points: newExperiencePoints,
      });
    }

    return data as UserLevel;
  }

  /**
   * Повышение уровня (обычно вызывается после добавления опыта)
   */
  static async levelUp(userId: string): Promise<UserLevel> {
    const currentLevel = await this.getUserLevel(userId);
    const newLevel = currentLevel.level + 1;
    const requiredExp = this.calculateExperienceForNextLevel(currentLevel.level);

    // Проверяем, достаточно ли опыта для повышения уровня
    if (currentLevel.experience_points < requiredExp) {
      throw new Error(`Недостаточно опыта для повышения уровня. Требуется: ${requiredExp}, текущий: ${currentLevel.experience_points}`);
    }

    const { data, error } = await supabase
      .from('user_levels')
      .update({
        level: newLevel,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error leveling up:', error);
      throw error;
    }

    await AnalyticsService.logAction(userId, 'level_up', {
      old_level: currentLevel.level,
      new_level: newLevel,
    });

    return data as UserLevel;
  }
}

/**
 * Сервис для аналитики действий пользователей
 */
export class AnalyticsService {
  /**
   * Логирование действия пользователя
   */
  static async logAction(
    userId: string,
    actionType: string,
    actionData?: Record<string, any>
  ): Promise<UserAction> {
    const { data, error } = await supabase
      .from('user_actions')
      .insert({
        user_id: userId,
        action_type: actionType,
        action_data: actionData || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging action:', error);
      throw error;
    }

    return data as UserAction;
  }

  /**
   * Получение статистики пользователя
   */
  static async getUserStats(userId: string): Promise<UserStats> {
    // Получаем данные пользователя
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error getting user:', userError);
      throw userError;
    }

    // Получаем уровень пользователя
    const userLevel = await LevelService.getUserLevel(userId);
    const experienceToNextLevel = LevelService.calculateExperienceForNextLevel(userLevel.level) - userLevel.experience_points;

    // Получаем достижения
    const userAchievements = await AchievementService.getUserAchievements(userId);

    // Получаем последние транзакции баллов
    const recentPoints = await PointsService.getUserPoints(userId, 5);

    // Получаем последние достижения
    const recentAchievements = userAchievements
      .slice(0, 5)
      .map(ua => ua.achievement)
      .filter(Boolean) as Achievement[];

    // Получаем статистику рефлексии
    let reflectionStats;
    try {
      reflectionStats = await ReflectionService.getReflectionStats(userId);
    } catch (reflectionError) {
      console.error('Error getting reflection stats:', reflectionError);
      reflectionStats = {
        level: 1,
        points: 0,
        pointsToNextLevel: 21,
        levelName: 'Начал задумываться'
      };
    }

    return {
      user_id: userId,
      total_points: user.total_points || 0,
      current_level: userLevel.level,
      experience_points: userLevel.experience_points,
      experience_to_next_level: Math.max(0, experienceToNextLevel),
      achievements_count: userAchievements.length,
      recent_achievements: recentAchievements,
      recent_points_transactions: recentPoints,
      reflection_level: reflectionStats.level,
      reflection_points: reflectionStats.points,
      reflection_to_next_level: reflectionStats.pointsToNextLevel,
    };
  }
}
