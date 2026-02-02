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
    try {
      const response = await fetchApi<{
        success: boolean;
        note: { id: string; note_text: string } | null;
      }>(`/events/${eventId}/note/get`, {
        method: 'POST',
        body: JSON.stringify({ initData }),
      });
      return response.note;
    } catch (error: any) {
      // Если заметка не найдена, возвращаем null вместо ошибки
      if (error?.message?.includes('404') || error?.message?.includes('не найдено')) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Получение всех заметок пользователя по мероприятиям
   */
  getUserEventNotes: async (initData: string): Promise<Array<{ id: string; event_id: string; note_text: string; event: { id: string; title: string; event_date?: string } }>> => {
    const response = await fetchApiWithAuth<{
      success: boolean;
      notes: Array<{ id: string; event_id: string; note_text: string; event: { id: string; title: string; event_date?: string } }>;
    }>('/events/notes/my', initData);
    return response.notes;
  },

  /**
   * Получение вопросов диагностики для пользователя
   */
  getDiagnosticQuestions: async (
    eventId: string,
    initData: string
  ): Promise<{ event: Event; questions: any[]; userAnswers: any[] }> => {
    const response = await fetchApiWithAuth<{
      success: boolean;
      event: Event;
      questions: any[];
      userAnswers: any[];
    }>(`/events/${eventId}/diagnostic/questions`, initData);
    return {
      event: response.event,
      questions: response.questions,
      userAnswers: response.userAnswers
    };
  },

  /**
   * Отправка ответа на вопрос диагностики
   */
  submitDiagnosticAnswer: async (
    eventId: string,
    questionId: string,
    answerData: any,
    initData: string
  ): Promise<{ id: string; answer_data: any }> => {
    const response = await fetchApi<{
      success: boolean;
      answer: { id: string; answer_data: any };
    }>(`/events/${eventId}/diagnostic/answer`, {
      method: 'POST',
      body: JSON.stringify({ initData, questionId, answerData }),
    });
    return response.answer;
  },
};
