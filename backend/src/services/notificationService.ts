import { supabase } from './supabase';
import { Notification } from '../types';
import { logger } from '../utils/logger';

export class NotificationService {
  /**
   * Создание уведомления
   */
  static async createNotification(
    userId: string,
    type: 'event' | 'question' | 'assignment' | 'diagnostic' | 'achievement' | 'randomizer' | 'assignment_result',
    title: string,
    message: string,
    deepLink?: string
  ): Promise<Notification> {
    try {
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          deep_link: deepLink || null,
          read: false,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating notification', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }

      return notification as Notification;
    } catch (error) {
      logger.error('Error creating notification', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Получение уведомлений пользователя
   */
  static async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Notification[]> {
    try {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Error getting user notifications', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }

      return (notifications || []) as Notification[];
    } catch (error) {
      logger.error('Error getting user notifications', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Получение количества непрочитанных уведомлений
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        logger.error('Error getting unread count', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }

      return count || 0;
    } catch (error) {
      logger.error('Error getting unread count', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Отметить уведомление как прочитанное
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        logger.error('Error marking notification as read', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    } catch (error) {
      logger.error('Error marking notification as read', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Отметить все уведомления как прочитанные
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        logger.error('Error marking all notifications as read', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    } catch (error) {
      logger.error('Error marking all notifications as read', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}
