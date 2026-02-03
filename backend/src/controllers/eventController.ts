import { Request, Response } from 'express';
import { EventService } from '../services/eventService';
import { logger } from '../utils/logger';

export class EventController {
  /**
   * Получение списка мероприятий
   */
  static async getEvents(req: Request, res: Response) {
    try {
      // Для пользователей возвращаем только опубликованные
      const events = await EventService.getPublishedEvents();
      return res.json({ success: true, events });
    } catch (error) {
      logger.error('Get events error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении программ' });
    }
  }

  /**
   * Получение деталей мероприятия (только информация о мероприятии)
   */
  static async getEventDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const event = await EventService.getEventById(id);
      
      if (!event) {
        return res.status(404).json({ error: 'Программа не найдена' });
      }

      return res.json({ 
        success: true, 
        event
      });
    } catch (error) {
      logger.error('Get event details error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении деталей программы' });
    }
  }

  /**
   * Сохранение заметки пользователя по мероприятию
   */
  static async saveEventNote(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { note_text } = req.body;

      // Разрешаем пустую строку для очистки заметки
      const noteText = note_text === undefined || note_text === null ? '' : String(note_text);

      const note = await EventService.saveEventNote(userId, id, noteText);
      return res.json({ success: true, note });
    } catch (error) {
      logger.error('Save event note error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при сохранении заметки' });
    }
  }

  /**
   * Получение заметки пользователя по мероприятию
   */
  static async getEventNote(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const note = await EventService.getEventNote(userId, id);
      return res.json({ success: true, note });
    } catch (error) {
      logger.error('Get event note error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении заметки' });
    }
  }

  /**
   * Получение всех заметок пользователя по мероприятиям
   */
  static async getUserEventNotes(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const notes = await EventService.getUserEventNotes(userId);
      return res.json({ success: true, notes });
    } catch (error) {
      logger.error('Get user event notes error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении заметок' });
    }
  }

  /**
   * Получение вопросов диагностики для пользователя
   */
  static async getDiagnosticQuestions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await EventService.getDiagnosticQuestions(id, userId);
      return res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Get diagnostic questions error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при получении вопросов диагностики' });
    }
  }

  /**
   * Отправка ответа на вопрос диагностики
   */
  static async submitDiagnosticAnswer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { questionId, answerData } = req.body;

      if (!questionId || answerData === undefined) {
        return res.status(400).json({ error: 'questionId и answerData обязательны' });
      }

      const answer = await EventService.submitDiagnosticAnswer(userId, id, questionId, answerData);
      return res.json({ success: true, answer });
    } catch (error) {
      logger.error('Submit diagnostic answer error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Ошибка при отправке ответа' });
    }
  }
}
