import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../hooks/useTelegram';
import { userPreferencesApi } from '../../services/userPreferencesApi';
import { UserPreferences } from '../../types';
import './ThemeSettingsScreen.css';

interface ThemeSettingsScreenProps {
  onBack: () => void;
}

export const ThemeSettingsScreen: React.FC<ThemeSettingsScreenProps> = ({ onBack }) => {
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

  const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    if (theme === 'light') {
      webApp.setHeaderColor('#FFFFFF');
      webApp.setBackgroundColor('#F8F8F7');
    } else if (theme === 'dark') {
      webApp.setHeaderColor('#1C1C1E');
      webApp.setBackgroundColor('#000000');
    } else {
      // auto - используем системную тему Telegram
      webApp.setHeaderColor('#FFFFFF');
      webApp.setBackgroundColor('#F8F8F7');
    }
  };

  const handleThemeChange = async (theme: 'light' | 'dark' | 'auto') => {
    if (!initData || !preferences || saving) return;

    setSaving(true);
    try {
      const updated = await userPreferencesApi.updatePreferences({ theme }, initData);
      setPreferences(updated);
      applyTheme(theme);
      showAlert('Тема изменена');
    } catch (error: any) {
      console.error('Error updating theme:', error);
      showAlert('Ошибка сохранения темы');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (preferences) {
      applyTheme(preferences.theme);
    }
  }, [preferences]);

  if (loading) {
    return (
      <div className="theme-settings-screen">
        <div className="header">
          <button onClick={onBack} className="back-button">← Назад</button>
          <h3>Тема</h3>
        </div>
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="theme-settings-screen">
        <div className="header">
          <button onClick={onBack} className="back-button">← Назад</button>
          <h3>Тема</h3>
        </div>
        <div className="error">Ошибка загрузки настроек</div>
      </div>
    );
  }

  const themes = [
    { value: 'light' as const, label: 'Светлая', icon: '☀️' },
    { value: 'dark' as const, label: 'Темная', icon: '🌙' },
    { value: 'auto' as const, label: 'Автоматическая', icon: '🔄' },
  ];

  return (
    <div className="theme-settings-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Тема</h3>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h4>Выберите тему</h4>
          <div className="theme-options">
            {themes.map((theme) => (
              <button
                key={theme.value}
                className={`theme-option ${preferences.theme === theme.value ? 'active' : ''}`}
                onClick={() => handleThemeChange(theme.value)}
                disabled={saving}
              >
                <span className="theme-icon">{theme.icon}</span>
                <span className="theme-label">{theme.label}</span>
                {preferences.theme === theme.value && (
                  <span className="theme-check">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <p className="theme-description">
            Тема определяет внешний вид приложения. Автоматическая тема следует настройкам Telegram.
          </p>
        </div>
      </div>
    </div>
  );
};
