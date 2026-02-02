import { buildApiEndpoint } from '../utils/apiUrl';
import { Notification } from '../types';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(buildApiEndpoint(endpoint), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Ошибка запроса');
  }

  return response.json();
}

export const notificationApi = {
  /**
   * Получение уведомлений пользователя
   */
  getMyNotifications: async (initData: string, limit: number = 50, offset: number = 0): Promise<{
    notifications: Notification[];
    unreadCount: number;
  }> => {
    const response = await fetchApi<{ success: boolean; notifications: Notification[]; unreadCount: number }>(
      '/notifications/my',
      {
        method: 'POST',
        body: JSON.stringify({ initData, limit, offset }),
      }
    );
    return {
      notifications: response.notifications,
      unreadCount: response.unreadCount,
    };
  },

  /**
   * Отметить уведомление как прочитанное
   */
  markAsRead: async (initData: string, notificationId: string): Promise<void> => {
    await fetchApi<{ success: boolean }>(
      `/notifications/${notificationId}/read`,
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }
    );
  },

  /**
   * Отметить все уведомления как прочитанные
   */
  markAllAsRead: async (initData: string): Promise<void> => {
    await fetchApi<{ success: boolean }>(
      '/notifications/read-all',
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }
    );
  },
};
