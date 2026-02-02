import { supabase } from './supabase';
import { CreateEventDto, CreateQuestionDto, Event, Question, Answer, SubmitAnswerDto } from '../types';

export class EventService {
  /**
   * Создание мероприятия
   */
  static async createEvent(data: CreateEventDto): Promise<Event> {
    const { data: event, error } = await supabase
      .from('events')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      throw error;
    }

    return event as Event;
  }

  /**
   * Обновление мероприятия
   */
  static async updateEvent(id: string, data: Partial<CreateEventDto>): Promise<Event> {
    const { data: event, error } = await supabase
      .from('events')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      throw error;
    }

    return event as Event;
  }

  /**
   * Удаление мероприятия
   */
  static async deleteEvent(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting event:', error);
      throw error;
    }

    return true;
  }

  /**
   * Получение списка всех мероприятий (для админки)
   */
  static async getAllEvents(): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('group_order', { ascending: true, nullsFirst: false })
      .order('event_order', { ascending: true, nullsFirst: false })
      .order('event_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting events:', error);
      throw error;
    }

    return data as Event[];
  }

  /**
   * Получение опубликованных мероприятий (для пользователей)
   */
  static async getPublishedEvents(): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .in('status', ['published', 'completed'])
      // Сортировка: сначала по группе, потом по порядку внутри группы, потом по дате
      .order('group_order', { ascending: true, nullsFirst: false })
      .order('event_order', { ascending: true, nullsFirst: false })
      .order('event_date', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error getting published events:', error);
      throw error;
    }
    
    return data as Event[];
  }

  /**
   * Получение мероприятия по ID
   */
  static async getEventById(id: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as Event;
  }

  /**
   * Добавление вопроса к мероприятию
   */
  static async addQuestion(eventId: string, data: CreateQuestionDto): Promise<Question> {
    const { data: question, error } = await supabase
      .from('questions')
      .insert({
        event_id: eventId,
        ...data
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating question:', error);
      throw error;
    }

    return question as Question;
  }

  /**
   * Получение вопросов мероприятия
   */
  static async getEventQuestions(eventId: string): Promise<Question[]> {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('event_id', eventId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error getting questions:', error);
      throw error;
    }

    return data as Question[];
  }

  /**
   * Сохранение ответа пользователя
   */
  static async submitAnswer(userId: string, eventId: string, data: SubmitAnswerDto): Promise<Answer> {
    // Проверка, отвечал ли уже пользователь на этот вопрос
    const { data: existingAnswer } = await supabase
      .from('answers')
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('question_id', data.question_id)
      .single();

    if (existingAnswer) {
      throw new Error('Вы уже ответили на этот вопрос');
    }

    const { data: answer, error } = await supabase
      .from('answers')
      .insert({
        user_id: userId,
        event_id: eventId,
        question_id: data.question_id,
        answer_data: data.answer_data
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }

    return answer as Answer;
  }

  /**
   * Получение ответов пользователя
   */
  static async getUserAnswers(userId: string): Promise<Answer[]> {
    const { data, error } = await supabase
      .from('answers')
      .select('*, questions(*), events(title, type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting user answers:', error);
      throw error;
    }

    return data as any;
  }

  /**
   * Получение ответов пользователя на конкретное событие
   */
  static async getUserEventAnswers(userId: string, eventId: string): Promise<Answer[]> {
    const { data, error } = await supabase
      .from('answers')
      .select('*')
      .eq('user_id', userId)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error getting user event answers:', error);
      throw error;
    }

    return data as Answer[];
  }

  /**
   * Получение аналитики по мероприятию (Все ответы)
   */
  static async getEventAnalytics(eventId: string): Promise<{
    questions: Question[];
    answers: Answer[];
  }> {
    // 1. Получаем вопросы
    const questions = await this.getEventQuestions(eventId);

    // 2. Получаем все ответы для этого события
    const { data: answers, error } = await supabase
      .from('answers')
      .select('*')
      .eq('event_id', eventId);

    if (error) {
      console.error('Error getting analytics answers:', error);
      throw error;
    }

    return {
      questions,
      answers: answers as Answer[]
    };
  }
}
