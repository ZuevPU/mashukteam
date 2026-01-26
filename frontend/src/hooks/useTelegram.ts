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
    // Проверка наличия Telegram WebApp
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Инициализация WebApp
      tg.ready();
      tg.expand(); // Разворачиваем на весь экран
      
      setWebApp(tg);
      setInitData(tg.initData || null);
      setIsReady(true);

      // Включаем вибрацию при необходимости
      // tg.enableClosingConfirmation();
    } else {
      console.warn('Telegram WebApp не обнаружен. Запуск в режиме разработки.');
      setIsReady(true);
    }
  }, []);

  return {
    webApp,
    initData,
    isReady,
  };
}
