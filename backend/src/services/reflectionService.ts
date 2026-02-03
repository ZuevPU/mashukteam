import { supabase } from './supabase';
import { ReflectionAction } from '../types';

export class ReflectionService {
  /**
   * Начисление баллов рефлексии за действие
   * Для targeted_answer используется только additionalPoints (reflection_points из вопроса)
   * Для остальных типов действий - фиксированные значения (но они больше не используются)
   */
  static async addReflectionPoints(
    userId: string,
    actionType: 'event_answer' | 'diagnostic_answer' | 'targeted_answer' | 'assignment_completed',
    additionalPoints: number = 0
  ): Promise<void> {
    // Для targeted_answer используем только additionalPoints (reflection_points из вопроса)
    // Для остальных типов - фиксированные значения (но они больше не используются в новой логике)
    let points: number;
    if (actionType === 'targeted_answer') {
      points = additionalPoints > 0 ? additionalPoints : 1; // По умолчанию 1, если не указано
    } else {
      // Старая логика (больше не используется, но оставляем для обратной совместимости)
      const pointsMap: Record<string, number> = {
        'event_answer': 2,
        'diagnostic_answer': 3,
        'assignment_completed': 5
      };
      const basePoints = pointsMap[actionType] || 0;
      points = basePoints + additionalPoints;
    }
    
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

    // Вычисляем новый уровень рефлексии на основе баллов
    const calculateLevel = (points: number): number => {
      if (points <= 20) return 1; // "Начал задумываться"
      if (points <= 50) return 2; // "Поймал смысл"
      if (points <= 100) return 3; // "Опять рефлексирует"
      if (points <= 200) return 4; // "Мастер рефлексии"
      return 5; // "Преисполнился в рефлексии"
    };

    const newLevel = calculateLevel(newPoints);

    console.log(`[ReflectionService] Начисление баллов рефлексии:`, {
      userId,
      actionType,
      points,
      currentPoints,
      currentLevel,
      newPoints,
      newLevel
    });

    // Обновляем баллы и уровень рефлексии явно
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        reflection_points: newPoints,
        reflection_level: newLevel
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating reflection points:', updateError);
      throw updateError;
    }

    console.log(`[ReflectionService] Баллы и уровень рефлексии успешно обновлены для пользователя ${userId}: ${currentPoints} -> ${newPoints}, уровень ${currentLevel} -> ${newLevel}`);

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

    // Определяем пороги для уровней (пороги для перехода на следующий уровень)
    const levelThresholds: Record<number, number> = {
      1: 21,  // Для уровня 1 следующий порог - 21
      2: 51,  // Для уровня 2 следующий порог - 51
      3: 101, // Для уровня 3 следующий порог - 101
      4: 201, // Для уровня 4 следующий порог - 201
      5: 201  // Для уровня 5 максимальный порог
    };
    const nextLevelThreshold = levelThresholds[level] || 201;
    const pointsToNextLevel = level < 5 ? Math.max(0, nextLevelThreshold - points) : 0;

    const levelNames: Record<number, string> = {
      1: 'Начал задумываться',
      2: 'Поймал смысл',
      3: 'Опять рефлексирует',
      4: 'Мастер рефлексии',
      5: 'Преисполнился в рефлексии'
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
