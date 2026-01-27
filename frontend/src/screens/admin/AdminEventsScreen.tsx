import React, { useEffect, useState } from 'react';
import { Event } from '../../types';
import { eventApi } from '../../services/eventApi';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css'; // Общий CSS для админки

interface AdminEventsScreenProps {
  onBack: () => void;
  onCreate: () => void;
  onEdit: (event: Event) => void;
  onAddQuestions: (event: Event) => void;
  onAnalytics: (eventId: string) => void;
}

export const AdminEventsScreen: React.FC<AdminEventsScreenProps> = ({ 
  onBack, onCreate, onEdit, onAddQuestions, onAnalytics 
}) => {
  const { initData, showAlert } = useTelegram();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    if (!initData) return;
    try {
      const data = await eventApi.getEvents(initData);
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
      showAlert('Ошибка загрузки мероприятий');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [initData]);

  const handleDelete = async (id: string, title: string) => {
    if (!initData) return;
    if (confirm(`Вы уверены, что хотите удалить "${title}"?`)) {
      try {
        await adminApi.deleteEvent(id, initData);
        showAlert('Мероприятие удалено');
        loadEvents(); // Перезагружаем список
      } catch (error) {
        console.error('Error deleting event:', error);
        showAlert('Ошибка удаления');
      }
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Мероприятия</h3>
      </div>

      <button className="create-btn" onClick={onCreate}>
        + Создать новое
      </button>

      <div className="admin-list">
        {events.length === 0 ? (
          <p className="no-data">Нет мероприятий</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="admin-item-card">
              <div className="item-info">
                <h4>{event.title}</h4>
                <p>{new Date(event.event_date || '').toLocaleDateString()} {event.event_time}</p>
              </div>
              <div className="item-actions">
                <button className="action-btn edit" onClick={() => onEdit(event)}>✏️</button>
                <button className="action-btn questions" onClick={() => onAddQuestions(event)}>❓</button>
                <button className="action-btn analytics" onClick={() => onAnalytics(event.id)}>📊</button>
                <button className="action-btn delete" onClick={() => handleDelete(event.id, event.title)}>🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
