import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../hooks/useTelegram';
import { userPreferencesApi } from '../../services/userPreferencesApi';
import { UserPreferences } from '../../types';
import './NotificationsSettingsScreen.css';

interface NotificationsSettingsScreenProps {
  onBack: () => void;
}

export const NotificationsSettingsScreen: React.FC<NotificationsSettingsScreenProps> = ({ onBack }) => {
  const { initData, showAlert } = useTelegram();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    if (!initData) return;
    try {
      const prefs = await userPreferencesApi.getPreferences(initData);
      setPreferences(prefs);
    } catch (error: any) {
      console.error('Error loading preferences:', error);
      showAlert('Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (field: keyof UserPreferences, value: boolean) => {
    if (!initData || !preferences || saving) return;

    setSaving(true);
    try {
      const updated = await userPreferencesApi.updatePreferences(
        { [field]: value },
        initData
      );
      setPreferences(updated);
      showAlert('Настройки сохранены');
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      showAlert('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="notifications-settings-screen">
        <div className="header">
          <button onClick={onBack} className="back-button">← Назад</button>
          <h3>Уведомления</h3>
        </div>
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="notifications-settings-screen">
        <div className="header">
          <button onClick={onBack} className="back-button">← Назад</button>
          <h3>Уведомления</h3>
        </div>
        <div className="error">Ошибка загрузки настроек</div>
      </div>
    );
  }

  return (
    <div className="notifications-settings-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Уведомления</h3>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h4>Уведомления в приложении</h4>
          <p style={{ marginBottom: '16px', fontSize: '14px', opacity: 0.7 }}>
            Здесь вы можете настроить, какие уведомления будут приходить вам в Telegram бот.
          </p>
          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">Все уведомления</span>
              <span className="toggle-description">Включить/выключить все уведомления</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.notifications_enabled}
                onChange={(e) => handleToggle('notifications_enabled', e.target.checked)}
                disabled={saving}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h4>Типы уведомлений</h4>
          <p style={{ marginBottom: '16px', fontSize: '13px', opacity: 0.7 }}>
            Выберите, о каких событиях вы хотите получать уведомления:
          </p>
          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">Мероприятия</span>
              <span className="toggle-description">Уведомления о новых мероприятиях</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.notification_events}
                onChange={(e) => handleToggle('notification_events', e.target.checked)}
                disabled={saving || !preferences.notifications_enabled}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">Вопросы</span>
              <span className="toggle-description">Уведомления о новых вопросах</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.notification_questions}
                onChange={(e) => handleToggle('notification_questions', e.target.checked)}
                disabled={saving || !preferences.notifications_enabled}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">Задания</span>
              <span className="toggle-description">Уведомления о новых заданиях</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.notification_assignments}
                onChange={(e) => handleToggle('notification_assignments', e.target.checked)}
                disabled={saving || !preferences.notifications_enabled}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">Диагностика</span>
              <span className="toggle-description">Уведомления о новых диагностиках</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.notification_diagnostics}
                onChange={(e) => handleToggle('notification_diagnostics', e.target.checked)}
                disabled={saving || !preferences.notifications_enabled}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h4>Информация об уведомлениях</h4>
          <div style={{ fontSize: '13px', lineHeight: '1.6', opacity: 0.8 }}>
            <p style={{ marginBottom: '8px' }}>
              <strong>Мероприятия:</strong> Анонсы новых мероприятий с прямой ссылкой на событие
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>Вопросы:</strong> Персональные вопросы от администраторов с ссылкой на ответ
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>Задания:</strong> Новые задания и результаты проверки выполненных заданий
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>Диагностика:</strong> Анонсы новых диагностик с прямой ссылкой на прохождение
            </p>
            <p style={{ marginTop: '12px', fontSize: '12px', opacity: 0.7 }}>
              Все уведомления содержат прямую ссылку для быстрого перехода к соответствующему разделу приложения.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
