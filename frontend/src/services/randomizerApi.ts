import { buildApiEndpoint } from '../utils/apiUrl';

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

export interface RandomizerQuestion {
  id: string;
  question_id?: string; // Deprecated: используйте assignment_id
  assignment_id?: string; // Новая связь с заданиями
  tables_count: number;
  participants_per_table: number;
  topic: string;
  description: string;
  status: 'open' | 'closed' | 'distributed';
  randomizer_mode: 'simple' | 'tables';
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
  distributed_at: string;
}

export interface CreateRandomizerRequest {
  question_id: string;
  tables_count: number;
  participants_per_table: number;
  topic: string;
  description?: string;
}

export const randomizerApi = {
  /**
   * Создание рандомайзера (админ)
   */
  createRandomizer: async (initData: string, data: CreateRandomizerRequest): Promise<RandomizerQuestion> => {
    const response = await fetchApi<{ success: boolean; randomizer: RandomizerQuestion }>(
      '/randomizer/create',
      {
        method: 'POST',
        body: JSON.stringify({ initData, ...data }),
      }
    );
    return response.randomizer;
  },

  /**
   * Участие в рандомайзере
   */
  participate: async (initData: string, randomizerId: string): Promise<RandomizerParticipant> => {
    const response = await fetchApi<{ success: boolean; participant: RandomizerParticipant }>(
      '/randomizer/participate',
      {
        method: 'POST',
        body: JSON.stringify({ initData, randomizer_id: randomizerId }),
      }
    );
    return response.participant;
  },

  /**
   * Подведение итогов и распределение (админ)
   */
  distribute: async (initData: string, randomizerId: string): Promise<RandomizerDistribution[]> => {
    const response = await fetchApi<{ success: boolean; distributions: RandomizerDistribution[] }>(
      '/randomizer/distribute',
      {
        method: 'POST',
        body: JSON.stringify({ initData, randomizer_id: randomizerId }),
      }
    );
    return response.distributions;
  },

  /**
   * Получение рандомайзеров пользователя
   */
  getMyRandomizers: async (initData: string): Promise<Array<{
    randomizer: RandomizerQuestion;
    isParticipant: boolean;
    distribution?: RandomizerDistribution;
  }>> => {
    const response = await fetchApi<{ success: boolean; randomizers: Array<{
      randomizer: RandomizerQuestion;
      isParticipant: boolean;
      distribution?: RandomizerDistribution;
    }> }>(
      '/randomizer/my',
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }
    );
    return response.randomizers;
  },

  /**
   * Получение данных рандомайзера
   */
  getRandomizer: async (initData: string, randomizerId: string): Promise<{
    randomizer: RandomizerQuestion;
    isParticipant: boolean;
    distribution?: RandomizerDistribution;
    participantsCount: number;
  }> => {
    const response = await fetchApi<{ success: boolean; randomizer: RandomizerQuestion; isParticipant: boolean; distribution?: RandomizerDistribution; participantsCount: number }>(
      `/randomizer/${randomizerId}`,
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }
    );
    return response;
  },

  /**
   * Получение распределений рандомайзера (админ)
   */
  getDistributions: async (initData: string, randomizerId: string): Promise<Array<RandomizerDistribution & { user: { id: string; first_name: string; last_name: string; middle_name: string | null } }>> => {
    const response = await fetchApi<{ success: boolean; distributions: Array<RandomizerDistribution & { user: { id: string; first_name: string; last_name: string; middle_name: string | null } }> }>(
      `/randomizer/${randomizerId}/distributions`,
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }
    );
    return response.distributions;
  },

  /**
   * Создание предпросмотра распределения (админ)
   */
  createPreview: async (initData: string, randomizerId: string): Promise<RandomizerDistribution[]> => {
    const response = await fetchApi<{ success: boolean; distributions: RandomizerDistribution[] }>(
      '/admin/randomizer/preview',
      {
        method: 'POST',
        body: JSON.stringify({ initData, randomizer_id: randomizerId }),
      }
    );
    return response.distributions;
  },

  /**
   * Получение предпросмотра распределения (админ)
   */
  getPreview: async (initData: string, randomizerId: string): Promise<RandomizerDistribution[]> => {
    const response = await fetchApi<{ success: boolean; distributions: RandomizerDistribution[] }>(
      `/admin/randomizer/${randomizerId}/preview`,
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }
    );
    return response.distributions;
  },

  /**
   * Изменение стола участника в предпросмотре (админ)
   */
  updateDistribution: async (initData: string, randomizerId: string, userId: string, tableNumber: number): Promise<RandomizerDistribution> => {
    const response = await fetchApi<{ success: boolean; distribution: RandomizerDistribution }>(
      `/admin/randomizer/${randomizerId}/distribution`,
      {
        method: 'PATCH',
        body: JSON.stringify({ initData, user_id: userId, table_number: tableNumber }),
      }
    );
    return response.distribution;
  },

  /**
   * Публикация финального распределения (админ)
   */
  publishDistribution: async (initData: string, randomizerId: string): Promise<RandomizerDistribution[]> => {
    const response = await fetchApi<{ success: boolean; distributions: RandomizerDistribution[] }>(
      `/admin/randomizer/${randomizerId}/publish`,
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }
    );
    return response.distributions;
  },

  /**
   * Получение списка участников рандомайзера (админ)
   */
  getParticipants: async (initData: string, randomizerId: string): Promise<Array<RandomizerParticipant & { user: { id: string; first_name: string; last_name: string; middle_name: string | null; telegram_username: string | null } }>> => {
    const response = await fetchApi<{ success: boolean; participants: Array<RandomizerParticipant & { user: { id: string; first_name: string; last_name: string; middle_name: string | null; telegram_username: string | null } }> }>(
      `/randomizer/${randomizerId}/participants`,
      {
        method: 'POST',
        body: JSON.stringify({ initData }),
      }
    );
    return response.participants;
  },
};
