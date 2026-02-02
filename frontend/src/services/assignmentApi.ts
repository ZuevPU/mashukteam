import { fetchApi } from './api';
import { Assignment, AssignmentSubmission } from '../types';

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
  submitAssignment: async (assignmentId: string, content: string, initData: string): Promise<AssignmentSubmission> => {
    const response = await fetchApi<{ success: boolean; submission: AssignmentSubmission }>(
      `/assignments/${assignmentId}/submit`,
      { method: 'POST', body: JSON.stringify({ initData, content }) }
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
  }
};
