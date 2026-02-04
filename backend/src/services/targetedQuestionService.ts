import { supabase } from './supabase';
import { TargetedQuestion, CreateTargetedQuestionDto, TargetedAnswer } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class TargetedQuestionService {
  /**
   * Создание вопроса
   */
  static async createQuestion(data: CreateTargetedQuestionDto): Promise<TargetedQuestion> {
    // #region agent log
    try{const logPath=path.join(process.cwd(),'.cursor','debug.log');const logEntry={id:`log_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,timestamp:Date.now(),location:'targetedQuestionService.ts:8',message:'createQuestion entry',data:{type:data.type,hasOptions:!!data.options,optionsLength:data.options?.length,targetAudience:data.target_audience,hasTargetValues:!!data.target_values,targetValuesLength:data.target_values?.length,reflectionPoints:data.reflection_points},sessionId:'debug-session',runId:'run1',hypothesisId:'A'};fs.appendFileSync(logPath,JSON.stringify(logEntry)+'\n');}catch(e){}
    // #endregion
    // Подготавливаем данные для вставки
    const insertData: any = {
      text: data.text,
      type: data.type,
      target_audience: data.target_audience,
      char_limit: data.char_limit || null,
      reflection_points: data.reflection_points || 1,
      status: data.status || 'draft',
      group_name: data.group_name || null,
      group_order: data.group_order ?? 0,
      question_order: data.question_order ?? 0,
    };

    // Добавляем scheduled_at если указано
    if (data.scheduled_at) {
      insertData.scheduled_at = data.scheduled_at;
    }

    // Сохраняем флаг send_notification для scheduler
    if (data.send_notification !== undefined) {
      insertData.send_notification = data.send_notification;
    }

    // Добавляем поля шаблона если указаны
    if (data.is_template) {
      insertData.is_template = true;
      insertData.template_name = data.template_name || null;
    }
    if (data.template_id) {
      insertData.template_id = data.template_id;
    }
    if (data.instance_number) {
      insertData.instance_number = data.instance_number;
    }

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

    // #region agent log
    try{const logPath=path.join(process.cwd(),'.cursor','debug.log');const logEntry={id:`log_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,timestamp:Date.now(),location:'targetedQuestionService.ts:35',message:'before insert',data:{insertDataType:insertData.type,insertDataOptions:insertData.options,insertDataTargetValues:insertData.target_values,insertDataReflectionPoints:insertData.reflection_points,insertDataStatus:insertData.status},sessionId:'debug-session',runId:'run1',hypothesisId:'A'};fs.appendFileSync(logPath,JSON.stringify(logEntry)+'\n');}catch(e){}
    // #endregion

    const { data: question, error } = await supabase
      .from('targeted_questions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // #region agent log
      try{const logPath=path.join(process.cwd(),'.cursor','debug.log');const logEntry={id:`log_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,timestamp:Date.now(),location:'targetedQuestionService.ts:42',message:'insert error',data:{errorCode:error.code,errorMessage:error.message,errorDetails:error.details,errorHint:error.hint,insertDataType:insertData.type},sessionId:'debug-session',runId:'run1',hypothesisId:'A'};fs.appendFileSync(logPath,JSON.stringify(logEntry)+'\n');}catch(e){}
      // #endregion
      console.error('Error creating targeted question:', error);
      throw error;
    }

    // #region agent log
    try{const logPath=path.join(process.cwd(),'.cursor','debug.log');const logEntry={id:`log_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,timestamp:Date.now(),location:'targetedQuestionService.ts:46',message:'createQuestion success',data:{questionId:question?.id,questionType:question?.type},sessionId:'debug-session',runId:'run1',hypothesisId:'A'};fs.appendFileSync(logPath,JSON.stringify(logEntry)+'\n');}catch(e){}
    // #endregion

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
    // Получаем все опубликованные вопросы, сортируем по группам
    // Исключаем шаблоны (is_template = true) - они не показываются пользователям
    const { data: questions, error } = await supabase
      .from('targeted_questions')
      .select('*')
      .eq('status', 'published')
      .or('is_template.is.null,is_template.eq.false') // Исключаем шаблоны
      .order('group_order', { ascending: true })
      .order('question_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting targeted questions:', error);
      throw error;
    }

    // Фильтрация на бэкенде (так как сложная логика JSONB)
    const filteredQuestions = (questions as TargetedQuestion[]).filter(q => {
      // Дополнительная проверка: не показываем шаблоны
      if (q.is_template) return false;
      
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
      .order('group_order', { ascending: true })
      .order('question_order', { ascending: true })
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
    
    // Обработка полей порядка
    if (data.group_name !== undefined) updateData.group_name = data.group_name || null;
    if (data.group_order !== undefined) updateData.group_order = data.group_order ?? 0;
    if (data.question_order !== undefined) updateData.question_order = data.question_order ?? 0;

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
    // Сначала удаляем все связанные данные
    
    // 1. Получаем рандомайзер если он есть (старый способ — рандомайзер привязан к вопросу)
    const { data: randomizer } = await supabase
      .from('randomizer_questions')
      .select('id')
      .eq('question_id', id)
      .single();

    if (randomizer) {
      // 2. Удаляем распределения рандомайзера
      await supabase
        .from('randomizer_distributions')
        .delete()
        .eq('randomizer_id', randomizer.id);

      // 3. Удаляем участников рандомайзера
      await supabase
        .from('randomizer_participants')
        .delete()
        .eq('randomizer_id', randomizer.id);

      // 4. Удаляем сам рандомайзер
      await supabase
        .from('randomizer_questions')
        .delete()
        .eq('question_id', id);
    }

    // 5. Удаляем все ответы на вопрос
    await supabase
      .from('targeted_answers')
      .delete()
      .eq('question_id', id);

    // 6. Наконец удаляем сам вопрос
    const { error } = await supabase
      .from('targeted_questions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting targeted question:', error);
      throw error;
    }
  }

  // ==================== Методы для шаблонных вопросов ====================

  /**
   * Получение всех шаблонов (для админа)
   */
  static async getTemplates(): Promise<TargetedQuestion[]> {
    const { data, error } = await supabase
      .from('targeted_questions')
      .select('*')
      .eq('is_template', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting templates:', error);
      throw error;
    }

    return data as TargetedQuestion[];
  }

  /**
   * Получение следующего номера экземпляра для шаблона
   */
  static async getNextInstanceNumber(templateId: string): Promise<number> {
    const { data, error } = await supabase
      .from('targeted_questions')
      .select('instance_number')
      .eq('template_id', templateId)
      .order('instance_number', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error getting next instance number:', error);
      throw error;
    }

    if (data && data.length > 0 && data[0].instance_number) {
      return data[0].instance_number + 1;
    }

    return 1;
  }

  /**
   * Получение количества экземпляров шаблона
   */
  static async getTemplateInstancesCount(templateId: string): Promise<number> {
    const { count, error } = await supabase
      .from('targeted_questions')
      .select('*', { count: 'exact', head: true })
      .eq('template_id', templateId);

    if (error) {
      console.error('Error getting template instances count:', error);
      throw error;
    }

    return count || 0;
  }

  /**
   * Публикация экземпляра шаблона
   * Создаёт новый вопрос на основе шаблона с автоматическим номером
   */
  static async publishTemplateInstance(templateId: string): Promise<TargetedQuestion> {
    // 1. Получаем шаблон
    const template = await this.getQuestionById(templateId);
    if (!template) {
      throw new Error('Шаблон не найден');
    }
    if (!template.is_template) {
      throw new Error('Указанный вопрос не является шаблоном');
    }

    // 2. Получаем следующий номер экземпляра
    const instanceNumber = await this.getNextInstanceNumber(templateId);

    // 3. Создаём новый вопрос-экземпляр
    const insertData: any = {
      text: template.text, // Оригинальный текст вопроса
      type: template.type,
      target_audience: template.target_audience,
      char_limit: template.char_limit || null,
      reflection_points: template.reflection_points || 1,
      status: 'published', // Сразу публикуем
      group_name: template.group_name || null,
      group_order: template.group_order ?? 0,
      question_order: template.question_order ?? 0,
      options: template.options || null,
      target_values: template.target_values || null,
      // Поля шаблона
      is_template: false, // Это экземпляр, не шаблон
      template_id: templateId,
      template_name: template.template_name,
      instance_number: instanceNumber,
    };

    const { data: instance, error } = await supabase
      .from('targeted_questions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating template instance:', error);
      throw error;
    }

    return instance as TargetedQuestion;
  }

  /**
   * Получение всех экземпляров шаблона
   */
  static async getTemplateInstances(templateId: string): Promise<TargetedQuestion[]> {
    const { data, error } = await supabase
      .from('targeted_questions')
      .select('*')
      .eq('template_id', templateId)
      .order('instance_number', { ascending: true });

    if (error) {
      console.error('Error getting template instances:', error);
      throw error;
    }

    return data as TargetedQuestion[];
  }
}
