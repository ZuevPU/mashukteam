import { fetchApi } from './api';
import { Event, Question, User, CreateEventRequest, CreateQuestionRequest } from '../types';

export const adminApi = {
  /**
   * Создание мероприятия
   */
  createEvent: async (data: CreateEventRequest, initData: string): Promise<Event> => {
    const response = await fetchApi<{ success: boolean; event: Event }>(
      '/admin/events',
      {
        method: 'POST',
        body: JSON.stringify({ initData, ...data }),
      }
    );
    return response.event;
  },

  /**
   * Обновление мероприятия
   */
  updateEvent: async (id: string, data: Partial<CreateEventRequest>, initData: string): Promise<Event> => {
    const response = await fetchApi<{ success: boolean; event: Event }>(
      `/admin/events/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ initData, ...data }),
      }
    );
    return response.event;
  },

  /**
   * Удаление мероприятия
   */
  deleteEvent: async (id: string, initData: string): Promise<boolean> => {
    const response = await fetchApi<{ success: boolean; message: string }>(
      `/admin/events/${id}`,
      {
        method: 'DELETE',
        body: JSON.stringify({ initData }),
      }
    );
    return response.success;
  },

  /**
   * Добавление вопроса к мероприятию
   */
  addQuestion: async (
    eventId: string,
    data: CreateQuestionRequest,
    initData: string
  ): Promise<Question> => {
    const response = await fetchApi<{ success: boolean; question: Question }>(
      `/admin/events/${eventId}/questions`,
      {
        method: 'POST',
        body: JSON.stringify({ initData, ...data }),
      }
    );
    return response.question;
  },

  /**
   * Получение аналитики по мероприятию
   */
  getEventAnalytics: async (
    eventId: string,
    initData: string
  ): Promise<{ questions: Question[]; answers: Answer[] }> => {
    const response = await fetchApi<{ success: boolean; questions: Question[]; answers: Answer[] }>(
      `/admin/events/${eventId}/analytics`,
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }
    );
    return { questions: response.questions, answers: response.answers };
  },

  /**
   * Получение списка всех пользователей
   */
  getAllUsers: async (initData: string): Promise<User[]> => {
    const response = await fetchApi<{ success: boolean; users: User[] }>(
      '/admin/users',
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }
    );
    return response.users;
  },

  /**
   * Получение деталей пользователя (включая ответы)
   */
  getUserDetails: async (userId: string, initData: string): Promise<User & { answers: any[] }> => {
    const response = await fetchApi<{ success: boolean; user: User & { answers: any[] } }>(
      `/admin/users/${userId}`,
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }
    );
    return response.user;
  },

  /**
   * Редактирование пользователя
   */
  updateUser: async (userId: string, data: Partial<User>, initData: string): Promise<User> => {
    const response = await fetchApi<{ success: boolean; user: User }>(
      `/admin/users/${userId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ initData, ...data }),
      }
    );
    return response.user;
  },
};
