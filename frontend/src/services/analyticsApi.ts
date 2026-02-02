import { buildApiEndpoint } from '../utils/apiUrl';

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

export interface UserActivityStats {
  totalUsers: number;
  activeUsers: number;
  averageAnswersPerUser: number;
  totalAnswers: number;
  totalEventAnswers: number;
  totalDiagnosticAnswers: number;
  totalTargetedAnswers: number;
  totalSubmissions: number;
}

export interface DirectionStats {
  directionId: string;
  directionName: string;
  userCount: number;
  totalAnswers: number;
  totalSubmissions: number;
  averageAnswersPerUser: number;
}

export interface EventParticipationStats {
  eventId: string;
  eventTitle: string;
  eventType: 'event' | 'diagnostic';
  participantsCount: number;
  answersCount: number;
  questionsCount: number;
  participationRate: number;
}

export interface QuestionAnswerStats {
  questionId: string;
  questionText: string;
  questionType: string;
  answersCount: number;
  uniqueUsersCount: number;
}

export const analyticsApi = {
  /**
   * Получение статистики активности пользователей
   */
  getUserActivity: async (
    initData: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<UserActivityStats> => {
    const response = await fetchApi<{ success: boolean; stats: UserActivityStats }>(
      '/admin/analytics/user-activity',
      {
        method: 'POST',
        body: JSON.stringify({ initData, dateFrom, dateTo }),
      }
    );
    return response.stats;
  },

  /**
   * Получение статистики по направлениям
   */
  getDirectionStats: async (initData: string): Promise<DirectionStats[]> => {
    const response = await fetchApi<{ success: boolean; stats: DirectionStats[] }>(
      '/admin/analytics/directions',
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }
    );
    return response.stats;
  },

  /**
   * Получение статистики по мероприятиям
   */
  getEventStats: async (eventId?: string, initData?: string): Promise<EventParticipationStats[]> => {
    const response = await fetchApi<{ success: boolean; stats: EventParticipationStats[] }>(
      '/admin/analytics/events',
      {
        method: 'POST',
        body: JSON.stringify({ initData, eventId }),
      }
    );
    return response.stats;
  },

  /**
   * Получение статистики по вопросам
   */
  getQuestionStats: async (questionId?: string, initData?: string): Promise<QuestionAnswerStats[]> => {
    const response = await fetchApi<{ success: boolean; stats: QuestionAnswerStats[] }>(
      '/admin/analytics/questions',
      {
        method: 'POST',
        body: JSON.stringify({ initData, questionId }),
      }
    );
    return response.stats;
  },
};
