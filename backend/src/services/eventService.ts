import { supabase } from './supabase';
import { CreateEventDto, Event } from '../types';

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
    const { data, error } = await supabase
      .from('event_notes')
      .upsert({
        user_id: userId,
        event_id: eventId,
        note_text: noteText,
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

}
