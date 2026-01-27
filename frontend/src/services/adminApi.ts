import { fetchApi } from './api';
import { 
  Event, Question, User, CreateEventRequest, CreateQuestionRequest, Answer,
  TargetedQuestion, CreateTargetedQuestionRequest 
} from '../types';

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

  /**
   * Назначение типа пользователя
   */
  setUserType: async (userId: string, userType: string, initData: string): Promise<User> => {
    const response = await fetchApi<{ success: boolean; user: User }>(
      `/admin/users/${userId}/type`,
      {
        method: 'PATCH',
        body: JSON.stringify({ initData, userType }),
      }
    );
    return response.user;
  },

  /**
   * Создание таргетированного вопроса
   */
  createTargetedQuestion: async (
    data: CreateTargetedQuestionRequest, 
    initData: string
  ): Promise<TargetedQuestion> => {
    const response = await fetchApi<{ success: boolean; question: TargetedQuestion }>(
      '/admin/questions',
      {
        method: 'POST',
        body: JSON.stringify({ initData, ...data }),
      }
    );
    return response.question;
  },

  /**
   * Получение ВСЕХ событий (для админки)
   */
  getAllEvents: async (initData: string): Promise<Event[]> => {
    // Используем тот же эндпоинт, что и пользователи, но у админа может быть свой,
    // или мы можем добавить параметр ?all=true
    // Но лучше сделать отдельный эндпоинт /admin/events/list
    // В AdminController.createEvent - POST /admin/events
    // Но нет GET /admin/events
    // Давайте добавим его на бэкенде.
    // Пока что используем временное решение - добавим GET метод в роуты
    
    // ВРЕМЕННО: используем пользовательский эндпоинт, но он возвращает только опубликованные...
    // СТОП. Я изменил EventController.getEvents на getPublishedEvents.
    // Значит мне НУЖЕН новый эндпоинт для админа.
    // Я добавлю GET /admin/events/list в роуты.
    
    const response = await fetchApi<{ success: boolean; events: Event[] }>(
      '/admin/events/list', 
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }
    );
    return response.events;
  }
};
