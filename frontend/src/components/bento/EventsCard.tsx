import React from 'react';
import './EventsCard.css';

interface EventsCardProps {
  onClick: () => void;
}

export const EventsCard: React.FC<EventsCardProps> = ({ onClick }) => {
  return (
    <div className="bento-card events-card" onClick={onClick}>
      <div className="card-content">
        <span className="card-icon">📅</span>
        <h3 className="card-title">Мероприятия</h3>
        <p className="card-subtitle">Участвуй и голосуй</p>
      </div>
    </div>
  );
};
