import { supabase } from './supabase';
import { TargetedQuestion, CreateTargetedQuestionDto, TargetedAnswer } from '../types';

export class TargetedQuestionService {
  /**
   * Создание вопроса
   */
  static async createQuestion(data: CreateTargetedQuestionDto): Promise<TargetedQuestion> {
    // Подготавливаем данные для вставки
    const insertData: any = {
      text: data.text,
      type: data.type,
      target_audience: data.target_audience,
      char_limit: data.char_limit || null,
      reflection_points: data.reflection_points || 1,
      status: data.status || 'published',
    };

    // Обработка options: для рандомайзера null, для других типов - массив или null
    if (data.type === 'randomizer') {
      insertData.options = null;
    } else if (data.options && data.options.length > 0) {
      insertData.options = data.options.filter((o: string) => o.trim());
    } else {
      insertData.options = null;
    }

    // Обработка target_values: пустой массив -> null
    if (data.target_values && data.target_values.length > 0) {
      insertData.target_values = data.target_values;
    } else {
      insertData.target_values = null;
    }

    const { data: question, error } = await supabase
      .from('targeted_questions')
      .insert(insertData)
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
   * Возвращает активные вопросы (без ответа) и архивные (с ответом)
   */
  static async getQuestionsForUser(userId: string, userDirection?: string): Promise<{
    activeQuestions: TargetedQuestion[];
    answeredQuestions: TargetedQuestion[];
  }> {
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
    const filteredQuestions = (questions as TargetedQuestion[]).filter(q => {
      if (q.target_audience === 'all') return true;
      if (q.target_audience === 'by_direction' && userDirection) {
        return q.target_values?.includes(userDirection);
      }
      if (q.target_audience === 'individual') {
        return q.target_values?.includes(userId);
      }
      return false;
    });

    // Получаем ответы пользователя
    const userAnswers = await this.getUserAnswers(userId);
    const answeredQuestionIds = new Set(userAnswers.map(a => a.question_id));

    // Разделяем на активные и архивные
    const activeQuestions = filteredQuestions.filter(q => !answeredQuestionIds.has(q.id));
    const answeredQuestions = filteredQuestions.filter(q => answeredQuestionIds.has(q.id));

    return {
      activeQuestions,
      answeredQuestions
    };
  }

  /**
   * Получение активных вопросов для пользователя (без ответов)
   */
  static async getActiveQuestions(userId: string, userDirection?: string): Promise<TargetedQuestion[]> {
    const { activeQuestions } = await this.getQuestionsForUser(userId, userDirection);
    return activeQuestions;
  }

  /**
   * Получение архивных вопросов для пользователя (с ответами)
   */
  static async getAnsweredQuestions(userId: string, userDirection?: string): Promise<TargetedQuestion[]> {
    const { answeredQuestions } = await this.getQuestionsForUser(userId, userDirection);
    return answeredQuestions;
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
    // Подготавливаем данные для обновления
    const updateData: any = {};

    if (data.text !== undefined) updateData.text = data.text;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.target_audience !== undefined) updateData.target_audience = data.target_audience;
    if (data.char_limit !== undefined) updateData.char_limit = data.char_limit || null;
    if (data.reflection_points !== undefined) updateData.reflection_points = data.reflection_points;
    if (data.status !== undefined) updateData.status = data.status;

    // Обработка options: для рандомайзера null, для других типов - массив или null
    if (data.options !== undefined) {
      if (data.type === 'randomizer' || (data.type === undefined && data.options.length === 0)) {
        updateData.options = null;
      } else if (data.options.length > 0) {
        updateData.options = data.options.filter((o: string) => o.trim());
      } else {
        updateData.options = null;
      }
    }

    // Обработка target_values: пустой массив -> null
    if (data.target_values !== undefined) {
      if (data.target_values.length > 0) {
        updateData.target_values = data.target_values;
      } else {
        updateData.target_values = null;
      }
    }

    const { data: question, error } = await supabase
      .from('targeted_questions')
      .update(updateData)
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
