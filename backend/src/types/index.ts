// Типы для работы с Telegram Mini App

export interface TelegramInitData {
  query_id?: string;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  auth_date: number;
  hash: string;
}

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
  reflection_level?: number; // Уровень рефлексии (1-5)
  reflection_points?: number; // Баллы рефлексии
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

export interface CreateEventDto {
  title: string;
  speaker?: string;
  description?: string;
  audience?: string;
  event_date?: string;
  event_time?: string;
  group_name?: string;
  group_order?: number;
  event_order?: number;
}

export interface CreateQuestionDto {
  text: string;
  type: QuestionType;
  options?: string[];
  char_limit?: number;
}

export interface SubmitAnswerDto {
  question_id: string;
  answer_data: any;
}


export interface CreateUserDto {
  telegram_id: number;
  telegram_username?: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  motivation?: string;
}

export interface UpdateUserStatusDto {
  status: 'new' | 'registered';
}

export interface RegistrationStep1Dto {
  first_name: string;
}

export interface RegistrationStep2Dto {
  last_name: string;
  middle_name?: string;
}

export interface RegistrationStep3Dto {
  motivation: string;
}

// Типы для геймификации

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
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

export interface UserLevel {
  id: string;
  user_id: string;
  level: number;
  experience_points: number;
  updated_at: string;
}

export interface UserAction {
  id: string;
  user_id: string;
  action_type: string;
  action_data: Record<string, any> | null;
  created_at: string;
}

// DTO для создания транзакций баллов
export interface AddPointsDto {
  points: number;
  reason?: string;
}

// DTO для разблокировки достижения
export interface UnlockAchievementDto {
  achievement_id: string;
}

// Статистика пользователя
export interface UserStats {
  user_id: string;
  total_points: number;
  current_level: number;
  experience_points: number;
  experience_to_next_level: number;
  achievements_count: number;
  recent_achievements: Achievement[];
  recent_points_transactions: PointsTransaction[];
  reflection_level?: number;
  reflection_points?: number;
  reflection_to_next_level?: number;
}

// Действие рефлексии
export interface ReflectionAction {
  id: string;
  user_id: string;
  action_type: 'event_answer' | 'diagnostic_answer' | 'targeted_answer' | 'assignment_completed';
  points_awarded: number;
  created_at: string;
}

// === Directions (Направления) ===

export interface Direction {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDirectionDto {
  name: string;
  slug: string;
  description?: string;
}

// === Assignments (Задания) ===

export interface UserType {
  id: number;
  name: string;
  slug: string;
  created_at: string;
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
  // Joined data
  user?: User;
  assignment?: Assignment;
}

export interface CreateAssignmentDto {
  title: string;
  description?: string;
  answer_format: AssignmentFormat;
  reward: number;
  target_type: AssignmentTargetType;
  target_values?: string[];
}

export interface SubmitAssignmentDto {
  content: string;
}

export interface ModerateSubmissionDto {
  status: 'approved' | 'rejected';
  admin_comment?: string;
}
