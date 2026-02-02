/**
 * Утилита для формирования правильных API URL без двойных слэшей
 */

export function getApiUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  // Убираем все завершающие слэши
  return apiUrl.replace(/\/+$/, '');
}

export function buildApiEndpoint(endpoint: string): string {
  const baseUrl = getApiUrl();
  // Убираем начальный слэш из endpoint, если есть
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  // Формируем URL без двойных слэшей
  return `${baseUrl}/api/${cleanEndpoint}`;
}
