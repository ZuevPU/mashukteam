import { supabase } from './supabase';
import { 
  Assignment, 
  AssignmentSubmission, 
  CreateAssignmentDto, 
  SubmitAssignmentDto,
  ModerateSubmissionDto,
  Direction 
} from '../types';

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
    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
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

    const { data: submission, error } = await supabase
      .from('assignment_submissions')
      .insert({
        user_id: userId,
        assignment_id: assignmentId,
        content: data.content,
        status: 'pending'
      })
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

    // Если статус approved — начисляем баллы
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
    }

    return submission as AssignmentSubmission;
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
