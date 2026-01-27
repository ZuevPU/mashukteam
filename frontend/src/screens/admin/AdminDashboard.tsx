import React from 'react';
import './AdminDashboard.css';

interface AdminDashboardProps {
  onBack: () => void;
  onManageEvents: () => void;
  onManageUsers: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onBack, onManageEvents, onManageUsers 
}) => {
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
          <button className="admin-btn" onClick={onManageEvents}>Перейти</button>
        </div>

        <div className="admin-card">
          <h3>👥 Пользователи</h3>
          <p>Просмотр списка и ответов</p>
          <button className="admin-btn" onClick={onManageUsers}>Перейти</button>
        </div>
      </div>
    </div>
  );
};
