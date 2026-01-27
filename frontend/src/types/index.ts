// Типы для Frontend

export type QuestionType = 'single' | 'multiple' | 'scale' | 'text';

export interface User {
  id: string;
  telegram_id: number;
  telegram_username: string | null;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  motivation: string;
  status: 'new' | 'registered';
  is_admin?: number;
  user_type?: string; // Тип пользователя
  total_points?: number;
  current_level?: number;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  speaker?: string;
  description?: string;
  audience?: string;
  event_date?: string;
  event_time?: string;
  status: 'draft' | 'published' | 'completed';
  type: 'event' | 'diagnostic';
  created_at: string;
}

export interface Question {
  id: string;
  event_id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  char_limit?: number;
  order_index?: number;
}

export interface Answer {
  id: string;
  user_id: string;
  event_id: string;
  question_id: string;
  answer_data: any;
  created_at: string;
  questions?: Question;
  events?: Event;
}

export interface TargetedQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  char_limit?: number;
  target_audience: 'all' | 'by_type' | 'individual';
  target_values?: string[];
  status: 'draft' | 'published' | 'archived';
  created_at: string;
}

export interface TargetedAnswer {
  id: string;
  user_id: string;
  question_id: string;
  answer_data: any;
  created_at: string;
}

// DTOs

export interface RegistrationData {
  first_name: string;
  last_name: string;
  middle_name?: string;
  motivation: string;
}

export interface CreateEventRequest {
  title: string;
  speaker?: string;
  description?: string;
  audience?: string;
  event_date?: string;
  event_time?: string;
  type?: 'event' | 'diagnostic';
  status?: 'draft' | 'published' | 'completed';
}

export interface CreateQuestionRequest {
  text: string;
  type: QuestionType;
  options?: string[];
  char_limit?: number;
}

export interface CreateTargetedQuestionRequest {
  text: string;
  type: QuestionType;
  options?: string[];
  char_limit?: number;
  target_audience: 'all' | 'by_type' | 'individual';
  target_values?: string[];
}

// Gamification Types

export interface PointsTransaction {
  id: string;
  user_id: string;
  points: number;
  reason: string | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  points_reward: number;
  created_at: string;
  unlocked_at?: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

export interface UserStats {
  user_id: string;
  total_points: number;
  current_level: number;
  experience_points: number;
  experience_to_next_level: number;
  achievements_count: number;
  recent_achievements: Achievement[];
  recent_points_transactions: PointsTransaction[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  user?: Partial<User>;
}

// === Assignments (Задания) ===

export interface UserType {
  id: number;
  name: string;
  slug: string;
}

export type AssignmentFormat = 'text' | 'number' | 'link';
export type AssignmentTargetType = 'all' | 'user_type' | 'individual';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  answer_format: AssignmentFormat;
  reward: number;
  target_type: AssignmentTargetType;
  target_values?: string[];
  status: 'draft' | 'published';
  created_at: string;
}

export interface AssignmentSubmission {
  id: string;
  user_id: string;
  assignment_id: string;
  content: string;
  status: SubmissionStatus;
  admin_comment?: string;
  created_at: string;
  updated_at: string;
  user?: User;
  assignment?: Assignment;
}

export interface CreateAssignmentRequest {
  title: string;
  description?: string;
  answer_format: AssignmentFormat;
  reward: number;
  target_type: AssignmentTargetType;
  target_values?: string[];
}
