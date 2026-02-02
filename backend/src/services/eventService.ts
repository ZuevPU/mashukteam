import { supabase } from './supabase';
import { CreateEventDto, Event, Question, Answer } from '../types';

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
   * Сохранение или обновление заметки пользователя по мероприятию
   */
  static async saveEventNote(userId: string, eventId: string, noteText: string): Promise<{ id: string; note_text: string }> {
    // Если заметка пустая, удаляем её
    if (!noteText || noteText.trim() === '') {
      const { error: deleteError } = await supabase
        .from('event_notes')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId);
      
      if (deleteError) {
        console.error('Error deleting empty event note:', deleteError);
        throw deleteError;
      }
      
      // Возвращаем null для пустой заметки
      return { id: '', note_text: '' };
    }

    const { data, error } = await supabase
      .from('event_notes')
      .upsert({
        user_id: userId,
        event_id: eventId,
        note_text: noteText.trim(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,event_id'
      })
      .select('id, note_text')
      .single();

    if (error) {
      console.error('Error saving event note:', error);
      throw error;
    }

    return data as { id: string; note_text: string };
  }

  /**
   * Получение заметки пользователя по мероприятию
   */
  static async getEventNote(userId: string, eventId: string): Promise<{ id: string; note_text: string } | null> {
    const { data, error } = await supabase
      .from('event_notes')
      .select('id, note_text')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error getting event note:', error);
      throw error;
    }

    return data as { id: string; note_text: string };
  }

  /**
   * Получение всех заметок пользователя по мероприятиям
   */
  static async getUserEventNotes(userId: string): Promise<Array<{ id: string; event_id: string; note_text: string; event: { id: string; title: string; event_date?: string } }>> {
    const { data, error } = await supabase
      .from('event_notes')
      .select('id, event_id, note_text, event:events!inner(id, title, event_date)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error getting user event notes:', error);
      throw error;
    }

    // Преобразуем данные, так как event может быть массивом из-за join
    return (data || []).map((note: any) => ({
      id: note.id,
      event_id: note.event_id,
      note_text: note.note_text,
      event: Array.isArray(note.event) ? note.event[0] : note.event
    })) as Array<{ id: string; event_id: string; note_text: string; event: { id: string; title: string; event_date?: string } }>;
  }

  /**
   * Получение вопросов диагностики для пользователя
   */
  static async getDiagnosticQuestions(eventId: string, userId: string): Promise<{ event: Event; questions: Question[]; userAnswers: Answer[] }> {
    // Проверяем, что это диагностика
    const event = await this.getEventById(eventId);
    if (!event || event.type !== 'diagnostic') {
      throw new Error('Диагностика не найдена');
    }

    // Получаем вопросы диагностики
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('event_id', eventId)
      .order('order_index', { ascending: true });

    if (questionsError) {
      console.error('Error getting diagnostic questions:', questionsError);
      throw questionsError;
    }

    // Преобразуем questions
    const questions = (questionsData || []).map((q: any) => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null,
    })) as Question[];

    // Получаем ответы пользователя на эту диагностику
    const { data: answersData, error: answersError } = await supabase
      .from('answers')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (answersError) {
      console.error('Error getting user answers:', answersError);
      throw answersError;
    }

    return {
      event,
      questions,
      userAnswers: (answersData || []) as Answer[]
    };
  }

  /**
   * Отправка ответа на вопрос диагностики
   */
  static async submitDiagnosticAnswer(userId: string, eventId: string, questionId: string, answerData: any): Promise<Answer> {
    // Проверяем, что это диагностика
    const event = await this.getEventById(eventId);
    if (!event || event.type !== 'diagnostic') {
      throw new Error('Диагностика не найдена');
    }

    // Проверяем, не ответил ли уже пользователь на этот вопрос
    const { data: existingAnswer } = await supabase
      .from('answers')
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('question_id', questionId)
      .single();

    if (existingAnswer) {
      // Обновляем существующий ответ
      const { data: answer, error } = await supabase
        .from('answers')
        .update({
          answer_data: answerData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAnswer.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating diagnostic answer:', error);
        throw error;
      }

      return answer as Answer;
    } else {
      // Создаем новый ответ
      const { data: answer, error } = await supabase
        .from('answers')
        .insert({
          user_id: userId,
          event_id: eventId,
          question_id: questionId,
          answer_data: answerData
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating diagnostic answer:', error);
        throw error;
      }

      return answer as Answer;
    }
  }

}
