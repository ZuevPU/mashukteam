import React, { useEffect, useState } from 'react';
import { Assignment } from '../../types';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css';

interface AdminAssignmentsScreenProps {
  onBack: () => void;
  onCreate: () => void;
  onEdit: (assignment: Assignment) => void;
  onSubmissions: (assignmentId: string) => void;
  onLeaderboard: () => void;
  onRandomizer?: (assignmentId: string) => void;
}

export const AdminAssignmentsScreen: React.FC<AdminAssignmentsScreenProps> = ({ 
  onBack, onCreate, onEdit, onSubmissions, onLeaderboard, onRandomizer 
}) => {
  const { initData, showAlert } = useTelegram();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAssignments = async () => {
    if (!initData) return;
    try {
      const data = await adminApi.getAllAssignments(initData);
      setAssignments(data);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [initData]);

  const handleDelete = async (id: string, title: string) => {
    if (!initData) return;
    if (confirm(`Удалить "${title}"?`)) {
      try {
        await adminApi.deleteAssignment(id, initData);
        showAlert('Удалено');
        loadAssignments();
      } catch (error) {
        console.error('Error deleting assignment:', error);
        showAlert('Ошибка');
      }
    }
  };

  const handleStatusChange = async (assignment: Assignment) => {
    if (!initData) return;
    const newStatus = assignment.status === 'draft' ? 'published' : 'draft';
    const msg = newStatus === 'published' ? 'Опубликовать задание?' : 'Снять с публикации?';
    
    if (confirm(msg)) {
      try {
        await adminApi.updateAssignment(assignment.id, { status: newStatus }, initData);
        showAlert(newStatus === 'published' ? 'Опубликовано' : 'Скрыто');
        loadAssignments();
      } catch (error) {
        console.error('Error updating status:', error);
        showAlert('Ошибка');
      }
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Задания</h3>
      </div>

      <div style={{display: 'flex', gap: 8, marginBottom: 16}}>
        <button className="create-btn" style={{flex: 1, marginBottom: 0}} onClick={onCreate}>
          + Создать задание
        </button>
        <button className="create-btn" style={{flex: 1, marginBottom: 0, background: '#666'}} onClick={onLeaderboard}>
          🏆 Рейтинг
        </button>
      </div>

      <div className="admin-list">
        {assignments.length === 0 ? (
          <p className="no-data">Нет заданий</p>
        ) : (
          assignments.map((a) => (
            <div key={a.id} className="admin-item-card">
              <div className="item-info">
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                  <span className={`status-badge ${a.status}`}>
                    {a.status === 'published' ? 'Активно' : 'Черновик'}
                  </span>
                  <span className="status-badge event">
                    ⭐ {a.reward}
                  </span>
                </div>
                <h4>{a.title}</h4>
                <p>
                  Формат: {getFormatLabel(a.answer_format)} • 
                  Кому: {getTargetLabel(a.target_type)}
                </p>
              </div>
              <div className="item-actions">
                <button 
                  className="action-btn" 
                  onClick={() => handleStatusChange(a)}
                  title={a.status === 'draft' ? 'Опубликовать' : 'Скрыть'}
                >
                  {a.status === 'draft' ? '🚀' : '🔒'}
                </button>
                <button className="action-btn" onClick={() => onEdit(a)}>✏️</button>
                <button className="action-btn" onClick={() => onSubmissions(a.id)}>📝</button>
                <button className="action-btn" onClick={() => handleDelete(a.id, a.title)}>🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

function getFormatLabel(format: string) {
  switch (format) {
    case 'text': return 'Текст';
    case 'number': return 'Число';
    case 'link': return 'Ссылка';
    case 'photo_upload': return '📷 Загрузка фото';
    case 'random_number': return '🎲 Случайное число';
    default: return format;
  }
}

function getTargetLabel(target: string) {
  switch (target) {
    case 'all': return 'Всем';
    case 'direction': return 'По направлению';
    case 'individual': return 'Лично';
    default: return target;
  }
}
