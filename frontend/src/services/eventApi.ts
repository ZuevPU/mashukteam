import { fetchApiWithAuth } from './api';
import { Event } from '../types';

export const eventApi = {
  /**
   * Получение списка всех мероприятий
   */
  getEvents: async (initData: string): Promise<Event[]> => {
    const response = await fetchApiWithAuth<{ success: boolean; events: Event[] }>(
      '/events/list',
      initData
    );
    return response.events;
  },

  /**
   * Получение деталей мероприятия (только информация о мероприятии)
   */
  getEventDetails: async (
    id: string,
    initData: string
  ): Promise<{ event: Event }> => {
    const response = await fetchApiWithAuth<{
      success: boolean;
      event: Event;
    }>(`/events/${id}/details`, initData);
    
    return { 
      event: response.event
    };
  },
};
