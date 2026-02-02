// Типы для работы с Telegram Mini App

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
  direction_id?: string; // ID направления
  direction_selected_at?: string; // Дата выбора направления
  total_points?: number;
  current_level?: number;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'auto';
  notifications_enabled: boolean;
  notification_events: boolean;
  notification_questions: boolean;
  notification_assignments: boolean;
  notification_diagnostics: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserPreferencesDto {
  theme?: 'light' | 'dark' | 'auto';
  notifications_enabled?: boolean;
  notification_events?: boolean;
  notification_questions?: boolean;
  notification_assignments?: boolean;
  notification_diagnostics?: boolean;
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
  type: 'event' | 'diagnostic'; // Тип события
  group_name?: string; // Название группы (например, "День 1")
  group_order?: number; // Порядок группы для сортировки
  event_order?: number; // Порядок мероприятия внутри группы
  created_at: string;
  updated_at: string;
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

export interface CreateTargetedQuestionDto {
  text: string;
  type: QuestionType;
  options?: string[];
  char_limit?: number;
  target_audience: 'all' | 'by_type' | 'individual';
  target_values?: string[];
}

export type QuestionType = 'single' | 'multiple' | 'scale' | 'text';

export interface Question {
  id: string;
  event_id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // JSON array of strings
  char_limit?: number;
  created_at: string;
  order_index?: number;
}

export interface Answer {
  id: string;
  user_id: string;
  event_id: string;
  question_id: string;
  answer_data: any;
  created_at: string;
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  answer_format: 'text' | 'number' | 'link';
  reward: number;
  target_type: 'all' | 'user_type' | 'individual';
  target_values?: string[];
  status: 'draft' | 'published';
  created_at: string;
}

export interface AssignmentSubmission {
  id: string;
  user_id: string;
  assignment_id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_comment?: string;
  created_at: string;
  updated_at: string;
}

export interface UserType {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export interface Direction {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  user_id: string;
  total_points: number;
  current_level: number;
  experience_points: number;
  experience_to_next_level: number;
  achievements_count: number;
  reflection_level?: number;
  reflection_points?: number;
  reflection_to_next_level?: number;
}
