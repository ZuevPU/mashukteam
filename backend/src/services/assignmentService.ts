import { supabase } from './supabase';
import { 
  Assignment, 
  AssignmentSubmission, 
  CreateAssignmentDto, 
  SubmitAssignmentDto,
  ModerateSubmissionDto,
  Direction,
  RandomizerQuestion 
} from '../types';
import { logger } from '../utils/logger';

export class AssignmentService {
  // === Directions ===
  
  static async getAllDirections(): Promise<Direction[]> {
    const { data, error } = await supabase
      .from('directions')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    return data as Direction[];
  }

  // === Assignments CRUD ===

  static async createAssignment(data: CreateAssignmentDto & { status?: string; scheduled_at?: string | null }): Promise<Assignment> {
    // Подготавливаем данные для вставки (только поля, которые есть в таблице assignments)
    const assignmentData: any = {
      title: data.title,
      description: data.description,
      answer_format: data.answer_format,
      reward: data.reward,
      target_type: data.target_type,
      target_values: data.target_values,
    };

    // Добавляем статус (по умолчанию draft)
    if (data.status) {
      assignmentData.status = data.status;
    }

    // Добавляем scheduled_at если указано
    if (data.scheduled_at) {
      assignmentData.scheduled_at = data.scheduled_at;
    }

    logger.info('Creating assignment with data', { assignmentData, originalStatus: data.status });

    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert(assignmentData)
      .select()
      .single();

    if (error) throw error;

    // Если тип random_number, создаем рандомайзер
    if (data.answer_format === 'random_number' && assignment) {
      try {
        const randomizerData: any = {
          assignment_id: assignment.id,
          tables_count: data.tables_count || 20,
          participants_per_table: data.participants_per_table || 4,
          topic: data.title,
          description: data.description || null,
          status: 'open',
          randomizer_mode: data.randomizer_mode || 'tables',
        };

        // Добавляем number_min и number_max только если они указаны
        if (data.number_min !== undefined && data.number_min !== null) {
          randomizerData.number_min = data.number_min;
        }
        if (data.number_max !== undefined && data.number_max !== null) {
          randomizerData.number_max = data.number_max;
        }

        // Очищаем null значения
        Object.keys(randomizerData).forEach(key => {
          if (randomizerData[key] === null) {
            delete randomizerData[key];
          }
        });

        logger.debug('Creating randomizer', { randomizerData });

        const { error: randomizerError } = await supabase
          .from('randomizer_questions')
          .insert(randomizerData);

        if (randomizerError) {
          logger.error('Error creating randomizer for assignment', randomizerError instanceof Error ? randomizerError : new Error(String(randomizerError)), { randomizerData });
          // Выбрасываем ошибку, чтобы пользователь знал о проблеме
          throw new Error(`Ошибка создания рандомайзера: ${randomizerError.message || JSON.stringify(randomizerError)}`);
        }
      } catch (randomizerErr) {
        logger.error('Error creating randomizer for assignment', randomizerErr instanceof Error ? randomizerErr : new Error(String(randomizerErr)));
        // Выбрасываем ошибку дальше
        throw randomizerErr;
      }
    }

    return assignment as Assignment;
  }

  static async updateAssignment(id: string, data: Partial<CreateAssignmentDto & { status: string }>): Promise<Assignment> {
    const { data: assignment, error } = await supabase
      .from('assignments')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return assignment as Assignment;
  }

  static async deleteAssignment(id: string): Promise<boolean> {
    // Сначала удаляем все связанные данные
    
    // 1. Получаем рандомайзер если он есть
    const { data: randomizer } = await supabase
      .from('randomizer_questions')
      .select('id')
      .eq('assignment_id', id)
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
        .eq('assignment_id', id);
    }

    // 5. Удаляем все ответы на задание
    await supabase
      .from('assignment_submissions')
      .delete()
      .eq('assignment_id', id);

    // 6. Удаляем транзакции баллов связанные с заданием
    await supabase
      .from('points_transactions')
      .delete()
      .ilike('reason', `%${id}%`);

