import React, { useEffect, useState } from 'react';
import { Event } from '../../types';
import { eventApi } from '../../services/eventApi';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css';

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

  // Используем админский метод для получения ВСЕХ событий
  // Но так как у нас пока нет отдельного endpoint getAdminEvents, 
  // используем существующий adminApi.getEvents, который нам нужно создать или обновить?
  // В adminApi нет getEvents, мы использовали eventApi.getEvents, но он теперь возвращает только published.
  // Нам нужно добавить getAllEvents в adminApi.
  
  // ВРЕМЕННОЕ РЕШЕНИЕ: пока используем eventApi, но надо добавить метод в adminApi.
  // НО: Я уже изменил бэкенд, так что eventApi вернет не всё.
  // СРОЧНО: Добавляю метод в adminApi.
  
  const loadEvents = async () => {
    if (!initData) return;
    try {
      // Здесь должен быть вызов метода, возвращающего ВСЕ события
      // Я добавлю его в adminApi в следующем шаге
      // @ts-ignore
      const data = await adminApi.getAllEvents(initData);
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
      // showAlert('Ошибка загрузки мероприятий');
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
      confirmMessage = 'Опубликовать мероприятие? Пользователи увидят его.';
    } else if (event.status === 'published') {
      newStatus = 'completed'; // Или draft, если хотим скрыть
      confirmMessage = 'Завершить мероприятие? Оно переместится в архив.';
    } else {
      newStatus = 'draft'; // Из архива в черновики
      confirmMessage = 'Вернуть в черновики?';
    }

    if (confirm(confirmMessage)) {
      try {
        await adminApi.updateEvent(event.id, { status: newStatus }, initData);
        showAlert(`Статус изменен на: ${getStatusLabel(newStatus)}`);
        loadEvents();
      } catch (error) {
        console.error('Error updating status:', error);
        showAlert('Ошибка обновления статуса');
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
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                  <span className={`status-badge ${(event as any).type || 'event'}`}>
                    {(event as any).type === 'diagnostic' ? 'Диагностика' : 'Event'}
                  </span>
                  <span className={`status-badge ${event.status || 'draft'}`}>
                    {getStatusLabel(event.status || 'draft')}
                  </span>
                </div>
                <h4>{event.title}</h4>
                <p>{new Date(event.event_date || '').toLocaleDateString()} {event.event_time}</p>
              </div>
              <div className="item-actions">
                <button 
                  className="action-btn publish" 
                  onClick={() => handleStatusChange(event)}
                  title={event.status === 'draft' ? 'Опубликовать' : 'Изменить статус'}
                >
                  {getStatusIcon(event.status || 'draft')}
                </button>
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

function getStatusLabel(status: string) {
  switch (status) {
    case 'draft': return 'Черновик';
    case 'published': return 'Активно';
    case 'completed': return 'Прошло';
    default: return status;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'draft': return '🚀'; // Опубликовать
    case 'published': return '🏁'; // Завершить
    case 'completed': return '↺'; // Вернуть
    default: return '🚀';
  }
}
