import { buildApiEndpoint } from '../utils/apiUrl';

export interface UploadResponse {
  success: boolean;
  file_url: string;
  path: string;
}

export const uploadApi = {
  /**
   * Загрузка файла для задания
   */
  uploadTaskFile: async (file: File, assignmentId: string, initData: string): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('assignmentId', assignmentId);
    formData.append('initData', initData);

    const response = await fetch(buildApiEndpoint('/upload/task'), {
      method: 'POST',
      body: formData,
      // Не устанавливаем Content-Type, браузер сам добавит boundary для multipart/form-data
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Ошибка загрузки' }));
      throw new Error(errorData.error || 'Ошибка загрузки файла');
    }

    return response.json();
  },

  /**
   * Получение подписанного URL для приватного файла
   */
  getSignedUrl: async (path: string, initData: string): Promise<string> => {
    const response = await fetch(buildApiEndpoint('/upload/signed-url'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path, initData }),
    });

    if (!response.ok) {
      throw new Error('Ошибка получения URL');
    }

    const data = await response.json();
    return data.signed_url;
  },
};
