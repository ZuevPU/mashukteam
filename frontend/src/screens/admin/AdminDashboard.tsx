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
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onBack, onManageEvents, onManageDiagnostics, onManageAssignments, onManageQuestions, onManageUsers 
}) => {
  const { initData, showAlert } = useTelegram();
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (endpoint: string, filename: string, label: string) => {
    if (!initData) {
      showAlert('Ошибка авторизации');
      return;
    }

    if (exporting) {
      showAlert('Экспорт уже выполняется, подождите...');
      return;
    }

    setExporting(label);

    try {
      const response = await fetch(buildApiEndpoint(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ initData })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Ошибка экспорта');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showAlert(`Экспорт "${label}" завершен`);
    } catch (error: any) {
      console.error('Export error:', error);
      showAlert(`Ошибка экспорта: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportAnswers = () => handleExport('/admin/export/answers', 'answers_export', 'Ответы');
  const handleExportEvents = () => handleExport('/admin/export/events', 'events_export', 'Мероприятия');
  const handleExportDiagnostics = () => handleExport('/admin/export/diagnostics', 'diagnostics_export', 'Диагностики');
  const handleExportAssignments = () => handleExport('/admin/export/assignments', 'assignments_export', 'Задания');
  const handleExportQuestions = () => handleExport('/admin/export/questions', 'questions_export', 'Вопросы');
  const handleExportUsers = () => handleExport('/admin/export/users', 'users_export', 'Пользователи');
  const handleExportAll = () => handleExport('/admin/export/all', 'full_export', 'Полный экспорт');

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
      </div>

      <div className="admin-section-divider">
        <h4>Экспорт данных</h4>
      </div>

      <div className="admin-list">
        <div 
          className="admin-item-card" 
          onClick={handleExportEvents} 
          style={{
            cursor: exporting ? 'wait' : 'pointer', 
            opacity: exporting && exporting !== 'Мероприятия' ? 0.6 : 1,
            background: 'var(--tg-theme-button-color, #3390ec)', 
            color: 'var(--tg-theme-button-text-color, #fff)'
          }}
        >
          <div className="item-info">
            <h4>📅 Экспорт мероприятий</h4>
            <p>{exporting === 'Мероприятия' ? 'Экспорт...' : 'Все мероприятия с информацией'}</p>
          </div>
          <span>{exporting === 'Мероприятия' ? '⏳' : '↓'}</span>
        </div>

        <div 
          className="admin-item-card" 
          onClick={handleExportDiagnostics} 
          style={{
            cursor: exporting ? 'wait' : 'pointer', 
            opacity: exporting && exporting !== 'Диагностики' ? 0.6 : 1,
            background: 'var(--tg-theme-button-color, #3390ec)', 
            color: 'var(--tg-theme-button-text-color, #fff)'
          }}
        >
          <div className="item-info">
            <h4>🩺 Экспорт диагностик</h4>
            <p>{exporting === 'Диагностики' ? 'Экспорт...' : 'Диагностики с результатами участников'}</p>
          </div>
          <span>{exporting === 'Диагностики' ? '⏳' : '↓'}</span>
        </div>

        <div 
          className="admin-item-card" 
          onClick={handleExportAssignments} 
          style={{
            cursor: exporting ? 'wait' : 'pointer', 
            opacity: exporting && exporting !== 'Задания' ? 0.6 : 1,
            background: 'var(--tg-theme-button-color, #3390ec)', 
            color: 'var(--tg-theme-button-text-color, #fff)'
          }}
        >
          <div className="item-info">
            <h4>📋 Экспорт заданий</h4>
            <p>{exporting === 'Задания' ? 'Экспорт...' : 'Задания с результатами выполнения'}</p>
          </div>
          <span>{exporting === 'Задания' ? '⏳' : '↓'}</span>
        </div>

        <div 
          className="admin-item-card" 
          onClick={handleExportQuestions} 
          style={{
            cursor: exporting ? 'wait' : 'pointer', 
            opacity: exporting && exporting !== 'Вопросы' ? 0.6 : 1,
            background: 'var(--tg-theme-button-color, #3390ec)', 
            color: 'var(--tg-theme-button-text-color, #fff)'
          }}
        >
          <div className="item-info">
            <h4>❓ Экспорт вопросов</h4>
            <p>{exporting === 'Вопросы' ? 'Экспорт...' : 'Вопросы с ответами участников'}</p>
          </div>
          <span>{exporting === 'Вопросы' ? '⏳' : '↓'}</span>
        </div>

        <div 
          className="admin-item-card" 
          onClick={handleExportUsers} 
          style={{
            cursor: exporting ? 'wait' : 'pointer', 
            opacity: exporting && exporting !== 'Пользователи' ? 0.6 : 1,
            background: 'var(--tg-theme-button-color, #3390ec)', 
            color: 'var(--tg-theme-button-text-color, #fff)'
          }}
        >
          <div className="item-info">
            <h4>👥 Экспорт пользователей</h4>
            <p>{exporting === 'Пользователи' ? 'Экспорт...' : 'Пользователи с полной информацией'}</p>
          </div>
          <span>{exporting === 'Пользователи' ? '⏳' : '↓'}</span>
        </div>

        <div 
          className="admin-item-card" 
          onClick={handleExportAnswers} 
          style={{
            cursor: exporting ? 'wait' : 'pointer', 
            opacity: exporting && exporting !== 'Ответы' ? 0.6 : 1,
            background: 'var(--tg-theme-button-color, #3390ec)', 
            color: 'var(--tg-theme-button-text-color, #fff)'
          }}
        >
          <div className="item-info">
            <h4>📊 Экспорт ответов</h4>
            <p>{exporting === 'Ответы' ? 'Экспорт...' : 'Все ответы в одном файле'}</p>
          </div>
          <span>{exporting === 'Ответы' ? '⏳' : '↓'}</span>
        </div>

        <div 
          className="admin-item-card" 
          onClick={handleExportAll} 
          style={{
            cursor: exporting ? 'wait' : 'pointer', 
            opacity: exporting && exporting !== 'Полный экспорт' ? 0.6 : 1,
            background: 'var(--tg-theme-destructive-text-color, #df3f40)', 
            color: 'var(--tg-theme-button-text-color, #fff)'
          }}
        >
          <div className="item-info">
            <h4>🗂️ Полный экспорт</h4>
            <p>{exporting === 'Полный экспорт' ? 'Экспорт...' : 'Все таблицы базы данных'}</p>
          </div>
          <span>{exporting === 'Полный экспорт' ? '⏳' : '↓'}</span>
        </div>
      </div>
    </div>
  );
};
