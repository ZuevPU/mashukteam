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

  /**
   * Получение вопроса по ID
   */
  static async getQuestionById(id: string): Promise<TargetedQuestion | null> {
    const { data, error } = await supabase
      .from('targeted_questions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error getting targeted question:', error);
      throw error;
    }

    return data as TargetedQuestion;
  }

  /**
   * Получение всех вопросов (для админа)
   */
  static async getAllQuestions(): Promise<TargetedQuestion[]> {
    const { data, error } = await supabase
      .from('targeted_questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting all targeted questions:', error);
      throw error;
    }

    return data as TargetedQuestion[];
  }

  /**
   * Получение ответов на вопрос (для админа)
   */
  static async getAnswersForQuestion(questionId: string): Promise<TargetedAnswer[]> {
    const { data, error } = await supabase
      .from('targeted_answers')
      .select('*, user:users(id, first_name, last_name, telegram_username)')
      .eq('question_id', questionId);

    if (error) {
      console.error('Error getting answers for question:', error);
      throw error;
    }

    return data as TargetedAnswer[];
  }

  /**
   * Получение всех ответов пользователя на targeted вопросы (для карточки админа)
   */
  static async getAllUserAnswers(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('targeted_answers')
      .select('*, question:targeted_questions(id, text, type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting all user targeted answers:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Получение всех ответов с деталями (для админа - "Проверить ответы")
   */
  static async getAllAnswersWithDetails(): Promise<any[]> {
    const { data, error } = await supabase
      .from('targeted_answers')
      .select('*, user:users(id, first_name, last_name, telegram_username), question:targeted_questions(id, text, type)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting all targeted answers with details:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Обновление вопроса
   */
  static async updateQuestion(id: string, data: Partial<CreateTargetedQuestionDto>): Promise<TargetedQuestion> {
    const { data: question, error } = await supabase
      .from('targeted_questions')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating targeted question:', error);
      throw error;
    }

    return question as TargetedQuestion;
  }

  /**
   * Удаление вопроса
   */
  static async deleteQuestion(id: string): Promise<void> {
    const { error } = await supabase
      .from('targeted_questions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting targeted question:', error);
      throw error;
    }
  }
}
