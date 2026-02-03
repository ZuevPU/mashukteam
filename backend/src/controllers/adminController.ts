import { Request, Response } from 'express';
import { EventService } from '../services/eventService';
import { UserService, supabase } from '../services/supabase';
import { TargetedQuestionService } from '../services/targetedQuestionService';
import { AssignmentService } from '../services/assignmentService';
import { DirectionService } from '../services/directionService';
import { notifyNewEvent, notifyNewDiagnostic } from '../utils/telegramBot';
import { logger } from '../utils/logger';
import { Question, CreateQuestionDto } from '../types';

export class AdminController {
  /**
   * Создание мероприятия
   */
  static async createEvent(req: Request, res: Response) {
    try {
      // Извлекаем initData и оставляем только данные события
      const { initData, ...eventData } = req.body;
      
      logger.debug('Creating event', { eventData });
      
      const event = await EventService.createEvent(eventData);

      // Отправка уведомления только если мероприятие опубликовано
      if (event.status === 'published' && (process.env.NODE_ENV === 'production' || process.env.ENABLE_NOTIFICATIONS === 'true')) {
        if (event.type === 'diagnostic') {
          notifyNewDiagnostic(event.title, event.id).catch((err) => 
            logger.error('Error sending diagnostic notification', err instanceof Error ? err : new Error(String(err)))
          );
        } else {
          notifyNewEvent(event.title, event.id).catch((err) => 
            logger.error('Error sending event notification', err instanceof Error ? err : new Error(String(err)))
          );
        }
      }

      return res.status(201).json({ success: true, event });
    } catch (error) {
      logger.error('Create event error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при создании программы' });
    }
  }

  /**
   * Обновление мероприятия
   */
  static async updateEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Извлекаем initData и оставляем только данные для обновления
      const { initData, ...updates } = req.body;
      
      // Получаем текущее состояние мероприятия для проверки изменения статуса
      const currentEvent = await EventService.getEventById(id);
      const wasPublished = currentEvent?.status === 'published';
      
      const event = await EventService.updateEvent(id, updates);
      
      // Отправка уведомления, если статус изменился на published
      if (updates.status === 'published' && !wasPublished && (process.env.NODE_ENV === 'production' || process.env.ENABLE_NOTIFICATIONS === 'true')) {
        if (event.type === 'diagnostic') {
          notifyNewDiagnostic(event.title, event.id).catch((err) => 
            logger.error('Error sending diagnostic notification', err instanceof Error ? err : new Error(String(err)))
          );
        } else {
          notifyNewEvent(event.title, event.id).catch((err) => 
            logger.error('Error sending event notification', err instanceof Error ? err : new Error(String(err)))
          );
        }
      }
      
      return res.json({ success: true, event });
    } catch (error) {
      logger.error('Update event error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при обновлении программы' });
    }
  }

  /**
   * Удаление мероприятия
   */
  static async deleteEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await EventService.deleteEvent(id);
      return res.json({ success: true, message: 'Программа удалена' });
    } catch (error) {
      logger.error('Delete event error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при удалении программы' });
    }
  }


  /**
   * Получение списка пользователей
   */
  static async getAllUsers(req: Request, res: Response) {
    try {
      const users = await UserService.getAllUsers();
      return res.json({ success: true, users });
    } catch (error) {
      logger.error('Get all users error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении пользователей' });
    }
  }

  /**
   * Получение деталей пользователя (включая ответы, targeted вопросы и задания)
   */
  static async getUserDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);
      
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      // Ответы на персональные вопросы
      const targetedAnswers = await TargetedQuestionService.getAllUserAnswers(id);
      
      // Выполненные задания
      const submissions = await AssignmentService.getUserSubmissions(id);

      // Заметки пользователя по мероприятиям
      const { data: eventNotes } = await supabase
        .from('event_notes')
        .select('*, event:events(id, title, event_date)')
        .eq('user_id', id)
        .order('updated_at', { ascending: false });

      // Ответы на мероприятия и диагностики (таблица answers: event_id, question_id, answer_data)
      const { data: answers, error: answersError } = await supabase
        .from('answers')
        .select('id, event_id, question_id, answer_data, created_at, events(id, title, type, event_date), questions(id, text, type)')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (answersError) {
        logger.error('Error fetching user answers', answersError);
      }

      // Нормализуем ответы: Supabase может вернуть events и questions как объекты или массивы при join
      const normalizedAnswers = (answers || []).map((a: any) => ({
        ...a,
        events: Array.isArray(a.events) ? a.events[0] : a.events,
        questions: Array.isArray(a.questions) ? a.questions[0] : a.questions,
      }));

      return res.json({ 
        success: true, 
        user: { 
          ...user, 
          targetedAnswers, 
          submissions, 
          eventNotes: eventNotes || [],
          answers: normalizedAnswers,
        } 
      });
    } catch (error) {
      logger.error('Get user details error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении деталей пользователя' });
    }
  }

  /**
   * Редактирование пользователя
   */
  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Извлекаем initData
      const { initData, ...updates } = req.body;
      
      const user = await UserService.updateUserByAdmin(id, updates);
      return res.json({ success: true, user });
    } catch (error) {
      logger.error('Update user error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при обновлении пользователя' });
    }
  }

  /**
   * Получение всех событий (для админки)
   */
  static async getAllEvents(req: Request, res: Response) {
    try {
      const events = await EventService.getAllEvents();
      return res.json({ success: true, events });
    } catch (error) {
      logger.error('Get all events error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении программ' });
    }
  }

  /**
   * Получение аналитики мероприятия
   */
  /**
   * Добавление вопроса к диагностике
   */
  static async addQuestionToDiagnostic(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { initData, ...questionData } = req.body;

      // Проверяем, что это диагностика
      const event = await EventService.getEventById(id);
      if (!event) {
        return res.status(404).json({ error: 'Программа не найдена' });
      }
      if (event.type !== 'diagnostic') {
        return res.status(400).json({ error: 'Вопросы можно добавлять только к диагностике' });
      }

      // Получаем максимальный order_index для этого события
      const { data: existingQuestions } = await supabase
        .from('questions')
        .select('order_index')
        .eq('event_id', id)
        .order('order_index', { ascending: false })
        .limit(1);

      const maxOrder = existingQuestions && existingQuestions.length > 0 
        ? (existingQuestions[0] as any).order_index || 0 
        : 0;

      // Создаем вопрос
      const { data: question, error } = await supabase
        .from('questions')
        .insert({
          event_id: id,
          text: questionData.text,
          type: questionData.type,
          options: questionData.options ? JSON.stringify(questionData.options) : null,
          char_limit: questionData.char_limit || null,
          order_index: maxOrder + 1,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error adding question to diagnostic', error instanceof Error ? error : new Error(String(error)));
        return res.status(500).json({ error: 'Ошибка при добавлении вопроса' });
      }

      // Преобразуем options из JSON строки в массив
      const questionWithOptions = {
        ...question,
        options: question.options ? JSON.parse(question.options) : null,
      } as Question;

      return res.status(201).json({ success: true, question: questionWithOptions });
    } catch (error) {
      logger.error('Add question to diagnostic error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при добавлении вопроса' });
    }
  }

  /**
   * Получение аналитики диагностики (вопросы и ответы)
   */
  static async getDiagnosticAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Проверяем, что это диагностика
      const event = await EventService.getEventById(id);
      if (!event) {
        return res.status(404).json({ error: 'Программа не найдена' });
      }
      if (event.type !== 'diagnostic') {
        return res.status(400).json({ error: 'Аналитика доступна только для диагностики' });
      }

      // Получаем вопросы
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('event_id', id)
        .order('order_index', { ascending: true });

      if (questionsError) {
        logger.error('Error getting questions', questionsError instanceof Error ? questionsError : new Error(String(questionsError)));
        return res.status(500).json({ error: 'Ошибка при получении вопросов' });
      }

      // Преобразуем questions
      const questions = (questionsData || []).map((q: any) => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : null,
      })) as Question[];

      // Получаем ответы
      const { data: answersData, error: answersError } = await supabase
        .from('answers')
        .select(`
          *,
          user:users(id, first_name, last_name, telegram_username),
          question:questions(id, text, type, options)
        `)
        .eq('event_id', id)
        .order('created_at', { ascending: false });

      if (answersError) {
        logger.error('Error getting answers', answersError instanceof Error ? answersError : new Error(String(answersError)));
        return res.status(500).json({ error: 'Ошибка при получении ответов' });
      }

      // Преобразуем answers
      const answers = (answersData || []).map((a: any) => ({
        ...a,
        question: a.question ? {
          ...a.question,
          options: a.question.options ? JSON.parse(a.question.options) : null,
        } : null,
      }));

      return res.json({ success: true, questions, answers });
    } catch (error) {
      logger.error('Get diagnostic analytics error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении аналитики' });
    }
  }

  /**
   * Назначение направления пользователю
   */
  static async setUserDirection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { direction } = req.body;
      
      await DirectionService.setUserDirection(id, direction || null);
      const user = await UserService.getUserById(id);
      
      // Отправка уведомления, если направление назначено
      if (direction && user) {
        const directions = await DirectionService.getAllDirections();
        const directionObj = directions.find(d => d.slug === direction);
        if (directionObj) {
          const { notifyDirectionAssigned } = await import('../utils/telegramBot');
          notifyDirectionAssigned(user.telegram_id, directionObj.name).catch((err) => 
            logger.error('Error sending direction notification', err instanceof Error ? err : new Error(String(err)))
          );
        }
      }
      
      return res.json({ success: true, user });
    } catch (error) {
      logger.error('Set user direction error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при назначении направления' });
    }
  }
}
