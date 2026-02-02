import { buildApiEndpoint } from '../utils/apiUrl';
import { UserPreferences, UpdateUserPreferencesDto } from '../types';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(buildApiEndpoint(endpoint), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Ошибка запроса');
  }

  return response.json();
}

export const userPreferencesApi = {
  /**
   * Получение настроек пользователя
   */
  getPreferences: async (initData: string): Promise<UserPreferences> => {
    const response = await fetchApi<{ success: boolean; preferences: UserPreferences }>(
      '/user/preferences',
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }
    );
    return response.preferences;
  },

  /**
   * Обновление настроек пользователя
   */
  updatePreferences: async (
    preferences: UpdateUserPreferencesDto,
    initData: string
  ): Promise<UserPreferences> => {
    const response = await fetchApi<{ success: boolean; preferences: UserPreferences }>(
      '/user/preferences',
      {
        method: 'PATCH',
        body: JSON.stringify({ initData, ...preferences }),
      }
    );
    return response.preferences;
  },
};
