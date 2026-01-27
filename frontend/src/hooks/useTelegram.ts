import { useEffect, useState } from 'react';
import { WebApp } from '@twa-dev/types';

/**
 * Хук для работы с Telegram WebApp SDK
 */
export function useTelegram() {
  const [webApp, setWebApp] = useState<WebApp | null>(null);
  const [initData, setInitData] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Функция для получения initData
    const getInitData = (): string | null => {
      if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
        return null;
      }
      
      const tg = window.Telegram.WebApp;
      
      // Пробуем получить initData разными способами
      if (tg.initData && tg.initData.length > 0) {
        return tg.initData;
      }
      
      // Если initData пустой, пробуем получить из initDataUnsafe
      if (tg.initDataUnsafe && tg.initDataUnsafe.hash) {
        // Собираем initData из initDataUnsafe
        const params = new URLSearchParams();
        if (tg.initDataUnsafe.user) {
          params.append('user', JSON.stringify(tg.initDataUnsafe.user));
        }
        params.append('auth_date', tg.initDataUnsafe.auth_date.toString());
        params.append('hash', tg.initDataUnsafe.hash);
        return params.toString();
      }
      
      return null;
    };

    // Проверка наличия Telegram WebApp
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp as WebApp;
      
      // Инициализация WebApp
      tg.ready();
      tg.expand(); // Разворачиваем на весь экран
      
      setWebApp(tg);
      
      // Получаем initData
      const data = getInitData();
      setInitData(data);
      
      // Логируем для отладки
      console.log('Telegram WebApp инициализирован:', {
        hasInitData: !!data,
        initDataLength: data?.length || 0,
        hasUser: !!tg.initDataUnsafe?.user,
      });
      
      setIsReady(true);

      // Включаем вибрацию при необходимости
      // tg.enableClosingConfirmation();
    } else {
      console.warn('Telegram WebApp не обнаружен. Запуск в режиме разработки.');
      setIsReady(true);
    }
  }, []);

  const showAlert = (message: string) => {
    if (webApp) {
      webApp.showAlert(message);
    } else {
      alert(message);
    }
  };

  return {
    webApp,
    initData,
    isReady,
    showAlert,
  };
}
