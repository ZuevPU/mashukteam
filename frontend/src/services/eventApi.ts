import { fetchApiWithAuth, fetchApi } from './api';
import { Event, Question, Answer } from '../types';

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
   * Получение деталей мероприятия с вопросами
   */
  getEventDetails: async (
    id: string,
    initData: string
  ): Promise<{ event: Event; questions: Question[] }> => {
    const response = await fetchApiWithAuth<{
      success: boolean;
      event: Event;
      questions: Question[];
    }>(`/events/${id}/details`, initData);
    
    return { event: response.event, questions: response.questions };
  },

  /**
   * Отправка ответа на вопрос
   */
  submitAnswer: async (
    eventId: string,
    questionId: string,
    answerData: any,
    initData: string
  ): Promise<Answer> => {
    const response = await fetchApi<{ success: boolean; answer: Answer }>(
      `/events/${eventId}/answers`,
      {
        method: 'POST',
        body: JSON.stringify({
          initData,
          question_id: questionId,
          answer_data: answerData,
        }),
      }
    );
    return response.answer;
  },

  /**
   * Получение истории ответов пользователя
   */
  getMyAnswers: async (initData: string): Promise<Answer[]> => {
    const response = await fetchApiWithAuth<{ success: boolean; answers: Answer[] }>(
      '/user/my-answers',
      initData
    );
    return response.answers;
  },
};
