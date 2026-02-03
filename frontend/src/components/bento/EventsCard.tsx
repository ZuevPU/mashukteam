import React from 'react';
import './EventsCard.css';

interface EventsCardProps {
  onClick: () => void;
}

export const EventsCard: React.FC<EventsCardProps> = ({ onClick }) => {
  return (
    <div className="bento-card events-card" onClick={onClick}>
      <div className="card-content">
        <img src="/prog.png" alt="Программа мероприятия" className="card-image" />
        <h3 className="card-title">Программа мероприятия</h3>
        <p className="card-subtitle">Будь в курсе и приходи вовремя</p>
      </div>
    </div>
  );
};
