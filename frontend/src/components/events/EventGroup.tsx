import React from 'react';
import { Event } from '../../types';
import './EventGroup.css';

interface EventGroupProps {
  groupName: string;
  events: Event[];
  onEventClick: (eventId: string) => void;
}

export const EventGroup: React.FC<EventGroupProps> = ({ groupName, events, onEventClick }) => {
  return (
    <div className="event-group">
      <div className="event-group-header">
        <h3 className="event-group-title">📅 {groupName}</h3>
        <span className="event-group-count">{events.length}</span>
      </div>
      <div className="event-group-items">
        {events.map((event) => (
          <div 
            key={event.id} 
            className={`event-card ${event.status}`} 
            onClick={() => onEventClick(event.id)}
          >
            <div className="card-header">
              <h4>{event.title}</h4>
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
        ))}
      </div>
    </div>
  );
};
