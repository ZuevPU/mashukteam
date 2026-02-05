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
  directionCode: string;
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
        .select('id, name, slug')
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
            .eq('direction', direction.slug);

          // Количество ответов пользователей этого направления
          const { data: usersInDirection } = await supabase
            .from('users')
            .select('id')
            .eq('direction', direction.slug);

          const userIds = (usersInDirection || []).map((u: any) => u.id);

          if (userIds.length === 0) {
            return {
              directionCode: direction.slug,
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
            directionCode: direction.slug,
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

  /**
   * Статистика по баллам и достижениям
   */
  static async getGamificationStats(): Promise<{
    totalPoints: number;
    averagePointsPerUser: number;
    totalAchievements: number;
    unlockedAchievements: number;
    topUsers: Array<{ userId: string; userName: string; points: number; achievements: number }>;
  }> {
    try {
      // Получаем всех пользователей с их баллами
      const { data: usersData } = await supabase
        .from('users')
        .select('id, first_name, last_name, middle_name, total_points');

      const totalPoints = (usersData || []).reduce((sum, u: any) => sum + (u.total_points || 0), 0);
      const totalUsers = usersData?.length || 0;
      
      const averagePointsPerUser = totalUsers > 0 ? Math.round((totalPoints / totalUsers) * 100) / 100 : 0;

      // Статистика по достижениям
      const { count: totalAchievements } = await supabase
        .from('achievements')
        .select('*', { count: 'exact', head: true });

      const { count: unlockedAchievements } = await supabase
        .from('user_achievements')
        .select('*', { count: 'exact', head: true });

      // Топ пользователей по баллам
      const topUsersData = (usersData || [])
        .sort((a: any, b: any) => (b.total_points || 0) - (a.total_points || 0))
        .slice(0, 10)
        .map(async (user: any) => {
          const { count: achievementsCount } = await supabase
            .from('user_achievements')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          const userName = `${user.last_name || ''} ${user.first_name || ''} ${user.middle_name || ''}`.trim() || 'Неизвестный';

          return {
            userId: user.id,
            userName,
            points: user.total_points || 0,
            achievements: achievementsCount || 0,
          };
        });

      const resolvedTopUsers = await Promise.all(topUsersData);

      return {
        totalPoints,
        averagePointsPerUser,
        totalAchievements: totalAchievements || 0,
        unlockedAchievements: unlockedAchievements || 0,
        topUsers: resolvedTopUsers,
      };
    } catch (error) {
      logger.error('Error getting gamification stats', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Статистика по заданиям
   */
  static async getAssignmentStats(): Promise<{
    totalAssignments: number;
    totalSubmissions: number;
    approvedSubmissions: number;
    rejectedSubmissions: number;
    pendingSubmissions: number;
    averageReward: number;
  }> {
    try {
      const { count: totalAssignments } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true });

      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('status');

      const totalSubmissions = submissions?.length || 0;
      const approvedSubmissions = submissions?.filter((s: any) => s.status === 'approved').length || 0;
      const rejectedSubmissions = submissions?.filter((s: any) => s.status === 'rejected').length || 0;
      const pendingSubmissions = submissions?.filter((s: any) => s.status === 'pending').length || 0;

      // Средняя награда за задания
      const { data: assignments } = await supabase
        .from('assignments')
        .select('reward');
      
      const averageReward = assignments && assignments.length > 0
        ? Math.round((assignments.reduce((sum, a: any) => sum + (a.reward || 0), 0) / assignments.length) * 100) / 100
        : 0;

      return {
        totalAssignments: totalAssignments || 0,
        totalSubmissions,
        approvedSubmissions,
        rejectedSubmissions,
        pendingSubmissions,
        averageReward,
      };
    } catch (error) {
      logger.error('Error getting assignment stats', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Динамика регистраций по дням
   */
  static async getRegistrationTrend(days: number = 30): Promise<Array<{ date: string; count: number }>> {
    try {
      const { data: users } = await supabase
        .from('users')
        .select('created_at')
        .order('created_at', { ascending: false });

      if (!users || users.length === 0) {
        return [];
      }

      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);

      const dateMap = new Map<string, number>();

      users.forEach((user: any) => {
        const userDate = new Date(user.created_at);
        if (userDate >= startDate) {
          const dateKey = userDate.toISOString().split('T')[0];
          dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
        }
      });

      const trend = Array.from(dateMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return trend;
    } catch (error) {
      logger.error('Error getting registration trend', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Воронка конверсии пользователей
   * Регистрация → Первое действие → Завершённое мероприятие → Сданное задание
   */
  static async getConversionFunnel(): Promise<{
    stages: Array<{
      name: string;
      count: number;
      percentage: number;
      dropoff: number;
    }>;
    totalUsers: number;
  }> {
    try {
      // Общее количество пользователей
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Зарегистрированные пользователи
      const { count: registeredUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'registered');

      // Пользователи с хотя бы одним ответом
      const { data: usersWithAnswers } = await supabase
        .from('answers')
        .select('user_id');
      const uniqueUsersWithAnswers = new Set((usersWithAnswers || []).map((a: any) => a.user_id)).size;

      // Пользователи с ответами на персональные вопросы
      const { data: usersWithTargeted } = await supabase
        .from('targeted_answers')
        .select('user_id');
      const uniqueUsersWithTargeted = new Set((usersWithTargeted || []).map((a: any) => a.user_id)).size;

      // Пользователи с сданными заданиями
      const { data: usersWithSubmissions } = await supabase
        .from('assignment_submissions')
        .select('user_id');
      const uniqueUsersWithSubmissions = new Set((usersWithSubmissions || []).map((s: any) => s.user_id)).size;

      // Пользователи с одобренными заданиями
      const { data: usersWithApproved } = await supabase
        .from('assignment_submissions')
        .select('user_id')
        .eq('status', 'approved');
      const uniqueUsersWithApproved = new Set((usersWithApproved || []).map((s: any) => s.user_id)).size;

      const total = totalUsers || 1;
      const stages = [
        { name: 'Всего пользователей', count: totalUsers || 0 },
        { name: 'Зарегистрированы', count: registeredUsers || 0 },
        { name: 'Прошли мероприятие', count: uniqueUsersWithAnswers },
        { name: 'Ответили на вопросы', count: uniqueUsersWithTargeted },
        { name: 'Сдали задание', count: uniqueUsersWithSubmissions },
        { name: 'Задание одобрено', count: uniqueUsersWithApproved },
      ].map((stage, index, arr) => ({
        ...stage,
        percentage: Math.round((stage.count / total) * 100),
        dropoff: index > 0 ? Math.round(((arr[index - 1].count - stage.count) / arr[index - 1].count) * 100) : 0,
      }));

      return {
        stages,
        totalUsers: totalUsers || 0,
      };
    } catch (error) {
      logger.error('Error getting conversion funnel', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Когортный анализ по неделям регистрации
   * Показывает retention rate для каждой когорты
   */
  static async getCohortAnalysis(weeks: number = 8): Promise<{
    cohorts: Array<{
      weekStart: string;
      weekEnd: string;
      usersCount: number;
      retention: number[]; // Процент активных в каждую следующую неделю
    }>;
  }> {
    try {
      const now = new Date();
      const cohorts: Array<{
        weekStart: string;
        weekEnd: string;
        usersCount: number;
        retention: number[];
      }> = [];

      // Получаем всех пользователей с датой регистрации
      const { data: users } = await supabase
        .from('users')
        .select('id, created_at');

      if (!users || users.length === 0) {
        return { cohorts: [] };
      }

      // Получаем все активности
      const [answers, targetedAnswers, submissions] = await Promise.all([
        supabase.from('answers').select('user_id, created_at'),
        supabase.from('targeted_answers').select('user_id, created_at'),
        supabase.from('assignment_submissions').select('user_id, created_at'),
      ]);

      // Объединяем все активности
      const activities: Array<{ user_id: string; created_at: string }> = [
        ...(answers.data || []),
        ...(targetedAnswers.data || []),
        ...(submissions.data || []),
      ];

      // Создаём когорты по неделям
      for (let w = weeks - 1; w >= 0; w--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - w * 7);
        weekEnd.setHours(23, 59, 59, 999);

        // Пользователи, зарегистрированные в эту неделю
        const cohortUsers = users.filter((user: any) => {
          const regDate = new Date(user.created_at);
          return regDate >= weekStart && regDate <= weekEnd;
        });

        const cohortUserIds = new Set(cohortUsers.map((u: any) => u.id));

        // Рассчитываем retention для каждой следующей недели
        const retention: number[] = [];
        const maxRetentionWeeks = Math.min(w + 1, 8);

        for (let retWeek = 0; retWeek < maxRetentionWeeks; retWeek++) {
          const retWeekStart = new Date(weekEnd);
          retWeekStart.setDate(retWeekStart.getDate() + retWeek * 7);

          const retWeekEnd = new Date(retWeekStart);
          retWeekEnd.setDate(retWeekEnd.getDate() + 7);

          // Сколько пользователей из когорты были активны на этой неделе
          const activeUsers = new Set<string>();
          activities.forEach((activity: any) => {
            const actDate = new Date(activity.created_at);
            if (cohortUserIds.has(activity.user_id) && actDate >= retWeekStart && actDate < retWeekEnd) {
              activeUsers.add(activity.user_id);
            }
          });

          const retentionRate = cohortUsers.length > 0 
            ? Math.round((activeUsers.size / cohortUsers.length) * 100) 
            : 0;
          retention.push(retentionRate);
        }

        cohorts.push({
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          usersCount: cohortUsers.length,
          retention,
        });
      }

      return { cohorts };
    } catch (error) {
      logger.error('Error getting cohort analysis', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Обзорная статистика для дашборда
   */
  static async getDashboardOverview(): Promise<{
    users: { total: number; registered: number; newToday: number; newThisWeek: number };
    activity: { todayAnswers: number; todaySubmissions: number; weekAnswers: number; weekSubmissions: number };
    topDirection: { name: string; userCount: number } | null;
    pendingModeration: number;
  }> {
    try {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);

      // Статистика пользователей
      const [
        { count: totalUsers },
        { count: registeredUsers },
        { count: newToday },
        { count: newThisWeek },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'registered'),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString()),
      ]);

      // Активность
      const [
        { count: todayAnswers },
        { count: todaySubmissions },
        { count: weekAnswers },
        { count: weekSubmissions },
      ] = await Promise.all([
        supabase.from('answers').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase.from('assignment_submissions').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase.from('answers').select('*', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString()),
        supabase.from('assignment_submissions').select('*', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString()),
      ]);

      // Топовое направление
      const { data: users } = await supabase.from('users').select('direction');
      const directionCounts = new Map<string, number>();
      (users || []).forEach((u: any) => {
        if (u.direction) {
          directionCounts.set(u.direction, (directionCounts.get(u.direction) || 0) + 1);
        }
      });
      let topDirection: { name: string; userCount: number } | null = null;
      let maxCount = 0;
      directionCounts.forEach((count, name) => {
        if (count > maxCount) {
          maxCount = count;
          topDirection = { name, userCount: count };
        }
      });

      // Задания на модерации
      const { count: pendingModeration } = await supabase
        .from('assignment_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return {
        users: {
          total: totalUsers || 0,
          registered: registeredUsers || 0,
          newToday: newToday || 0,
          newThisWeek: newThisWeek || 0,
        },
        activity: {
          todayAnswers: todayAnswers || 0,
          todaySubmissions: todaySubmissions || 0,
          weekAnswers: weekAnswers || 0,
          weekSubmissions: weekSubmissions || 0,
        },
        topDirection,
        pendingModeration: pendingModeration || 0,
      };
    } catch (error) {
      logger.error('Error getting dashboard overview', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Активность по часам (для определения пиковых часов)
   */
  static async getHourlyActivity(days: number = 7): Promise<Array<{ hour: number; count: number }>> {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const [answers, targetedAnswers, submissions] = await Promise.all([
        supabase.from('answers').select('created_at').gte('created_at', dateFrom.toISOString()),
        supabase.from('targeted_answers').select('created_at').gte('created_at', dateFrom.toISOString()),
        supabase.from('assignment_submissions').select('created_at').gte('created_at', dateFrom.toISOString()),
      ]);

      const hourCounts = new Map<number, number>();
      for (let h = 0; h < 24; h++) {
        hourCounts.set(h, 0);
      }

      const allActivities = [
        ...(answers.data || []),
        ...(targetedAnswers.data || []),
        ...(submissions.data || []),
      ];

      allActivities.forEach((activity: any) => {
        const hour = new Date(activity.created_at).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      });

      return Array.from(hourCounts.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour - b.hour);
    } catch (error) {
      logger.error('Error getting hourly activity', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}
