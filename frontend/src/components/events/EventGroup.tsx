import React from 'react';
import { Event } from '../../types';
import './EventGroup.css';

interface EventGroupProps {
  groupName: string;
  events: Event[];
  onEventClick: (eventId: string) => void;
  eventNotes?: Map<string, string>;
}

export const EventGroup: React.FC<EventGroupProps> = ({ groupName, events, onEventClick, eventNotes }) => {
  return (
    <div className="event-group">
      <div className="event-group-header">
        <h3 className="event-group-title">📅 {groupName}</h3>
        <span className="event-group-count">{events.length}</span>
      </div>
      <div className="event-group-items">
        {events.map((event) => {
          const note = eventNotes?.get(event.id);
          return (
            <div key={event.id}>
              <div 
                className={`event-card ${event.status}`} 
                onClick={() => onEventClick(event.id)}
              >
                <div className="card-header">
                  <h4>{event.title}</h4>
                  {event.status === 'completed' && <span className="status-label">Прошло</span>}
                </div>
                
                {event.event_date && (
                  <p className="event-date">
                    📅 {new Date(event.event_date).toLocaleDateString()}
                    {(event.start_time || event.end_time) 
                      ? ` 🕐 ${event.start_time?.slice(0, 5) || ''}${event.start_time && event.end_time ? ' - ' : ''}${event.end_time?.slice(0, 5) || ''}`
                      : event.event_time ? ` ${event.event_time}` : ''
                    }
                  </p>
                )}
                {event.location && <p className="event-location">📍 {event.location}</p>}
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
  );
};
