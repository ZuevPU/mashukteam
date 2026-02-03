import { supabase } from './supabase';
import { UserService } from './supabase';
import { BroadcastService } from './broadcastService';
import { notifyNewAssignment, notifyTargetedQuestionToUsers, sendBroadcastToUsers } from '../utils/telegramBot';
import { logger } from '../utils/logger';
import { Assignment, TargetedQuestion, Broadcast } from '../types';
import { SchedulerThrottle } from '../utils/schedulerThrottle';

export class SchedulerService {
  /**
   * Проверяет и обрабатывает запланированный контент, если прошло достаточно времени (throttling)
   * Выполняется асинхронно и не блокирует выполнение
   * @returns true если проверка была выполнена, false если была пропущена из-за throttling
   */
  static checkScheduledContentIfNeeded(): boolean {
    if (!SchedulerThrottle.shouldCheck()) {
      return false;
    }

    // Отмечаем, что проверка началась
    SchedulerThrottle.markChecked();

    // Выполняем проверку асинхронно, не блокируя основной запрос
    this.processScheduledContent()
      .then((results) => {
        if (results.assignments > 0 || results.questions > 0 || results.broadcasts > 0) {
          logger.info('Scheduled content checked and processed', results);
        }
      })
      .catch((error) => {
        logger.error('Error in scheduled content check', error instanceof Error ? error : new Error(String(error)));
      });

    return true;
  }

  /**
   * Обрабатывает весь запланированный контент
   */
  static async processScheduledContent(): Promise<{
    assignments: number;
    questions: number;
    broadcasts: number;
  }> {
    const results = {
      assignments: 0,
      questions: 0,
      broadcasts: 0,
    };

    try {
      // Обрабатываем задания
      results.assignments = await this.processScheduledAssignments();
      
      // Обрабатываем вопросы
      results.questions = await this.processScheduledQuestions();
      
      // Обрабатываем рассылки
      results.broadcasts = await this.processScheduledBroadcasts();

      logger.info('Scheduled content processed', results);
    } catch (error) {
      logger.error('Error processing scheduled content', error instanceof Error ? error : new Error(String(error)));
    }

    return results;
  }

  /**
   * Публикует запланированные задания
   */
  static async processScheduledAssignments(): Promise<number> {
    const now = new Date().toISOString();

    try {
      // Находим задания, которые нужно опубликовать
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('status', 'draft')
        .not('scheduled_at', 'is', null)
        .lte('scheduled_at', now);

      if (error) {
        logger.error('Error fetching scheduled assignments', error);
        return 0;
      }

      if (!assignments || assignments.length === 0) {
        return 0;
      }

      let publishedCount = 0;

      for (const assignment of assignments as Assignment[]) {
        try {
          // Обновляем статус на published
          const { error: updateError } = await supabase
            .from('assignments')
            .update({ 
              status: 'published',
              scheduled_at: null // Очищаем scheduled_at после публикации
            })
            .eq('id', assignment.id);

          if (updateError) {
            logger.error('Error publishing assignment', updateError);
            continue;
          }

          // Отправляем уведомление
          await notifyNewAssignment(assignment.title, assignment.reward, assignment.id);
          
          publishedCount++;
          logger.info('Assignment published by scheduler', { assignmentId: assignment.id, title: assignment.title });
        } catch (err) {
          logger.error('Error processing scheduled assignment', err instanceof Error ? err : new Error(String(err)));
        }
      }

      return publishedCount;
    } catch (error) {
      logger.error('Error in processScheduledAssignments', error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }

  /**
   * Публикует запланированные вопросы
   */
  static async processScheduledQuestions(): Promise<number> {
    const now = new Date().toISOString();

    try {
      // Находим вопросы, которые нужно опубликовать
      const { data: questions, error } = await supabase
        .from('targeted_questions')
        .select('*')
        .eq('status', 'draft')
        .not('scheduled_at', 'is', null)
        .lte('scheduled_at', now);

      if (error) {
        logger.error('Error fetching scheduled questions', error);
        return 0;
      }

      if (!questions || questions.length === 0) {
        return 0;
      }

      let publishedCount = 0;

      for (const question of questions as TargetedQuestion[]) {
        try {
          // Обновляем статус на published
          const { error: updateError } = await supabase
            .from('targeted_questions')
            .update({ 
              status: 'published',
              scheduled_at: null
            })
            .eq('id', question.id);

          if (updateError) {
            logger.error('Error publishing question', updateError);
            continue;
          }

          // Отправляем уведомления в зависимости от target_audience
          if (question.target_audience === 'all') {
            const users = await UserService.getAllUsers();
            const userIds = users.map(u => u.id);
            await notifyTargetedQuestionToUsers(userIds, question.text, question.id);
          } else if (question.target_audience === 'by_direction' && question.target_values) {
            const users = await UserService.getAllUsers();
            const targetUsers = users.filter(u => u.direction && question.target_values!.includes(u.direction));
            const userIds = targetUsers.map(u => u.id);
            await notifyTargetedQuestionToUsers(userIds, question.text, question.id);
          } else if (question.target_audience === 'individual' && question.target_values) {
            await notifyTargetedQuestionToUsers(question.target_values, question.text, question.id);
          }

          publishedCount++;
          logger.info('Question published by scheduler', { questionId: question.id, text: question.text.substring(0, 50) });
        } catch (err) {
          logger.error('Error processing scheduled question', err instanceof Error ? err : new Error(String(err)));
        }
      }

      return publishedCount;
    } catch (error) {
      logger.error('Error in processScheduledQuestions', error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }

  /**
   * Отправляет запланированные рассылки
   */
  static async processScheduledBroadcasts(): Promise<number> {
    try {
      const broadcasts = await BroadcastService.getScheduledBroadcastsToSend();

      if (!broadcasts || broadcasts.length === 0) {
        return 0;
      }

      let sentCount = 0;

      for (const broadcast of broadcasts) {
        try {
          // Получаем получателей
          const users = await UserService.getAllUsers();
          let targetUsers = users;

          if (broadcast.target_type === 'by_direction' && broadcast.target_values) {
            targetUsers = users.filter(u => u.direction && broadcast.target_values!.includes(u.direction));
          } else if (broadcast.target_type === 'individual' && broadcast.target_values) {
            targetUsers = users.filter(u => broadcast.target_values!.includes(u.id));
          }

          // Отправляем рассылку
          const result = await sendBroadcastToUsers(
            targetUsers,
            broadcast.message,
            broadcast.image_url
          );

          // Обновляем статус
          await BroadcastService.markAsSent(broadcast.id, result.success, result.failed);

          sentCount++;
          logger.info('Broadcast sent by scheduler', { 
            broadcastId: broadcast.id, 
            title: broadcast.title,
            recipients: targetUsers.length,
            success: result.success,
            failed: result.failed
          });
        } catch (err) {
          logger.error('Error processing scheduled broadcast', err instanceof Error ? err : new Error(String(err)));
        }
      }

      return sentCount;
    } catch (error) {
      logger.error('Error in processScheduledBroadcasts', error instanceof Error ? error : new Error(String(error)));
      return 0;
    }
  }
}
