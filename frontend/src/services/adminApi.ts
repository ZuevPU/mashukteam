import { fetchApi } from './api';
import { 
  Event, Question, User, CreateEventRequest, CreateQuestionRequest, Answer,
  TargetedQuestion, CreateTargetedQuestionRequest, 
  Assignment, AssignmentSubmission, CreateAssignmentRequest, Direction,
  RandomizerQuestion, RandomizerDistribution
} from '../types';
import { RandomizerParticipantsResponse } from './assignmentApi';

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
   * Назначение направления пользователю
   */
  setUserDirection: async (userId: string, direction: string, initData: string): Promise<User> => {
    const response = await fetchApi<{ success: boolean; user: User }>(
      `/admin/users/${userId}/direction`,
      {
        method: 'PATCH',
        body: JSON.stringify({ initData, direction }),
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
   * Обновление таргетированного вопроса
   */
  updateTargetedQuestion: async (
    id: string,
    data: Partial<CreateTargetedQuestionRequest & { status: string }>,
    initData: string
  ): Promise<TargetedQuestion> => {
    const response = await fetchApi<{ success: boolean; question: TargetedQuestion }>(
      `/admin/questions/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ initData, ...data }),
      }
    );
    return response.question;
  },

  /**
   * Удаление таргетированного вопроса
   */
  deleteTargetedQuestion: async (id: string, initData: string): Promise<boolean> => {
    const response = await fetchApi<{ success: boolean }>(
      `/admin/questions/${id}`,
      {
        method: 'DELETE',
        body: JSON.stringify({ initData }),
      }
    );
    return response.success;
  },

  /**
   * Получение ВСЕХ событий (для админки)
   */
  getAllEvents: async (initData: string): Promise<Event[]> => {
    const response = await fetchApi<{ success: boolean; events: Event[] }>(
      '/admin/events/list', 
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }
    );
    return response.events;
  },

  // === Assignments ===

  createAssignment: async (data: CreateAssignmentRequest, initData: string): Promise<Assignment> => {
    const response = await fetchApi<{ success: boolean; assignment: Assignment }>(
      '/admin/assignments',
      { method: 'POST', body: JSON.stringify({ initData, ...data }) }
    );
    return response.assignment;
  },

  updateAssignment: async (id: string, data: Partial<CreateAssignmentRequest & { status: string; scheduled_at: string | null }>, initData: string, sendNotification?: boolean): Promise<Assignment> => {
    const response = await fetchApi<{ success: boolean; assignment: Assignment }>(
      `/admin/assignments/${id}`,
      { method: 'PUT', body: JSON.stringify({ initData, ...data, sendNotification }) }
    );
    return response.assignment;
  },

  deleteAssignment: async (id: string, initData: string): Promise<boolean> => {
    const response = await fetchApi<{ success: boolean }>(
      `/admin/assignments/${id}`,
      { method: 'DELETE', body: JSON.stringify({ initData }) }
    );
    return response.success;
  },

  getAllAssignments: async (initData: string): Promise<Assignment[]> => {
    const response = await fetchApi<{ success: boolean; assignments: Assignment[] }>(
      '/admin/assignments/list',
      { method: 'POST', body: JSON.stringify({ initData }) }
    );
    return response.assignments;
  },

  getAssignmentSubmissions: async (assignmentId: string, initData: string): Promise<AssignmentSubmission[]> => {
    const response = await fetchApi<{ success: boolean; submissions: AssignmentSubmission[] }>(
      `/admin/assignments/${assignmentId}/submissions`,
      { method: 'POST', body: JSON.stringify({ initData }) }
    );
    return response.submissions;
  },

  moderateSubmission: async (submissionId: string, status: 'approved' | 'rejected', comment: string | undefined, initData: string): Promise<AssignmentSubmission> => {
    const response = await fetchApi<{ success: boolean; submission: AssignmentSubmission }>(
      `/admin/submissions/${submissionId}`,
      { method: 'PATCH', body: JSON.stringify({ initData, status, admin_comment: comment }) }
    );
    return response.submission;
  },

  getLeaderboard: async (initData: string): Promise<{ user_id: string; user: any; approved_count: number; total_reward: number }[]> => {
    const response = await fetchApi<{ success: boolean; leaderboard: any[] }>(
      '/admin/leaderboard',
      { method: 'POST', body: JSON.stringify({ initData }) }
    );
    return response.leaderboard;
  },

  // === User Types ===
  
  getDirections: async (): Promise<Direction[]> => {
    const response = await fetchApi<{ success: boolean; directions: Direction[] }>(
      '/directions',
      { method: 'GET' }
    );
    return response.directions;
  },

  // === Assignment Randomizer (Random Number) ===

  /**
   * Получение участников рандомайзера задания
   */
  getRandomizerParticipants: async (assignmentId: string, initData: string): Promise<RandomizerParticipantsResponse> => {
    const response = await fetchApi<{ success: boolean } & RandomizerParticipantsResponse>(
      `/admin/assignments/${assignmentId}/randomizer/participants`,
      { method: 'POST', body: JSON.stringify({ initData }) }
    );
    return {
      participants: response.participants,
      participantsCount: response.participantsCount,
      randomizer: response.randomizer,
    };
  },

  /**
   * Предпросмотр распределения рандомайзера задания
   */
  previewRandomizerDistribution: async (assignmentId: string, initData: string): Promise<RandomizerDistribution[]> => {
    const response = await fetchApi<{ success: boolean; distributions: RandomizerDistribution[] }>(
      `/admin/assignments/${assignmentId}/randomizer/preview`,
      { method: 'POST', body: JSON.stringify({ initData }) }
    );
    return response.distributions;
  },

  /**
   * Получение сохраненного предпросмотра
   */
  getRandomizerPreview: async (assignmentId: string, initData: string): Promise<{ distributions: RandomizerDistribution[]; randomizer: RandomizerQuestion }> => {
    const response = await fetchApi<{ success: boolean; distributions: RandomizerDistribution[]; randomizer: RandomizerQuestion }>(
      `/admin/assignments/${assignmentId}/randomizer/preview/get`,
      { method: 'POST', body: JSON.stringify({ initData }) }
    );
    return { distributions: response.distributions, randomizer: response.randomizer };
  },

  /**
   * Обновление стола участника в предпросмотре
   */
  updateRandomizerDistribution: async (assignmentId: string, userId: string, tableNumber: number, initData: string): Promise<RandomizerDistribution> => {
    const response = await fetchApi<{ success: boolean; distribution: RandomizerDistribution }>(
      `/admin/assignments/${assignmentId}/randomizer/distribution`,
      { method: 'PATCH', body: JSON.stringify({ initData, userId, tableNumber }) }
    );
    return response.distribution;
  },

  /**
   * Публикация распределения рандомайзера задания
   */
  publishRandomizerDistribution: async (assignmentId: string, initData: string): Promise<{ distributions: RandomizerDistribution[]; awardedCount: number }> => {
    const response = await fetchApi<{ success: boolean; distributions: RandomizerDistribution[]; awardedCount: number }>(
      `/admin/assignments/${assignmentId}/randomizer/publish`,
      { method: 'POST', body: JSON.stringify({ initData }) }
    );
    return { distributions: response.distributions, awardedCount: response.awardedCount };
  }
};
