/**
 * Утилита для формирования правильных API URL без двойных слэшей
 */

export function getApiUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  // Убираем все завершающие слэши и пробелы
  const cleaned = apiUrl.trim().replace(/\/+$/, '');
  return cleaned;
}

export function buildApiEndpoint(endpoint: string): string {
  // Получаем базовый URL и гарантированно убираем завершающий слэш
  let baseUrl = getApiUrl();
  baseUrl = baseUrl.trim().replace(/\/+$/, '');
  
  // Очищаем endpoint: убираем начальные слэши и пробелы
  let cleanEndpoint = endpoint.trim().replace(/^\/+/, '');
  
  // Убираем "api/" из начала endpoint, если он там есть (чтобы избежать дублирования)
  if (cleanEndpoint.startsWith('api/')) {
    cleanEndpoint = cleanEndpoint.replace(/^api\/+/, '');
  }
  
  // Формируем части URL
  const parts = [baseUrl, 'api', cleanEndpoint].filter(Boolean);
  
  // Собираем URL, добавляя слэш между частями
  let url = parts.join('/');
  
  // Нормализуем URL: заменяем все последовательности из 2+ слэшей на один слэш
  // Но сохраняем :// для протокола
  url = url.replace(/([^:]\/)\/+/g, '$1');
  
  // Логируем для отладки (включая production для диагностики)
  console.log('buildApiEndpoint:', { 
    originalApiUrl: import.meta.env.VITE_API_URL,
    baseUrl, 
    endpoint, 
    cleanEndpoint,
    parts,
    finalUrl: url 
  });
  
  return url;
}
