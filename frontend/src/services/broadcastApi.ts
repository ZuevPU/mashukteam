import { fetchApi } from './api';
import { Broadcast, CreateBroadcastRequest } from '../types';

export const broadcastApi = {
  // Создание рассылки
  createBroadcast: async (data: CreateBroadcastRequest, initData: string): Promise<Broadcast> => {
    const response = await fetchApi<{ success: boolean; broadcast: Broadcast }>(
      '/admin/broadcasts',
      { method: 'POST', body: JSON.stringify({ initData, ...data }) }
    );
    return response.broadcast;
  },

  // Получение всех рассылок
  getAllBroadcasts: async (initData: string): Promise<Broadcast[]> => {
    const response = await fetchApi<{ success: boolean; broadcasts: Broadcast[] }>(
      '/admin/broadcasts/list',
      { method: 'POST', body: JSON.stringify({ initData }) }
    );
    return response.broadcasts;
  },

  // Получение рассылки по ID
  getBroadcastById: async (id: string, initData: string): Promise<Broadcast> => {
    const response = await fetchApi<{ success: boolean; broadcast: Broadcast }>(
      `/admin/broadcasts/${id}`,
      { method: 'POST', body: JSON.stringify({ initData }) }
    );
    return response.broadcast;
  },

  // Обновление рассылки
  updateBroadcast: async (id: string, data: Partial<CreateBroadcastRequest>, initData: string): Promise<Broadcast> => {
    const response = await fetchApi<{ success: boolean; broadcast: Broadcast }>(
      `/admin/broadcasts/${id}`,
      { method: 'PUT', body: JSON.stringify({ initData, ...data }) }
    );
    return response.broadcast;
  },

  // Удаление рассылки
  deleteBroadcast: async (id: string, initData: string): Promise<boolean> => {
    const response = await fetchApi<{ success: boolean }>(
      `/admin/broadcasts/${id}`,
      { method: 'DELETE', body: JSON.stringify({ initData }) }
    );
    return response.success;
  },

  // Отправка рассылки
  sendBroadcast: async (id: string, initData: string): Promise<{ success: boolean; sent: number; failed: number; total: number }> => {
    const response = await fetchApi<{ success: boolean; sent: number; failed: number; total: number }>(
      `/admin/broadcasts/${id}/send`,
      { method: 'POST', body: JSON.stringify({ initData }) }
    );
    return response;
  },
};
