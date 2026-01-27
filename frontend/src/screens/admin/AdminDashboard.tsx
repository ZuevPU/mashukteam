import React from 'react';
import './AdminDashboard.css';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  return (
    <div className="admin-dashboard">
      <div className="header">
        <button onClick={onBack} className="back-button">← Меню</button>
        <h2>Админ-панель</h2>
      </div>

      <div className="admin-menu">
        <div className="admin-card">
          <h3>📝 Управление мероприятиями</h3>
          <p>Создание, редактирование и опросы</p>
          <button className="admin-btn">Перейти</button>
        </div>

        <div className="admin-card">
          <h3>👥 Пользователи</h3>
          <p>Просмотр списка и ответов</p>
          <button className="admin-btn">Перейти</button>
        </div>
      </div>
    </div>
  );
};
