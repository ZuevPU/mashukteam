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
  created_at: string;
  updated_at: string;
}

export interface CreateUserDto {
  telegram_id: number;
  telegram_username?: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  motivation: string;
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

// Будущие типы для геймификации
export interface UserPoints {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  points_reward: number;
  created_at: string;
}

export interface UserLevel {
  id: string;
  user_id: string;
  level: number;
  experience_points: number;
  updated_at: string;
}
