import React from 'react';
import './AdminScreens.css';

interface AdminDashboardProps {
  onBack: () => void;
  onManageEvents: () => void;
  onManageDiagnostics: () => void;
  onManageAssignments: () => void;
  onManageUsers: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onBack, onManageEvents, onManageDiagnostics, onManageAssignments, onManageUsers 
}) => {
  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Меню</button>
        <h3>Админ-панель</h3>
      </div>

      <div className="admin-list">
        <div className="admin-item-card" onClick={onManageEvents} style={{cursor: 'pointer'}}>
          <div className="item-info">
            <h4>📅 Мероприятия</h4>
            <p>Создание и управление мероприятиями</p>
          </div>
          <span>→</span>
        </div>

        <div className="admin-item-card" onClick={onManageDiagnostics} style={{cursor: 'pointer'}}>
          <div className="item-info">
            <h4>🩺 Диагностика</h4>
            <p>Входные тесты и опросы</p>
          </div>
          <span>→</span>
        </div>

        <div className="admin-item-card" onClick={onManageAssignments} style={{cursor: 'pointer'}}>
          <div className="item-info">
            <h4>📋 Задания</h4>
            <p>Создание и модерация заданий</p>
          </div>
          <span>→</span>
        </div>

        <div className="admin-item-card" onClick={onManageUsers} style={{cursor: 'pointer'}}>
          <div className="item-info">
            <h4>👥 Пользователи</h4>
            <p>Список, типы и ответы</p>
          </div>
          <span>→</span>
        </div>
      </div>
    </div>
  );
};
