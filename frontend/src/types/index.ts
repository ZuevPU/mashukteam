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
  created_at: string;
  updated_at: string;
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

// Будущие типы для геймификации
export interface Points {
  total: number;
  history: Array<{
    id: string;
    points: number;
    reason: string;
    created_at: string;
  }>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  unlocked_at?: string;
}

export interface UserStats {
  level: number;
  experience_points: number;
  total_points: number;
  achievements_count: number;
}
