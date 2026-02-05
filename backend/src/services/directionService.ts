import { supabase } from './supabase';
import { Direction, CreateDirectionDto } from '../types';
import { cacheService, CacheKeys, CacheTTL, withCache } from './cacheService';

export class DirectionService {
  /**
   * Получение всех направлений (с кэшированием)
   */
  static async getAllDirections(): Promise<Direction[]> {
    return withCache(
      CacheKeys.directions(),
      CacheTTL.DIRECTIONS,
      async () => {
        const { data, error } = await supabase
          .from('directions')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error getting directions:', error);
          throw error;
        }

        return data as Direction[];
      }
    );
  }

  /**
   * Получение направления по ID
   */
  static async getDirectionById(id: string): Promise<Direction | null> {
    const { data, error } = await supabase
      .from('directions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as Direction;
  }

  /**
   * Создание направления (админ)
   */
  static async createDirection(data: CreateDirectionDto): Promise<Direction> {
    const { data: direction, error } = await supabase
      .from('directions')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error creating direction:', error);
      throw error;
    }

    // Инвалидируем кэш направлений
    cacheService.invalidateDirections().catch(() => {});

    return direction as Direction;
  }

  /**
   * Обновление направления (админ)
   */
  static async updateDirection(id: string, data: Partial<CreateDirectionDto>): Promise<Direction> {
    const { data: direction, error } = await supabase
      .from('directions')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating direction:', error);
      throw error;
    }

    // Инвалидируем кэш направлений
    cacheService.invalidateDirections().catch(() => {});

    return direction as Direction;
  }

  /**
   * Удаление направления (админ)
   */
  static async deleteDirection(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('directions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting direction:', error);
      throw error;
    }

    // Инвалидируем кэш направлений
    cacheService.invalidateDirections().catch(() => {});

    return true;
  }

  /**
   * Назначение направления пользователю
   */
  static async setUserDirection(userId: string, direction: string | null): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        direction: direction
      })
      .eq('id', userId);

    if (error) {
      console.error('Error setting user direction:', error);
      throw error;
    }
  }
}
