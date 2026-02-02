import React, { useEffect, useState, useMemo } from 'react';
import { Event } from '../../types';
import { eventApi } from '../../services/eventApi';
import { useTelegram } from '../../hooks/useTelegram';
import { EventGroup } from '../../components/events/EventGroup';
import './EventsListScreen.css';

interface EventsListScreenProps {
  onEventClick: (eventId: string) => void;
  onBack: () => void;
  typeFilter?: 'event' | 'diagnostic'; // Новый проп
}

interface EventNote {
  id: string;
  event_id: string;
  note_text: string;
  event: {
    id: string;
    title: string;
    event_date?: string;
  };
}

export const EventsListScreen: React.FC<EventsListScreenProps> = ({ 
  onEventClick, onBack, typeFilter = 'event' 
}) => {
  const { initData } = useTelegram();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventNotes, setEventNotes] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  useEffect(() => {
    const loadEvents = async () => {
      if (!initData) return;
      try {
        const [data, notesData] = await Promise.all([
          eventApi.getEvents(initData),
          eventApi.getUserEventNotes(initData).catch(() => [])
        ]);
        
        // Создаем карту заметок по event_id
        const notesMap = new Map<string, string>();
        notesData.forEach((note: EventNote) => {
          notesMap.set(note.event_id, note.note_text);
        });
        setEventNotes(notesMap);
        
        // Фильтрация по типу
        const filteredByType = data.filter(e => {
          const eventType = (e as any).type || 'event';
          return eventType === typeFilter;
        });

        // Разделение на анонсы и историю
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const upcoming: Event[] = [];
        const history: Event[] = [];

        filteredByType.forEach(event => {
          if (!event.event_date) {
            // Если даты нет, считаем анонсом
            upcoming.push(event);
            return;
          }

          const eventDate = new Date(event.event_date);
          eventDate.setHours(0, 0, 0, 0);

          if (eventDate >= now && event.status === 'published') {
            upcoming.push(event);
          } else {
            history.push(event);
          }
        });

        // Сортировка анонсов: ближайшие сверху
        upcoming.sort((a, b) => {
          const dateA = new Date(a.event_date || '').getTime();
          const dateB = new Date(b.event_date || '').getTime();
          return dateA - dateB;
        });

        // Сортировка истории: недавние сверху
        history.sort((a, b) => {
          const dateA = new Date(a.event_date || '').getTime();
          const dateB = new Date(b.event_date || '').getTime();
          return dateB - dateA;
        });

        // Устанавливаем события в зависимости от активной вкладки
        const eventsToShow = activeTab === 'upcoming' ? upcoming : history;
        setEvents(eventsToShow);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [initData, typeFilter, activeTab]);

  // Группировка мероприятий по group_name
  const groupedEvents = useMemo(() => {
    const groups: Record<string, Event[]> = {};
    const ungrouped: Event[] = [];

    events.forEach(event => {
      if (event.group_name && event.group_name.trim()) {
        if (!groups[event.group_name]) {
          groups[event.group_name] = [];
        }
        groups[event.group_name].push(event);
      } else {
        ungrouped.push(event);
      }
    });

    // Сортировка групп по group_order
    const sortedGroups = Object.entries(groups).sort((a, b) => {
      const orderA = events.find(e => e.group_name === a[0])?.group_order ?? 999;
      const orderB = events.find(e => e.group_name === b[0])?.group_order ?? 999;
      return orderA - orderB;
    });

    // Сортировка событий внутри каждой группы по event_order
    sortedGroups.forEach(([_, groupEvents]) => {
      groupEvents.sort((a, b) => {
        const orderA = a.event_order ?? 999;
        const orderB = b.event_order ?? 999;
        return orderA - orderB;
      });
    });

    return { groups: sortedGroups, ungrouped };
  }, [events]);

  if (loading) return <div className="loading">Загрузка мероприятий...</div>;

  return (
    <div className="events-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h2>{typeFilter === 'diagnostic' ? 'Диагностика' : 'Мероприятия'}</h2>
      </div>

      {/* Табы для переключения между анонсами и историей */}
      <div className="events-tabs">
        <button
          className={`events-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          📅 Анонсы
        </button>
        <button
          className={`events-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📚 История
        </button>
      </div>

      <div className="events-list">
        {events.length === 0 ? (
          <p className="no-events">
            {typeFilter === 'diagnostic' ? 'Нет доступных тестов' : 'Нет мероприятий'}
          </p>
        ) : (
          <>
            {/* Группированные мероприятия */}
            {groupedEvents.groups.map(([groupName, groupEvents]) => (
              <EventGroup
                key={groupName}
                groupName={groupName}
                events={groupEvents}
                onEventClick={onEventClick}
                eventNotes={eventNotes}
              />
            ))}

            {/* Негруппированные мероприятия */}
            {groupedEvents.ungrouped.length > 0 && (
              <div className="event-group">
                <div className="event-group-items">
                  {groupedEvents.ungrouped.map((event) => {
                    const note = eventNotes.get(event.id);
                    return (
                      <div key={event.id}>
                        <div 
                          className={`event-card ${event.status}`} 
                          onClick={() => onEventClick(event.id)}
                        >
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
                          {event.description && <p className="event-description">{event.description}</p>}
                        </div>
                        {note && (
                          <div style={{
                            marginTop: '8px',
                            padding: '8px 12px',
                            background: '#f0f7ff',
                            border: '1px solid #b3d9ff',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: '#0066cc'
                          }}>
                            <strong>📝 Моя заметка:</strong> {note.length > 50 ? note.substring(0, 50) + '...' : note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
