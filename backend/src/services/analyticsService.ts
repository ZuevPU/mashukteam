import { supabase } from './supabase';
import { logger } from '../utils/logger';

export interface UserActivityStats {
  totalUsers: number;
  activeUsers: number; // Пользователи с активностью за период
  averageAnswersPerUser: number;
  totalAnswers: number;
  totalEventAnswers: number;
  totalDiagnosticAnswers: number;
  totalTargetedAnswers: number;
  totalSubmissions: number;
}

export interface DirectionStats {
  directionId: string;
  directionName: string;
  userCount: number;
  totalAnswers: number;
  totalSubmissions: number;
  averageAnswersPerUser: number;
}

export interface EventParticipationStats {
  eventId: string;
  eventTitle: string;
  eventType: 'event' | 'diagnostic';
  participantsCount: number;
  answersCount: number;
  questionsCount: number;
  participationRate: number; // Процент участников от общего числа пользователей
}

export interface QuestionAnswerStats {
  questionId: string;
  questionText: string;
  questionType: string;
  answersCount: number;
  uniqueUsersCount: number;
}

/**
 * Сервис для получения аналитики
 */
export class AnalyticsService {
  /**
   * Статистика активности пользователей за период
   */
  static async getUserActivityStats(dateFrom?: string, dateTo?: string): Promise<UserActivityStats> {
    try {
      // Общее количество пользователей
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Пользователи с активностью за период
      const activeUserIds = new Set<string>();
      
      // Получаем активных пользователей из всех таблиц
      const [answersData, targetedAnswersData, submissionsData] = await Promise.all([
        (() => {
          let q = supabase.from('answers').select('user_id');
          if (dateFrom) q = q.gte('created_at', dateFrom);
          if (dateTo) q = q.lte('created_at', dateTo);
          return q;
        })(),
        (() => {
          let q = supabase.from('targeted_answers').select('user_id');
          if (dateFrom) q = q.gte('created_at', dateFrom);
          if (dateTo) q = q.lte('created_at', dateTo);
          return q;
        })(),
        (() => {
          let q = supabase.from('assignment_submissions').select('user_id');
          if (dateFrom) q = q.gte('created_at', dateFrom);
          if (dateTo) q = q.lte('created_at', dateTo);
          return q;
        })(),
      ]);

      (answersData.data || []).forEach((a: any) => activeUserIds.add(a.user_id));
      (targetedAnswersData.data || []).forEach((a: any) => activeUserIds.add(a.user_id));
      (submissionsData.data || []).forEach((s: any) => activeUserIds.add(s.user_id));

      const activeUsers = activeUserIds.size;

      // Получаем ID мероприятий и диагностик
      const [{ data: eventEvents }, { data: diagnosticEvents }] = await Promise.all([
        supabase.from('events').select('id').eq('type', 'event'),
        supabase.from('events').select('id').eq('type', 'diagnostic'),
      ]);
      
      const eventIds = (eventEvents || []).map(e => e.id);
      const diagnosticEventIds = (diagnosticEvents || []).map(e => e.id);

      // Подсчет ответов
      const [
        totalEventAnswersResult,
        totalDiagnosticAnswersResult,
        totalTargetedAnswersResult,
        totalSubmissionsResult,
      ] = await Promise.all([
        eventIds.length > 0
          ? (() => {
              let q = supabase.from('answers').select('id', { count: 'exact', head: true }).in('event_id', eventIds);
              if (dateFrom) q = q.gte('created_at', dateFrom);
              if (dateTo) q = q.lte('created_at', dateTo);
              return q;
            })()
          : Promise.resolve({ count: 0 }),
        diagnosticEventIds.length > 0
          ? (() => {
              let q = supabase.from('answers').select('id', { count: 'exact', head: true }).in('event_id', diagnosticEventIds);
              if (dateFrom) q = q.gte('created_at', dateFrom);
              if (dateTo) q = q.lte('created_at', dateTo);
              return q;
            })()
          : Promise.resolve({ count: 0 }),
        (() => {
          let q = supabase.from('targeted_answers').select('id', { count: 'exact', head: true });
          if (dateFrom) q = q.gte('created_at', dateFrom);
          if (dateTo) q = q.lte('created_at', dateTo);
          return q;
        })(),
        (() => {
          let q = supabase.from('assignment_submissions').select('id', { count: 'exact', head: true });
          if (dateFrom) q = q.gte('created_at', dateFrom);
          if (dateTo) q = q.lte('created_at', dateTo);
          return q;
        })(),
      ]);

      const totalEventAnswers = totalEventAnswersResult.count || 0;
      const totalDiagnosticAnswers = totalDiagnosticAnswersResult.count || 0;
      const totalTargetedAnswers = totalTargetedAnswersResult.count || 0;
      const totalSubmissions = totalSubmissionsResult.count || 0;

      const totalAnswers = (totalEventAnswers || 0) + (totalDiagnosticAnswers || 0) + (totalTargetedAnswers || 0);
      const averageAnswersPerUser = activeUsers > 0 ? totalAnswers / activeUsers : 0;

      return {
        totalUsers: totalUsers || 0,
        activeUsers,
        averageAnswersPerUser: Math.round(averageAnswersPerUser * 100) / 100,
        totalAnswers,
        totalEventAnswers: totalEventAnswers || 0,
        totalDiagnosticAnswers: totalDiagnosticAnswers || 0,
        totalTargetedAnswers: totalTargetedAnswers || 0,
        totalSubmissions: totalSubmissions || 0,
      };
    } catch (error) {
      logger.error('Error getting user activity stats', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Статистика по направлениям
   */
  static async getDirectionStats(): Promise<DirectionStats[]> {
    try {
      const { data: directions } = await supabase
        .from('directions')
        .select('id, name')
        .order('name', { ascending: true });

      if (!directions || directions.length === 0) {
        return [];
      }

      const stats = await Promise.all(
        directions.map(async (direction) => {
          // Количество пользователей в направлении
          const { count: userCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('direction_id', direction.id);

          // Количество ответов пользователей этого направления
          const { data: usersInDirection } = await supabase
            .from('users')
            .select('id')
            .eq('direction_id', direction.id);

          const userIds = (usersInDirection || []).map((u: any) => u.id);

          if (userIds.length === 0) {
            return {
              directionId: direction.id,
              directionName: direction.name,
              userCount: userCount || 0,
              totalAnswers: 0,
              totalSubmissions: 0,
              averageAnswersPerUser: 0,
            };
          }

          const [
            { count: totalAnswers },
            { count: totalSubmissions },
          ] = await Promise.all([
            supabase
              .from('answers')
              .select('id', { count: 'exact', head: true })
              .in('user_id', userIds),
            supabase
              .from('assignment_submissions')
              .select('id', { count: 'exact', head: true })
              .in('user_id', userIds),
          ]);

          const averageAnswersPerUser = (userCount || 0) > 0 
            ? ((totalAnswers || 0) + (totalSubmissions || 0)) / (userCount || 1)
            : 0;

          return {
            directionId: direction.id,
            directionName: direction.name,
            userCount: userCount || 0,
            totalAnswers: totalAnswers || 0,
            totalSubmissions: totalSubmissions || 0,
            averageAnswersPerUser: Math.round(averageAnswersPerUser * 100) / 100,
          };
        })
      );

      return stats;
    } catch (error) {
      logger.error('Error getting direction stats', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Статистика участия в мероприятиях
   */
  static async getEventParticipationStats(eventId?: string): Promise<EventParticipationStats[]> {
    try {
      let eventsQuery = supabase
        .from('events')
        .select('id, title, type')
        .order('created_at', { ascending: false });

      if (eventId) {
        eventsQuery = eventsQuery.eq('id', eventId);
      }

      const { data: events } = await eventsQuery;

      if (!events || events.length === 0) {
        return [];
      }

      // Общее количество пользователей для расчета процента участия
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const stats = await Promise.all(
        events.map(async (event) => {
          // Количество вопросов в мероприятии
          const { count: questionsCount } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          // Уникальные участники
          const { data: answersData } = await supabase
            .from('answers')
            .select('user_id')
            .eq('event_id', event.id);

          const uniqueParticipants = new Set((answersData || []).map((a: any) => a.user_id));
          const participantsCount = uniqueParticipants.size;
          const answersCount = answersData?.length || 0;

          const participationRate = (totalUsers || 0) > 0
            ? Math.round((participantsCount / (totalUsers || 1)) * 10000) / 100
            : 0;

          return {
            eventId: event.id,
            eventTitle: event.title,
            eventType: event.type as 'event' | 'diagnostic',
            participantsCount,
            answersCount,
            questionsCount: questionsCount || 0,
            participationRate,
          };
        })
      );

      return stats;
    } catch (error) {
      logger.error('Error getting event participation stats', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Статистика ответов на вопросы
   */
  static async getQuestionAnswerStats(questionId?: string): Promise<QuestionAnswerStats[]> {
    try {
      // Получаем статистику по персональным вопросам
      let questionsQuery = supabase
        .from('targeted_questions')
        .select('id, text, type')
        .order('created_at', { ascending: false });

      if (questionId) {
        questionsQuery = questionsQuery.eq('id', questionId);
      }

      const { data: questions } = await questionsQuery;

      if (!questions || questions.length === 0) {
        return [];
      }

      const stats = await Promise.all(
        questions.map(async (question) => {
          const { data: answersData } = await supabase
            .from('targeted_answers')
            .select('user_id')
            .eq('question_id', question.id);

          const uniqueUsers = new Set((answersData || []).map((a: any) => a.user_id));

          return {
            questionId: question.id,
            questionText: question.text,
            questionType: question.type,
            answersCount: answersData?.length || 0,
            uniqueUsersCount: uniqueUsers.size,
          };
        })
      );

      return stats;
    } catch (error) {
      logger.error('Error getting question answer stats', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}
