import { fetchApi } from './api';
import { Assignment, AssignmentSubmission, RandomizerQuestion, RandomizerDistribution } from '../types';

export interface RandomizerForUserResponse {
  randomizer: RandomizerQuestion;
  isParticipant: boolean;
  distribution?: RandomizerDistribution;
  participantsCount: number;
}

export interface RandomizerParticipantsResponse {
  participants: Array<{
    id: string;
    randomizer_id: string;
    user_id: string;
    participated_at: string;
    user: {
      id: string;
      first_name: string;
      last_name: string;
      middle_name?: string | null;
      telegram_username?: string;
    };
  }>;
  participantsCount: number;
  randomizer: RandomizerQuestion;
}

export const assignmentApi = {
  /**
   * Получение заданий для текущего пользователя
   */
  getMyAssignments: async (initData: string): Promise<Assignment[]> => {
    const response = await fetchApi<{ success: boolean; assignments: Assignment[] }>(
      '/assignments/my',
      { method: 'POST', body: JSON.stringify({ initData }) }
    );
    return response.assignments;
  },

  /**
   * Отправка ответа на задание
   */
  submitAssignment: async (assignmentId: string, content: string, initData: string, file_url?: string): Promise<AssignmentSubmission> => {
    const body: any = { initData, content };
    if (file_url) {
      body.file_url = file_url;
    }
    const response = await fetchApi<{ success: boolean; submission: AssignmentSubmission }>(
      `/assignments/${assignmentId}/submit`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    return response.submission;
  },

  /**
   * Получение своих ответов
   */
  getMySubmissions: async (initData: string): Promise<AssignmentSubmission[]> => {
    const response = await fetchApi<{ success: boolean; submissions: AssignmentSubmission[] }>(
      '/assignments/submissions',
      { method: 'POST', body: JSON.stringify({ initData }) }
    );
    return response.submissions;
  },

  /**
   * Получение задания по ID
   */
  getAssignmentById: async (assignmentId: string, initData: string): Promise<Assignment | null> => {
    try {
      const assignments = await assignmentApi.getMyAssignments(initData);
      return assignments.find(a => a.id === assignmentId) || null;
    } catch (error) {
      console.error('Error getting assignment by ID:', error);
      return null;
    }
  },

  // === Randomizer (Random Number) для заданий ===

  /**
   * Участие в случайном числе задания
   */
  participateInRandomNumber: async (assignmentId: string, initData: string): Promise<{ participantId: string; randomizerId: string }> => {
    const response = await fetchApi<{ success: boolean; participantId: string; randomizerId: string }>(
      `/assignments/${assignmentId}/participate`,
      { method: 'POST', body: JSON.stringify({ initData }) }
    );
    return { participantId: response.participantId, randomizerId: response.randomizerId };
  },

  /**
   * Получение рандомайзера по ID задания
   */
  getRandomizerByAssignment: async (assignmentId: string, initData: string): Promise<RandomizerForUserResponse> => {
    const response = await fetchApi<{ success: boolean } & RandomizerForUserResponse>(
      `/assignments/${assignmentId}/randomizer`,
      { method: 'POST', body: JSON.stringify({ initData }) }
    );
    return {
      randomizer: response.randomizer,
      isParticipant: response.isParticipant,
      distribution: response.distribution,
      participantsCount: response.participantsCount,
    };
  }
};
