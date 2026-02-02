import React from 'react';
import { User } from '../../types';
import './SettingsScreen.css';

interface SettingsScreenProps {
  user: User;
  onBack: () => void;
  onNotificationsClick: () => void;
  onThemeClick: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  onBack,
  onNotificationsClick,
  onThemeClick,
}) => {
  return (
    <div className="settings-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Настройки</h3>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h4>Информация о пользователе</h4>
          <div className="info-item">
            <span className="info-label">Имя</span>
            <span className="info-value">{user.first_name} {user.last_name} {user.middle_name || ''}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Статус</span>
            <span className="info-value">{user.status === 'registered' ? 'Зарегистрирован' : 'Новый'}</span>
          </div>
          {user.user_type && (
            <div className="info-item">
              <span className="info-label">Тип пользователя</span>
              <span className="info-value">{user.user_type}</span>
            </div>
          )}
          <div className="info-item">
            <span className="info-label">Дата регистрации</span>
            <span className="info-value">
              {new Date(user.created_at).toLocaleDateString('ru-RU')}
            </span>
          </div>
        </div>

        <div className="settings-section">
          <h4>Настройки приложения</h4>
          <button className="settings-action-btn" onClick={onNotificationsClick}>
            <span className="settings-action-icon">🔔</span>
            <span className="settings-action-label">Уведомления</span>
            <span className="settings-action-arrow">→</span>
          </button>
          <button className="settings-action-btn" onClick={onThemeClick}>
            <span className="settings-action-icon">🎨</span>
            <span className="settings-action-label">Тема</span>
            <span className="settings-action-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
