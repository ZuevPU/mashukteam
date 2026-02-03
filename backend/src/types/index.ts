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
  direction?: string; // Направление пользователя (назначенное администратором)
  total_points?: number;
  current_level?: number;
  reflection_level?: number; // Уровень рефлексии (1-5)
  reflection_points?: number; // Баллы рефлексии
  stars_count?: number; // Количество собранных звездочек за выполненные задания
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  speaker?: string;
  description?: string;
  admin_comment?: string; // Комментарий администратора (отображается курсивом)
  footer_text?: string; // Текст в конце диагностики (после всех вопросов)
  audience?: string;
  event_date?: string;
  event_time?: string;
  start_time?: string; // Время начала
  end_time?: string; // Время окончания
  location?: string; // Место проведения
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
  target_audience: 'all' | 'by_direction' | 'individual';
  target_values?: string[];
  status: 'draft' | 'published' | 'archived';
  reflection_points?: number;
  group_name?: string; // Название группы вопросов
  group_order?: number; // Порядок группы для сортировки
  question_order?: number; // Порядок вопроса внутри группы
  scheduled_at?: string; // Время запланированной публикации
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
  target_audience: 'all' | 'by_direction' | 'individual';
  target_values?: string[];
  reflection_points?: number;
  status?: 'draft' | 'published' | 'archived';
  group_name?: string;
  group_order?: number;
  question_order?: number;
  scheduled_at?: string;
}

export type QuestionType = 'single' | 'multiple' | 'scale' | 'text' | 'randomizer';

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
  admin_comment?: string; // Комментарий администратора (отображается курсивом)
  footer_text?: string; // Текст в конце диагностики (после всех вопросов)
  audience?: string;
  event_date?: string;
  event_time?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
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

export interface ExportFilters {
  dateFrom?: string;
  dateTo?: string;
  direction?: string;
  eventId?: string;
}

// === Assignments (Задания) ===

export type AssignmentFormat = 'text' | 'number' | 'link' | 'random_number' | 'photo_upload';
export type AssignmentTargetType = 'all' | 'direction' | 'individual';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type RandomizerMode = 'simple' | 'tables';

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  answer_format: AssignmentFormat;
  reward: number;
  target_type: AssignmentTargetType;
  target_values?: string[];
  status: 'draft' | 'published';
  scheduled_at?: string; // Время запланированной публикации
  created_at: string;
  // Поля для random_number
  randomizer_mode?: RandomizerMode;
  tables_count?: number;
  participants_per_table?: number;
  number_min?: number;
  number_max?: number;
}

export interface AssignmentSubmission {
  id: string;
  user_id: string;
  assignment_id: string;
  content: string;
  file_url?: string; // URL загруженного файла в Supabase Storage
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
  scheduled_at?: string;
  // Поля для random_number
  randomizer_mode?: RandomizerMode;
  tables_count?: number;
  participants_per_table?: number;
  number_min?: number;
  number_max?: number;
}

export interface SubmitAssignmentDto {
  content: string;
  file_url?: string; // URL загруженного файла
}

export interface ModerateSubmissionDto {
  status: 'approved' | 'rejected';
  admin_comment?: string;
}

// Рандомайзеры
export interface RandomizerQuestion {
  id: string;
  question_id?: string; // Deprecated: используйте assignment_id
  assignment_id?: string; // Новая связь с заданиями
  tables_count: number;
  participants_per_table: number;
  topic: string;
  description: string;
  status: 'open' | 'closed' | 'distributed';
  randomizer_mode: RandomizerMode;
  number_min?: number;
  number_max?: number;
  created_at: string;
  distributed_at?: string;
}

export interface RandomizerParticipant {
  id: string;
  randomizer_id: string;
  user_id: string;
  participated_at: string;
}

export interface RandomizerDistribution {
  id: string;
  randomizer_id: string;
  user_id: string;
  table_number: number;
  random_number?: number; // Сгенерированное число для простого режима
  distributed_at: string;
  preview_mode?: boolean;
  user?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'event' | 'question' | 'assignment' | 'diagnostic' | 'achievement' | 'randomizer' | 'assignment_result';
  title: string;
  message: string;
  deep_link?: string;
  read: boolean;
  created_at: string;
}

export interface CreateRandomizerDto {
  question_id?: string; // Deprecated: используйте assignment_id
  assignment_id?: string; // Новая связь с заданиями
  tables_count: number;
  participants_per_table: number;
  topic: string;
  description?: string;
  randomizer_mode?: RandomizerMode;
  number_min?: number;
  number_max?: number;
}

// === Broadcasts (Рассылки) ===

export type BroadcastTargetType = 'all' | 'by_direction' | 'individual';
export type BroadcastStatus = 'draft' | 'sent' | 'scheduled';

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  image_url?: string;
  target_type: BroadcastTargetType;
  target_values?: string[];
  status: BroadcastStatus;
  scheduled_at?: string;
  sent_at?: string;
  sent_count: number;
  failed_count: number;
  created_by?: string;
  created_at: string;
}

export interface CreateBroadcastDto {
  title: string;
  message: string;
  image_url?: string;
  target_type: BroadcastTargetType;
  target_values?: string[];
  scheduled_at?: string;
}

export interface UpdateBroadcastDto {
  title?: string;
  message?: string;
  image_url?: string;
  target_type?: BroadcastTargetType;
  target_values?: string[];
  scheduled_at?: string;
}
