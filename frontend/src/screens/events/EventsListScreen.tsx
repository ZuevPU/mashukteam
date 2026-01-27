import React, { useEffect, useState } from 'react';
import { Event } from '../../types';
import { eventApi } from '../../services/eventApi';
import { useTelegram } from '../../hooks/useTelegram';
import './EventsListScreen.css';

interface EventsListScreenProps {
  onEventClick: (eventId: string) => void;
  onBack: () => void;
}

export const EventsListScreen: React.FC<EventsListScreenProps> = ({ onEventClick, onBack }) => {
  const { initData } = useTelegram();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      if (!initData) return;
      try {
        const data = await eventApi.getEvents(initData);
        setEvents(data);
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
        <h2>Мероприятия</h2>
      </div>

      <div className="events-list">
        {events.length === 0 ? (
          <p className="no-events">Пока нет активных мероприятий</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="event-card" onClick={() => onEventClick(event.id)}>
              <h3>{event.title}</h3>
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
