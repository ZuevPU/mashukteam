import { fetchApiWithAuth, fetchApi } from './api';
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

  /**
   * Сохранение заметки пользователя по мероприятию
   */
  saveEventNote: async (
    eventId: string,
    noteText: string,
    initData: string
  ): Promise<{ id: string; note_text: string }> => {
    const response = await fetchApi<{
      success: boolean;
      note: { id: string; note_text: string };
    }>(`/events/${eventId}/note`, {
      method: 'POST',
      body: JSON.stringify({ initData, note_text: noteText }),
    });
    return response.note;
  },

  /**
   * Получение заметки пользователя по мероприятию
   */
  getEventNote: async (
    eventId: string,
    initData: string
  ): Promise<{ id: string; note_text: string } | null> => {
    const response = await fetchApiWithAuth<{
      success: boolean;
      note: { id: string; note_text: string } | null;
    }>(`/events/${eventId}/note`, initData);
    return response.note;
  },
};
