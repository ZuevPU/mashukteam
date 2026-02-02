import React, { useEffect, useState } from 'react';
import { Event } from '../../types';
import { eventApi } from '../../services/eventApi';
import { useTelegram } from '../../hooks/useTelegram';
import './EventSurveyScreen.css';

interface EventDetailsScreenProps {
  eventId: string;
  onBack: () => void;
}

export const EventDetailsScreen: React.FC<EventDetailsScreenProps> = ({ eventId, onBack }) => {
  const { initData } = useTelegram();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      if (!initData) return;
      try {
        const { event } = await eventApi.getEventDetails(eventId, initData);
        setEvent(event);
      } catch (error) {
        console.error('Error loading event details:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [eventId, initData]);

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!event) return <div className="error">Мероприятие не найдено</div>;

  return (
    <div className="survey-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>{event.title}</h3>
      </div>
      
      {/* Карточка с информацией о мероприятии */}
      <div className="event-info-card">
        <h4 className="event-info-title">{event.title}</h4>
        {event.description && (
          <p className="event-info-description">{event.description}</p>
        )}
        <div className="event-info-details">
          {event.speaker && (
            <div className="event-info-item">
              <span className="event-info-label">Спикер:</span>
              <span className="event-info-value">{event.speaker}</span>
            </div>
          )}
          {event.event_date && (
            <div className="event-info-item">
              <span className="event-info-label">Дата:</span>
              <span className="event-info-value">{new Date(event.event_date).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
          {event.event_time && (
            <div className="event-info-item">
              <span className="event-info-label">Время:</span>
              <span className="event-info-value">{event.event_time}</span>
            </div>
          )}
          {event.audience && (
            <div className="event-info-item">
              <span className="event-info-label">Аудитория:</span>
              <span className="event-info-value">{event.audience}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
