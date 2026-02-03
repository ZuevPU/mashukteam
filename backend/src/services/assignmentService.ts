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

  static async createAssignment(data: CreateAssignmentDto): Promise<Assignment> {
    // Подготавливаем данные для вставки (только поля, которые есть в таблице assignments)
    const assignmentData: any = {
      title: data.title,
      description: data.description,
      answer_format: data.answer_format,
      reward: data.reward,
      target_type: data.target_type,
      target_values: data.target_values,
    };

    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert(assignmentData)
      .select()
      .single();

    if (error) throw error;

    // Если тип random_number, создаем рандомайзер
    if (data.answer_format === 'random_number' && assignment) {
      try {
        const randomizerData = {
          assignment_id: assignment.id,
          tables_count: data.tables_count || 20,
          participants_per_table: data.participants_per_table || 4,
          topic: data.title,
          description: data.description || null,
          status: 'open',
          randomizer_mode: data.randomizer_mode || 'tables',
          number_min: data.number_min || 1,
          number_max: data.number_max || 100,
        };

        const { error: randomizerError } = await supabase
          .from('randomizer_questions')
          .insert(randomizerData);

        if (randomizerError) {
          logger.error('Error creating randomizer for assignment', randomizerError);
          // Не прерываем создание задания, если не удалось создать рандомайзер
        }
      } catch (randomizerErr) {
        logger.error('Error creating randomizer for assignment', randomizerErr instanceof Error ? randomizerErr : new Error(String(randomizerErr)));
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

    // Получаем всех участников
    const { data: participants, error } = await supabase
      .from('randomizer_participants')
      .select('user_id')
      .eq('randomizer_id', randomizer.id);

    if (error || !participants?.length) {
      return 0;
    }

    // Начисляем звёздочки каждому участнику
    let awardedCount = 0;
    for (const participant of participants) {
      try {
        // Добавляем баллы
        await supabase
          .from('points_transactions')
          .insert({
            user_id: participant.user_id,
            points: assignment.reward,
            reason: `Участие в случайном числе: ${assignment.title}`
          });

        // Обновляем total_points
        const { data: userData } = await supabase
          .from('users')
          .select('total_points')
          .eq('id', participant.user_id)
          .single();

        const currentPoints = userData?.total_points || 0;
        await supabase
          .from('users')
          .update({ total_points: currentPoints + assignment.reward })
          .eq('id', participant.user_id);

        // Пересчитываем звёздочки (учитывая только одобренные задания)
        await this.recalculateUserStars(participant.user_id);

        awardedCount++;
      } catch (err) {
        logger.error(`Error awarding stars to participant ${participant.user_id}`, err instanceof Error ? err : new Error(String(err)));
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
