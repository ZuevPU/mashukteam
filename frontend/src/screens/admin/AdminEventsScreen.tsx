import React, { useEffect, useState } from 'react';
import { Event } from '../../types';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css';

interface AdminEventsScreenProps {
  typeFilter: 'event' | 'diagnostic';
  onBack: () => void;
  onCreate: () => void;
  onEdit: (event: Event) => void;
  onAddQuestions: (event: Event) => void;
  onAnalytics: (eventId: string) => void;
}

export const AdminEventsScreen: React.FC<AdminEventsScreenProps> = ({ 
  typeFilter, onBack, onCreate, onEdit, onAddQuestions, onAnalytics 
}) => {
  const { initData, showAlert } = useTelegram();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const title = typeFilter === 'diagnostic' ? 'Диагностика' : 'Мероприятия';

  const loadEvents = async () => {
    if (!initData) return;
    try {
      const data = await adminApi.getAllEvents(initData);
      // Filter by type
      const filtered = data.filter((e: Event) => e.type === typeFilter);
      setEvents(filtered);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [initData, typeFilter]);

  const handleDelete = async (id: string, eventTitle: string) => {
    if (!initData) return;
    if (confirm(`Удалить "${eventTitle}"?`)) {
      try {
        await adminApi.deleteEvent(id, initData);
        showAlert('Удалено');
        loadEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        showAlert('Ошибка удаления');
      }
    }
  };

  const handleStatusChange = async (event: Event) => {
    if (!initData) return;
    
    let newStatus: 'draft' | 'published' | 'completed';
    let confirmMessage = '';

    if (event.status === 'draft') {
      newStatus = 'published';
      confirmMessage = 'Опубликовать?';
    } else if (event.status === 'published') {
      newStatus = 'completed';
      confirmMessage = 'Завершить?';
    } else {
      newStatus = 'draft';
      confirmMessage = 'Вернуть в черновики?';
    }

    if (confirm(confirmMessage)) {
      try {
        await adminApi.updateEvent(event.id, { status: newStatus }, initData);
        showAlert(`Статус: ${getStatusLabel(newStatus)}`);
        loadEvents();
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
        <h3>{title}</h3>
      </div>

      <button className="create-btn" onClick={onCreate}>
        + Создать
      </button>

      <div className="admin-list">
        {events.length === 0 ? (
          <p className="no-data">Нет записей</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="admin-item-card">
              <div className="item-info">
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                  <span className={`status-badge ${event.status || 'draft'}`}>
                    {getStatusLabel(event.status || 'draft')}
                  </span>
                </div>
                <h4>{event.title}</h4>
                <p>{event.event_date ? new Date(event.event_date).toLocaleDateString() : ''} {event.event_time || ''}</p>
              </div>
              <div className="item-actions">
                <button 
                  className="action-btn" 
                  onClick={() => handleStatusChange(event)}
                  title={event.status === 'draft' ? 'Опубликовать' : 'Статус'}
                >
                  {getStatusIcon(event.status || 'draft')}
                </button>
                <button className="action-btn" onClick={() => onEdit(event)}>✏️</button>
                {/* Иконки вопросов и аналитики только для диагностики */}
                {typeFilter === 'diagnostic' && (
                  <>
                    <button className="action-btn" onClick={() => onAddQuestions(event)}>❓</button>
                    <button className="action-btn" onClick={() => onAnalytics(event.id)}>📊</button>
                  </>
                )}
                <button className="action-btn" onClick={() => handleDelete(event.id, event.title)}>🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

function getStatusLabel(status: string) {
  switch (status) {
    case 'draft': return 'Черновик';
    case 'published': return 'Активно';
    case 'completed': return 'Завершено';
    default: return status;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'draft': return '🚀';
    case 'published': return '🏁';
    case 'completed': return '↺';
    default: return '🚀';
  }
}
