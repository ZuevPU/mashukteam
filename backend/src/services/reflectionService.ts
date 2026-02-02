import { supabase } from './supabase';
import { ReflectionAction } from '../types';

export class ReflectionService {
  /**
   * Начисление баллов рефлексии за действие
   */
  static async addReflectionPoints(
    userId: string,
    actionType: 'event_answer' | 'diagnostic_answer' | 'targeted_answer' | 'assignment_completed',
    additionalPoints: number = 0
  ): Promise<void> {
    // Определяем количество баллов в зависимости от типа действия
    const pointsMap: Record<string, number> = {
      'event_answer': 2,
      'diagnostic_answer': 3,
      'targeted_answer': 1,
      'assignment_completed': 5
    };

    const basePoints = pointsMap[actionType] || 0;
    const points = basePoints + additionalPoints;
    if (points === 0) return;

    // Получаем текущие баллы пользователя
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('reflection_points, reflection_level')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error getting user reflection points:', userError);
      throw userError;
    }

    const currentPoints = user.reflection_points || 0;
    const currentLevel = user.reflection_level || 1;
    const newPoints = currentPoints + points;

    console.log(`[ReflectionService] Начисление баллов рефлексии:`, {
      userId,
      actionType,
      points,
      currentPoints,
      currentLevel,
      newPoints
    });

    // Обновляем баллы (триггер автоматически обновит уровень)
    const { error: updateError } = await supabase
      .from('users')
      .update({ reflection_points: newPoints })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating reflection points:', updateError);
      throw updateError;
    }

    console.log(`[ReflectionService] Баллы рефлексии успешно обновлены для пользователя ${userId}: ${currentPoints} -> ${newPoints}`);

    // Записываем действие в историю
    const { error: actionError } = await supabase
      .from('reflection_actions')
      .insert({
        user_id: userId,
        action_type: actionType,
        points_awarded: points
      });

    if (actionError) {
      console.error('Error recording reflection action:', actionError);
      // Не прерываем выполнение, если ошибка записи истории
    }
  }

  /**
   * Получение статистики рефлексии пользователя
   */
  static async getReflectionStats(userId: string): Promise<{
    level: number;
    points: number;
    pointsToNextLevel: number;
    levelName: string;
  }> {
    const { data: user, error } = await supabase
      .from('users')
      .select('reflection_level, reflection_points')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error getting reflection stats:', error);
      throw error;
    }

    const level = user.reflection_level || 1;
    const points = user.reflection_points || 0;

    // Определяем пороги для уровней
    const levelThresholds = [0, 21, 51, 101, 201];
    const nextLevelThreshold = levelThresholds[level] || 201;
    const pointsToNextLevel = Math.max(0, nextLevelThreshold - points);

    const levelNames: Record<number, string> = {
      1: 'Начал задумываться',
      2: 'Поймал смысл',
      3: 'Опять рефлексирует',
      4: 'Уже хватит рефлексировать',
      5: 'Мастер рефлексии'
    };

    return {
      level,
      points,
      pointsToNextLevel,
      levelName: levelNames[level] || 'Неизвестно'
    };
  }

  /**
   * Получение истории действий рефлексии
   */
  static async getReflectionHistory(userId: string, limit: number = 20): Promise<ReflectionAction[]> {
    const { data, error } = await supabase
      .from('reflection_actions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting reflection history:', error);
      throw error;
    }

    return data as ReflectionAction[];
  }
}
