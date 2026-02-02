import React, { useState } from 'react';
import { useTelegram } from '../../hooks/useTelegram';
import { buildApiEndpoint } from '../../utils/apiUrl';
import './AdminScreens.css';

interface AdminDashboardProps {
  onBack: () => void;
  onManageEvents: () => void;
  onManageDiagnostics: () => void;
  onManageAssignments: () => void;
  onManageQuestions: () => void;
  onManageUsers: () => void;
  onExportClick?: () => void;
  onAnalyticsClick?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onBack, onManageEvents, onManageDiagnostics, onManageAssignments, onManageQuestions, onManageUsers, onExportClick, onAnalyticsClick
}) => {
  const { initData, showAlert } = useTelegram();

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

        <div className="admin-item-card" onClick={onManageQuestions} style={{cursor: 'pointer'}}>
          <div className="item-info">
            <h4>❓ Вопросы</h4>
            <p>Персональные вопросы пользователям</p>
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

        {onExportClick && (
          <div className="admin-item-card" onClick={onExportClick} style={{cursor: 'pointer'}}>
            <div className="item-info">
              <h4>📊 Экспорт с фильтрами</h4>
              <p>Экспорт данных с применением фильтров</p>
            </div>
            <span>→</span>
          </div>
        )}

        {onAnalyticsClick && (
          <div className="admin-item-card" onClick={onAnalyticsClick} style={{cursor: 'pointer'}}>
            <div className="item-info">
              <h4>📈 Аналитика</h4>
              <p>Статистика и аналитика по пользователям и активности</p>
            </div>
            <span>→</span>
          </div>
        )}
      </div>

    </div>
  );
};
