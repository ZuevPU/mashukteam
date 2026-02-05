import { useState, useEffect, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface PWAStatus {
  needRefresh: boolean;
  offlineReady: boolean;
  isOnline: boolean;
}

interface UsePWAReturn extends PWAStatus {
  updateServiceWorker: () => void;
  closePrompt: () => void;
}

/**
 * Хук для работы с PWA функциональностью
 * - Отслеживание обновлений Service Worker
 * - Отслеживание статуса онлайн/офлайн
 * - Управление промптом обновления
 */
export function usePWA(): UsePWAReturn {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    // Регистрируем Service Worker
    const updateServiceWorker = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
      onRegistered(registration) {
        console.log('SW registered:', registration);
      },
      onRegisterError(error) {
        console.error('SW registration error:', error);
      },
    });

    setUpdateSW(() => updateServiceWorker);

    // Отслеживание статуса сети
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateServiceWorker = useCallback(() => {
    if (updateSW) {
      updateSW();
    }
  }, [updateSW]);

  const closePrompt = useCallback(() => {
    setNeedRefresh(false);
    setOfflineReady(false);
  }, []);

  return {
    needRefresh,
    offlineReady,
    isOnline,
    updateServiceWorker,
    closePrompt,
  };
}

export default usePWA;
