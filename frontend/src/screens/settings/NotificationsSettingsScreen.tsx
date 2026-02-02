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
      </div>
    </div>
  );
};
