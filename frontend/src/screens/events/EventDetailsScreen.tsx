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
  const { initData, showAlert } = useTelegram();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loadingNote, setLoadingNote] = useState(true);

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

  useEffect(() => {
    const loadNote = async () => {
      if (!initData) return;
      try {
        const note = await eventApi.getEventNote(eventId, initData);
        if (note) {
          setNoteText(note.note_text);
        }
      } catch (error) {
        console.error('Error loading note:', error);
      } finally {
        setLoadingNote(false);
      }
    };
    loadNote();
  }, [eventId, initData]);

  const handleSaveNote = async () => {
    if (!initData) return;
    setSavingNote(true);
    try {
      await eventApi.saveEventNote(eventId, noteText, initData);
      showAlert('Заметка сохранена');
    } catch (error) {
      console.error('Error saving note:', error);
      showAlert('Ошибка сохранения заметки');
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!event) return <div className="error">Программа не найдена</div>;

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
              <span className="event-info-label">📅 Дата:</span>
              <span className="event-info-value">{new Date(event.event_date).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
          {/* Время: показываем start_time - end_time или fallback на event_time */}
          {(event.start_time || event.end_time || event.event_time) && (
            <div className="event-info-item">
              <span className="event-info-label">🕐 Время:</span>
              <span className="event-info-value">
                {event.start_time && event.end_time 
                  ? `${event.start_time.slice(0, 5)} - ${event.end_time.slice(0, 5)}`
                  : event.start_time 
                    ? `с ${event.start_time.slice(0, 5)}`
                    : event.end_time 
                      ? `до ${event.end_time.slice(0, 5)}`
                      : event.event_time?.slice(0, 5)
                }
              </span>
            </div>
          )}
          {event.location && (
            <div className="event-info-item">
              <span className="event-info-label">📍 Место:</span>
              <span className="event-info-value">{event.location}</span>
            </div>
          )}
          {event.audience && (
            <div className="event-info-item">
              <span className="event-info-label">🎯 Формат:</span>
              <span className="event-info-value">{event.audience}</span>
            </div>
          )}
        </div>
      </div>

      {/* Блок для заметок */}
      <div className="event-info-card" style={{ marginTop: '20px' }}>
        <h4 className="event-info-title" style={{ marginBottom: '12px' }}>📝 Мои заметки</h4>
        {loadingNote ? (
          <div className="loading">Загрузка заметки...</div>
        ) : (
          <>
            <textarea
              className="form-textarea"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Добавьте свои заметки по этой программе..."
              style={{
                minHeight: '120px',
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border, #35A2A8)',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '12px'
              }}
            />
            <button
              onClick={handleSaveNote}
              disabled={savingNote}
              className="save-btn"
              style={{ width: '100%' }}
            >
              {savingNote ? 'Сохранение...' : '💾 Сохранить заметку'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
