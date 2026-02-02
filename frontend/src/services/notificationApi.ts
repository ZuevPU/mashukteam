import { fetchApiWithAuth } from './api';
import { Notification } from '../types';

export const notificationApi = {
  /**
   * Получение уведомлений пользователя
   */
  getMyNotifications: async (initData: string, limit: number = 50, offset: number = 0): Promise<{
    notifications: Notification[];
    unreadCount: number;
  }> => {
    const response = await fetchApiWithAuth<{ success: boolean; notifications: Notification[]; unreadCount: number }>(
      '/notifications/my',
      initData
    );
    return {
      notifications: response.notifications || [],
      unreadCount: response.unreadCount || 0,
    };
  },

  /**
   * Отметить уведомление как прочитанное
   */
  markAsRead: async (initData: string, notificationId: string): Promise<void> => {
    await fetchApiWithAuth<{ success: boolean }>(
      `/notifications/${notificationId}/read`,
      initData
    );
  },

  /**
   * Отметить все уведомления как прочитанные
   */
  markAllAsRead: async (initData: string): Promise<void> => {
    await fetchApiWithAuth<{ success: boolean }>(
      '/notifications/read-all',
      initData
    );
  },
};
