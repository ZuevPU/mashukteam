// Типы для Frontend

export interface User {
  id: string;
  telegram_id: number;
  telegram_username: string | null;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  motivation: string;
  status: 'new' | 'registered';
  is_admin?: number; // 0 или 1
  total_points?: number;
  current_level?: number;
  created_at: string;
  updated_at: string;
}

export type QuestionType = 'single' | 'multiple' | 'scale' | 'text';

export interface Event {
  id: string;
  title: string;
  speaker?: string;
  description?: string;
  audience?: string;
  event_date?: string;
  event_time?: string;
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
  questions?: Question; // joined
  events?: Event; // joined
}

export interface CreateEventRequest {
  title: string;
  speaker?: string;
  description?: string;
  audience?: string;
  event_date?: string;
  event_time?: string;
}

export interface CreateQuestionRequest {
  text: string;
  type: QuestionType;
  options?: string[];
  char_limit?: number;
}


export interface RegistrationData {
  first_name: string;
  last_name: string;
  middle_name?: string;
  motivation: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  user?: Partial<User>;
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
  unlocked_at?: string;
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

export interface AddPointsRequest {
  points: number;
  reason?: string;
}

export interface UnlockAchievementRequest {
  achievement_id: string;
}
