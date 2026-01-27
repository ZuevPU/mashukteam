import { supabase } from './supabase';
import { TargetedQuestion, CreateTargetedQuestionDto, TargetedAnswer } from '../types';

export class TargetedQuestionService {
  /**
   * Создание вопроса
   */
  static async createQuestion(data: CreateTargetedQuestionDto): Promise<TargetedQuestion> {
    const { data: question, error } = await supabase
      .from('targeted_questions')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error creating targeted question:', error);
      throw error;
    }

    return question as TargetedQuestion;
  }

  /**
   * Получение вопросов для пользователя (с учетом таргетинга)
   */
  static async getQuestionsForUser(userId: string, userType?: string): Promise<TargetedQuestion[]> {
    // Получаем все опубликованные вопросы
    const { data: questions, error } = await supabase
      .from('targeted_questions')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting targeted questions:', error);
      throw error;
    }

    // Фильтрация на бэкенде (так как сложная логика JSONB)
    return (questions as TargetedQuestion[]).filter(q => {
      if (q.target_audience === 'all') return true;
      if (q.target_audience === 'by_type' && userType) {
        return q.target_values?.includes(userType);
      }
      if (q.target_audience === 'individual') {
        return q.target_values?.includes(userId);
      }
      return false;
    });
  }

  /**
   * Сохранение ответа
   */
  static async submitAnswer(userId: string, questionId: string, answerData: any): Promise<TargetedAnswer> {
    const { data: answer, error } = await supabase
      .from('targeted_answers')
      .insert({
        user_id: userId,
        question_id: questionId,
        answer_data: answerData
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting targeted answer:', error);
      throw error;
    }

    return answer as TargetedAnswer;
  }

  /**
   * Получение ответов пользователя
   */
  static async getUserAnswers(userId: string): Promise<TargetedAnswer[]> {
    const { data, error } = await supabase
      .from('targeted_answers')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting targeted answers:', error);
      throw error;
    }

    return data as TargetedAnswer[];
  }
}
