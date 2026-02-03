import { supabase } from './supabase';
import { Broadcast, CreateBroadcastDto, UpdateBroadcastDto } from '../types';
import { logger } from '../utils/logger';

export class BroadcastService {
  /**
   * Создание новой рассылки
   */
  static async createBroadcast(data: CreateBroadcastDto, createdBy?: string): Promise<Broadcast> {
    const insertData: any = {
      title: data.title,
      message: data.message,
      image_url: data.image_url || null,
      target_type: data.target_type,
      target_values: data.target_values || null,
      status: data.scheduled_at ? 'scheduled' : 'draft',
      scheduled_at: data.scheduled_at || null,
      created_by: createdBy || null,
    };

    const { data: broadcast, error } = await supabase
      .from('broadcasts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error('Error creating broadcast', error);
      throw error;
    }

    return broadcast as Broadcast;
  }

  /**
   * Получение всех рассылок
   */
  static async getAllBroadcasts(): Promise<Broadcast[]> {
    const { data, error } = await supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching broadcasts', error);
      throw error;
    }

    return data as Broadcast[];
  }

  /**
   * Получение рассылки по ID
   */
  static async getBroadcastById(id: string): Promise<Broadcast | null> {
    const { data, error } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error('Error fetching broadcast', error);
      throw error;
    }

    return data as Broadcast;
  }

  /**
   * Обновление рассылки
   */
  static async updateBroadcast(id: string, data: UpdateBroadcastDto): Promise<Broadcast> {
    const updateData: any = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.message !== undefined) updateData.message = data.message;
    if (data.image_url !== undefined) updateData.image_url = data.image_url;
    if (data.target_type !== undefined) updateData.target_type = data.target_type;
    if (data.target_values !== undefined) updateData.target_values = data.target_values;
    if (data.scheduled_at !== undefined) {
      updateData.scheduled_at = data.scheduled_at;
      updateData.status = data.scheduled_at ? 'scheduled' : 'draft';
    }

    const { data: broadcast, error } = await supabase
      .from('broadcasts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating broadcast', error);
      throw error;
    }

    return broadcast as Broadcast;
  }

  /**
   * Удаление рассылки
   */
  static async deleteBroadcast(id: string): Promise<void> {
    const { error } = await supabase
      .from('broadcasts')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting broadcast', error);
      throw error;
    }
  }

  /**
   * Обновление статуса после отправки
   */
  static async markAsSent(id: string, sentCount: number, failedCount: number): Promise<void> {
    const { error } = await supabase
      .from('broadcasts')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_count: sentCount,
        failed_count: failedCount,
      })
      .eq('id', id);

    if (error) {
      logger.error('Error marking broadcast as sent', error);
      throw error;
    }
  }

  /**
   * Получение запланированных рассылок, готовых к отправке
   */
  static async getScheduledBroadcastsToSend(): Promise<Broadcast[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    if (error) {
      logger.error('Error fetching scheduled broadcasts', error);
      throw error;
    }

    return data as Broadcast[];
  }
}
