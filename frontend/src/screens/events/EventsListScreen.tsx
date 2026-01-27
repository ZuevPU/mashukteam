import React, { useEffect, useState } from 'react';
import { Event } from '../../types';
import { eventApi } from '../../services/eventApi';
import { useTelegram } from '../../hooks/useTelegram';
import './EventsListScreen.css';

interface EventsListScreenProps {
  onEventClick: (eventId: string) => void;
  onBack: () => void;
  typeFilter?: 'event' | 'diagnostic'; // Новый проп
}

export const EventsListScreen: React.FC<EventsListScreenProps> = ({ 
  onEventClick, onBack, typeFilter = 'event' 
}) => {
  const { initData } = useTelegram();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      if (!initData) return;
      try {
        const data = await eventApi.getEvents(initData);
        
        // Фильтрация по типу
        const filteredByType = data.filter(e => {
          // Если тип не указан в событии (старые записи), считаем 'event'
          const eventType = (e as any).type || 'event';
          return eventType === typeFilter;
        });

        // Сортировка: Сначала активные (ближайшие сверху), потом прошедшие (completed)
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const sorted = filteredByType.sort((a, b) => {
          // Приоритет статусу
          if (a.status === 'published' && b.status === 'completed') return -1;
          if (a.status === 'completed' && b.status === 'published') return 1;

          const dateA = new Date(a.event_date || '');
          const dateB = new Date(b.event_date || '');

          // Если оба published (предстоящие), то сначала ближайшие (ASC)
          if (a.status === 'published' && b.status === 'published') {
            return dateA.getTime() - dateB.getTime();
          }

          // Если оба completed (прошедшие), то сначала недавние (DESC)
          return dateB.getTime() - dateA.getTime();
        });

        setEvents(sorted);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [initData]);

  if (loading) return <div className="loading">Загрузка мероприятий...</div>;

  return (
    <div className="events-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h2>{typeFilter === 'diagnostic' ? 'Диагностика' : 'Мероприятия'}</h2>
      </div>

      <div className="events-list">
        {events.length === 0 ? (
          <p className="no-events">
            {typeFilter === 'diagnostic' ? 'Нет доступных тестов' : 'Нет мероприятий'}
          </p>
        ) : (
          events.map((event) => (
            <div key={event.id} className={`event-card ${event.status}`} onClick={() => onEventClick(event.id)}>
              <div className="card-header">
                <h3>{event.title}</h3>
                {event.status === 'completed' && <span className="status-label">Прошло</span>}
              </div>
              
              {event.event_date && (
                <p className="event-date">
                  📅 {new Date(event.event_date).toLocaleDateString()} {event.event_time}
                </p>
              )}
              {event.speaker && <p className="event-speaker">🎤 {event.speaker}</p>}
              <p className="event-description">{event.description}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
