import React from 'react';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css';

interface AdminDashboardProps {
  onBack: () => void;
  onManageEvents: () => void;
  onManageDiagnostics: () => void;
  onManageAssignments: () => void;
  onManageQuestions: () => void;
  onManageUsers: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onBack, onManageEvents, onManageDiagnostics, onManageAssignments, onManageQuestions, onManageUsers 
}) => {
  const { initData, showAlert } = useTelegram();

  const handleExportAnswers = async () => {
    if (!initData) {
      showAlert('Ошибка авторизации');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/export/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ initData })
      });

      if (!response.ok) {
        throw new Error('Ошибка экспорта');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `answers_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showAlert('Выгрузка началась');
    } catch (error) {
      console.error('Export error:', error);
      showAlert('Ошибка выгрузки');
    }
  };

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

        <div className="admin-item-card" onClick={handleExportAnswers} style={{cursor: 'pointer', background: 'var(--tg-theme-button-color, #3390ec)', color: 'var(--tg-theme-button-text-color, #fff)'}}>
          <div className="item-info">
            <h4>📊 Выгрузить ответы</h4>
            <p>Экспорт всех ответов в Excel</p>
          </div>
          <span>↓</span>
        </div>
      </div>
    </div>
  );
};
