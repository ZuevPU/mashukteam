/**
 * API клиент для взаимодействия с backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ApiError {
  error: string;
  success?: boolean;
}

/**
 * Получение initData из Telegram WebApp
 */
export function getInitData(): string | null {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
    return null;
  }
  
  return window.Telegram.WebApp.initData || null;
}

/**
 * Базовый fetch с обработкой ошибок
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}/api${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      error: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(error.error || 'Ошибка запроса');
  }

  return response.json();
}

/**
 * Проверка аутентификации через initData
 */
export async function verifyAuth(initData: string) {
  return fetchApi<{
    success: boolean;
    user: {
      id: string;
      telegram_id: number;
      status: string;
      first_name: string;
    };
  }>('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ initData }),
  });
}

/**
 * Получение статуса пользователя
 */
export async function getUserStatus(initData: string) {
  return fetchApi<{
    success: boolean;
    exists: boolean;
    status: 'new' | 'registered' | null;
    user?: {
      id: string;
      telegram_id: number;
      first_name: string;
      status: string;
    };
  }>('/user/status', {
    method: 'POST',
    body: JSON.stringify({ initData }),
  });
}

/**
 * Завершение регистрации пользователя
 */
export async function registerUser(
  initData: string,
  registrationData: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    motivation: string;
  }
) {
  return fetchApi<{
    success: boolean;
    user: any;
    message: string;
  }>('/user/register', {
    method: 'POST',
    body: JSON.stringify({
      initData,
      registrationData,
    }),
  });
}

/**
 * ============================================
 * БУДУЩИЕ API МЕТОДЫ ДЛЯ ГЕЙМИФИКАЦИИ
 * ============================================
 * 
 * export async function getUserPoints(userId: string) {
 *   return fetchApi<Points>(`/gamification/points/${userId}`);
 * }
 * 
 * export async function addPoints(userId: string, points: number, reason: string) {
 *   return fetchApi('/gamification/points/add', {
 *     method: 'POST',
 *     body: JSON.stringify({ userId, points, reason }),
 *   });
 * }
 * 
 * export async function getUserAchievements(userId: string) {
 *   return fetchApi<Achievement[]>(`/gamification/achievements/${userId}`);
 * }
 * 
 * export async function getUserStats(userId: string) {
 *   return fetchApi<UserStats>(`/gamification/stats/${userId}`);
 * }
 */