    // 7. Наконец удаляем само задание
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  static async getAllAssignments(): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Assignment[];
  }

  static async getAssignmentById(id: string): Promise<Assignment | null> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as Assignment;
  }

  // === Assignments for Users (filtered by target) ===

  static async getAssignmentsForUser(userId: string, userDirection?: string): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter by target_type
    const assignments = (data as Assignment[]).filter(a => {
      if (a.target_type === 'all') return true;
      if (a.target_type === 'direction' && userDirection && a.target_values?.includes(userDirection)) return true;
      if (a.target_type === 'individual' && a.target_values?.includes(userId)) return true;
      return false;
    });

    return assignments;
  }

  // === Submissions ===

  static async submitAssignment(userId: string, assignmentId: string, data: SubmitAssignmentDto): Promise<AssignmentSubmission> {
    // Check if already submitted
    const { data: existing } = await supabase
      .from('assignment_submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('assignment_id', assignmentId)
      .single();

    if (existing) {
      throw new Error('Вы уже выполнили это задание');
    }

    const insertData: any = {
      user_id: userId,
      assignment_id: assignmentId,
      content: data.content,
      status: 'pending'
    };

    // Добавляем file_url если есть
    if (data.file_url) {
      insertData.file_url = data.file_url;
    }

    const { data: submission, error } = await supabase
      .from('assignment_submissions')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return submission as AssignmentSubmission;
  }

  static async getUserSubmissions(userId: string): Promise<AssignmentSubmission[]> {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('*, assignment:assignments(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AssignmentSubmission[];
  }

  static async getSubmissionsForAssignment(assignmentId: string): Promise<AssignmentSubmission[]> {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('*, user:users(id, first_name, last_name, telegram_username), assignment:assignments(id, title, reward)')
      .eq('assignment_id', assignmentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AssignmentSubmission[];
  }

  static async getAllSubmissions(): Promise<AssignmentSubmission[]> {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('*, user:users(id, first_name, last_name, telegram_username), assignment:assignments(title, reward)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AssignmentSubmission[];
  }

  static async moderateSubmission(submissionId: string, data: ModerateSubmissionDto): Promise<AssignmentSubmission> {
    // Сначала получаем submission с данными задания
    const { data: existingSubmission, error: fetchError } = await supabase
      .from('assignment_submissions')
      .select('*, assignment:assignments(reward)')
      .eq('id', submissionId)
      .single();

    if (fetchError) throw fetchError;

    // Обновляем статус
    const { data: submission, error } = await supabase
      .from('assignment_submissions')
      .update({
        status: data.status,
        admin_comment: data.admin_comment,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (error) throw error;

    // Если статус approved — начисляем баллы и звездочки
    if (data.status === 'approved' && existingSubmission) {
      const reward = (existingSubmission as any).assignment?.reward || 0;
      if (reward > 0) {
        // Добавляем баллы пользователю
        await supabase
          .from('points_transactions')
          .insert({
            user_id: existingSubmission.user_id,
            points: reward,
            reason: `Задание выполнено`
          });

        // Обновляем total_points в users
        const { data: userData } = await supabase
          .from('users')
          .select('total_points')
          .eq('id', existingSubmission.user_id)
          .single();

        const currentPoints = userData?.total_points || 0;
        await supabase
          .from('users')
          .update({ total_points: currentPoints + reward })
          .eq('id', existingSubmission.user_id);
      }

      // Обновляем звездочки пользователя: получаем сумму reward из всех одобренных заданий
      await this.recalculateUserStars(existingSubmission.user_id);
    }
    
    // Если статус изменился с approved на другой — пересчитываем звездочки
    if (existingSubmission && existingSubmission.status === 'approved' && data.status !== 'approved') {
      await this.recalculateUserStars(existingSubmission.user_id);
    }

    return submission as AssignmentSubmission;
  }

  /**
   * Пересчёт звёзд пользователя по сумме reward одобренных заданий
   */
  static async recalculateUserStars(userId: string): Promise<number> {
    const { data: submissions, error } = await supabase
      .from('assignment_submissions')
      .select('assignment_id')
      .eq('user_id', userId)
      .eq('status', 'approved');

    if (error || !submissions?.length) {
      await supabase.from('users').update({ stars_count: 0 }).eq('id', userId);
      return 0;
    }

    const assignmentIds = submissions.map((s: any) => s.assignment_id);
    const { data: assignments, error: assignError } = await supabase
      .from('assignments')
      .select('reward')
      .in('id', assignmentIds);

    if (assignError || !assignments?.length) {
      await supabase.from('users').update({ stars_count: 0 }).eq('id', userId);
      return 0;
    }

    const totalStars = (assignments as any[]).reduce((sum, a) => sum + (Number(a.reward) || 0), 0);
    await supabase
      .from('users')
      .update({ stars_count: totalStars })
      .eq('id', userId);

    return totalStars;
  }

  // === Randomizer for Assignments ===

  /**
   * Получить рандомайзер по ID задания
   */
  static async getRandomizerByAssignmentId(assignmentId: string): Promise<RandomizerQuestion | null> {
    const { data, error } = await supabase
      .from('randomizer_questions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as RandomizerQuestion;
  }

  /**
   * Участие пользователя в случайном числе (рандомайзере задания)
   */
  static async participateInRandomNumber(userId: string, assignmentId: string): Promise<{ participantId: string; randomizerId: string }> {
    // Находим рандомайзер для задания
    const randomizer = await this.getRandomizerByAssignmentId(assignmentId);
    
    if (!randomizer) {
      throw new Error('Случайное число не найдено для этого задания');
    }

    if (randomizer.status !== 'open') {
      throw new Error('Регистрация на случайное число закрыта');
    }

    // Проверяем, не участвует ли уже
    const { data: existing } = await supabase
      .from('randomizer_participants')
      .select('id')
      .eq('randomizer_id', randomizer.id)
      .eq('user_id', userId)
      .single();

    if (existing) {
      throw new Error('Вы уже зарегистрированы на это случайное число');
    }

    // Добавляем участника
    const { data: participant, error } = await supabase
      .from('randomizer_participants')
      .insert({
        randomizer_id: randomizer.id,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error participating in random number', error);
      throw error;
    }

    return { participantId: participant.id, randomizerId: randomizer.id };
  }

  /**
   * Начисление звёздочек участникам рандомайзера после публикации
   */
  static async awardStarsToRandomizerParticipants(assignmentId: string): Promise<number> {
    const assignment = await this.getAssignmentById(assignmentId);
    if (!assignment || assignment.reward <= 0) {
      return 0;
    }

    const randomizer = await this.getRandomizerByAssignmentId(assignmentId);
    if (!randomizer) {
      return 0;
    }

    // Получаем финальные распределения
    const { data: distributions, error } = await supabase
      .from('randomizer_distributions')
      .select('*')
      .eq('randomizer_id', randomizer.id)
      .eq('preview_mode', false);

    if (error || !distributions?.length) {
      return 0;
    }

    let awardedCount = 0;

    for (const dist of distributions) {
      try {
        // Проверяем, есть ли уже ответ на задание
        const { data: existingSub } = await supabase
          .from('assignment_submissions')
          .select('id')
          .eq('assignment_id', assignmentId)
          .eq('user_id', dist.user_id)
          .single();

        if (!existingSub) {
          // Формируем контент ответа
          const content = dist.table_number > 0 
            ? `Стол №${dist.table_number}` 
            : `Случайное число: ${dist.random_number}`;

          // Создаем submission со статусом approved
          // Это нужно, чтобы лидерборд и пересчет звезд видели достижение
          await supabase
            .from('assignment_submissions')
            .insert({
              user_id: dist.user_id,
              assignment_id: assignmentId,
              content: content,
              status: 'approved',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          // Добавляем баллы в транзакции
          await supabase
            .from('points_transactions')
            .insert({
              user_id: dist.user_id,
              points: assignment.reward,
              reason: `Участие в случайном числе: ${assignment.title}`
            });

          // Обновляем total_points пользователя
          const { data: userData } = await supabase
            .from('users')
            .select('total_points')
            .eq('id', dist.user_id)
            .single();

          const currentPoints = userData?.total_points || 0;
          await supabase
            .from('users')
            .update({ total_points: currentPoints + assignment.reward })
            .eq('id', dist.user_id);

          // Пересчитываем звёздочки
          await this.recalculateUserStars(dist.user_id);

          awardedCount++;
        } else {
            // Если submission уже есть, просто убедимся что звезды пересчитаны
            // (на случай если статус поменялся или логика изменилась)
            await this.recalculateUserStars(dist.user_id);
        }
      } catch (err) {
        logger.error(`Error awarding stars to participant ${dist.user_id}`, err instanceof Error ? err : new Error(String(err)));
      }
    }

    return awardedCount;
  }

  // === Leaderboard ===

  static async getLeaderboard(): Promise<{ user_id: string; user: any; approved_count: number; total_reward: number }[]> {
    // Get all approved submissions with user and assignment data
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('user_id, user:users(id, first_name, last_name, telegram_username, direction), assignment:assignments(reward)')
      .eq('status', 'approved');

    if (error) throw error;

    // Aggregate by user
    const userMap = new Map<string, { user: any; approved_count: number; total_reward: number }>();
    
    (data || []).forEach((sub: any) => {
      const existing = userMap.get(sub.user_id);
      const reward = sub.assignment?.reward || 0;
      
      if (existing) {
        existing.approved_count += 1;
        existing.total_reward += reward;
      } else {
        userMap.set(sub.user_id, {
          user: sub.user,
          approved_count: 1,
          total_reward: reward
        });
      }
    });

    // Convert to array and sort by total_reward desc
    const leaderboard = Array.from(userMap.entries())
      .map(([user_id, data]) => ({ user_id, ...data }))
      .sort((a, b) => b.total_reward - a.total_reward);

    return leaderboard;
  }
}
