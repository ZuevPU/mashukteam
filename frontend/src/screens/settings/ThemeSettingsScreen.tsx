import React from 'react';
import './ThemeSettingsScreen.css';

interface ThemeSettingsScreenProps {
  onBack: () => void;
}

export const ThemeSettingsScreen: React.FC<ThemeSettingsScreenProps> = ({ onBack }) => {
  return (
    <div className="theme-settings-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Тема</h3>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h4>Тема приложения</h4>
          <div className="info-item">
            <span className="info-label">Текущая тема</span>
            <span className="info-value">Белая</span>
          </div>
          <p style={{ marginTop: '16px', fontSize: '14px', opacity: 0.7 }}>
            Приложение использует единую белую тему для всех пользователей.
          </p>
        </div>
      </div>
    </div>
  );
};
