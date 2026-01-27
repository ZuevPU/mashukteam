/**
 * API клиент для взаимодействия с backend
 */

import {
  PointsTransaction,
  Achievement,
  UserAchievement,
  UserStats,
} from '../types';

// Получаем API URL из переменных окружения
// В production это должен быть URL вашего бэкенда на Vercel
let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Убираем завершающий слэш, если есть
API_URL = API_URL.replace(/\/+$/, '');

// Логируем используемый API URL для отладки
if (typeof window !== 'undefined') {
  console.log('API Configuration:', {
    apiUrl: API_URL,
    hasEnvVar: !!import.meta.env.VITE_API_URL,
    envValue: import.meta.env.VITE_API_URL,
  });
}

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
  // Нормализуем endpoint - убираем начальный слэш
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  // Формируем URL без двойных слэшей
  const url = `${API_URL.replace(/\/+$/, '')}/api/${cleanEndpoint}`;
  
  // Логируем запрос для отладки
  console.log('API Request:', {
    method: options.method || 'GET',
    url,
    apiUrl: API_URL,
    hasBody: !!options.body,
    bodyPreview: options.body ? String(options.body).substring(0, 100) : undefined,
  });
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Логируем ответ для отладки
    console.log('API Response:', {
      status: response.status,
      statusText: response.statusText,
      url,
      ok: response.ok,
    });

    if (!response.ok) {
      let errorData: ApiError;
      try {
        const text = await response.text();
        console.log('Error response text:', text);
        errorData = JSON.parse(text);
      } catch (parseError) {
        errorData = {
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      
      console.error('API Error:', errorData);
      throw new Error(errorData.error || 'Ошибка запроса');
    }

    const data = await response.json();
    console.log('API Success:', { url, data: Object.keys(data) });
    return data;
  } catch (error) {
    // Обработка сетевых ошибок
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error:', {
        url,
        apiUrl: API_URL,
        error: error.message,
      });
      throw new Error(
        `Не удалось подключиться к серверу. Проверьте, что API_URL настроен правильно (текущий: ${API_URL})`
      );
    }
    throw error;
  }
}

/**
 * Базовый fetch для запросов с initData в body (используем POST для всех запросов с аутентификацией)
 */
async function fetchApiWithAuth<T>(
  endpoint: string,
  initData: string
): Promise<T> {
  return fetchApi<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify({ initData }),
  });
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
 * API методы для геймификации
 */

/**
 * Начисление баллов пользователю
 */
export async function addPoints(initData: string, points: number, reason?: string) {
  return fetchApi<{
    success: boolean;
    transaction: PointsTransaction;
    total_points: number;
  }>('/gamification/points/add', {
    method: 'POST',
    body: JSON.stringify({ initData, points, reason }),
  });
}

/**
 * Получение истории баллов пользователя
 */
export async function getUserPoints(userId: string, initData: string) {
  return fetchApiWithAuth<{
    success: boolean;
    points: PointsTransaction[];
    total_points: number;
  }>(`/gamification/points/${userId}`, initData);
}

/**
 * Получение достижений пользователя
 */
export async function getUserAchievements(userId: string, initData: string) {
  return fetchApiWithAuth<{
    success: boolean;
    user_achievements: UserAchievement[];
    all_achievements: Achievement[];
    unlocked_count: number;
    total_count: number;
  }>(`/gamification/achievements/${userId}`, initData);
}

/**
 * Разблокировка достижения
 */
export async function unlockAchievement(initData: string, achievementId: string) {
  return fetchApi<{
    success: boolean;
    achievement: UserAchievement;
    message: string;
  }>('/gamification/achievements/unlock', {
    method: 'POST',
    body: JSON.stringify({ initData, achievement_id: achievementId }),
  });
}

/**
 * Получение статистики пользователя
 */
export async function getUserStats(userId: string, initData: string) {
  return fetchApiWithAuth<{
    success: boolean;
    stats: UserStats;
  }>(`/gamification/stats/${userId}`, initData);
}

/**
 * Повышение уровня
 */
export async function levelUp(initData: string) {
  return fetchApi<{
    success: boolean;
    level: {
      id: string;
      user_id: string;
      level: number;
      experience_points: number;
      updated_at: string;
    };
    message: string;
  }>('/gamification/level/up', {
    method: 'POST',
    body: JSON.stringify({ initData }),
  });
}
