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
  directionCode: string;
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

export interface GamificationStats {
  totalPoints: number;
  averagePointsPerUser: number;
  totalAchievements: number;
  unlockedAchievements: number;
  topUsers: Array<{
    userId: string;
    userName: string;
    points: number;
    achievements: number;
  }>;
}

export interface AssignmentStats {
  totalAssignments: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  pendingSubmissions: number;
  averageReward: number;
}

export interface RegistrationTrend {
  date: string;
  count: number;
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

  /**
   * Получение статистики по баллам и достижениям
   */
  getGamificationStats: async (initData: string): Promise<GamificationStats> => {
    const response = await fetchApi<{ success: boolean; stats: GamificationStats }>(
      '/admin/analytics/gamification',
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }
    );
    return response.stats;
  },

  /**
   * Получение статистики по заданиям
   */
  getAssignmentStats: async (initData: string): Promise<AssignmentStats> => {
    const response = await fetchApi<{ success: boolean; stats: AssignmentStats }>(
      '/admin/analytics/assignments',
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }
    );
    return response.stats;
  },

  /**
   * Получение динамики регистраций
   */
  getRegistrationTrend: async (initData: string, days?: number): Promise<RegistrationTrend[]> => {
    const response = await fetchApi<{ success: boolean; trend: RegistrationTrend[] }>(
      '/admin/analytics/registration-trend',
      {
        method: 'POST',
        body: JSON.stringify({ initData, days }),
      }
    );
    return response.trend;
  },
};
