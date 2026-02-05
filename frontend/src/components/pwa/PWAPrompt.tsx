import React from 'react';
import { usePWA } from '../../hooks/usePWA';
import './PWAPrompt.css';

/**
 * Компонент для отображения промптов PWA:
 * - Обновление доступно
 * - Приложение готово к офлайн работе
 * - Индикатор офлайн статуса
 */
export const PWAPrompt: React.FC = () => {
  const { needRefresh, offlineReady, isOnline, updateServiceWorker, closePrompt } = usePWA();

  // Показываем индикатор офлайн режима
  if (!isOnline) {
    return (
      <div className="pwa-prompt pwa-prompt--offline">
        <span className="pwa-prompt__icon">📴</span>
        <span className="pwa-prompt__text">Нет подключения к интернету</span>
      </div>
    );
  }

  // Показываем промпт обновления
  if (needRefresh) {
    return (
      <div className="pwa-prompt pwa-prompt--update">
        <span className="pwa-prompt__icon">🔄</span>
        <span className="pwa-prompt__text">Доступно обновление</span>
        <div className="pwa-prompt__actions">
          <button 
            className="pwa-prompt__button pwa-prompt__button--primary"
            onClick={updateServiceWorker}
          >
            Обновить
          </button>
          <button 
            className="pwa-prompt__button pwa-prompt__button--secondary"
            onClick={closePrompt}
          >
            Позже
          </button>
        </div>
      </div>
    );
  }

  // Показываем уведомление о готовности к офлайн работе
  if (offlineReady) {
    return (
      <div className="pwa-prompt pwa-prompt--ready">
        <span className="pwa-prompt__icon">✅</span>
        <span className="pwa-prompt__text">Приложение готово к офлайн работе</span>
        <button 
          className="pwa-prompt__button pwa-prompt__button--secondary"
          onClick={closePrompt}
        >
          Закрыть
        </button>
      </div>
    );
  }

  return null;
};

export default PWAPrompt;
