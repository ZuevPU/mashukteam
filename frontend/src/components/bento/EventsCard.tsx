import React from 'react';
import './EventsCard.css';

interface EventsCardProps {
  onClick: () => void;
}

export const EventsCard: React.FC<EventsCardProps> = ({ onClick }) => {
  return (
    <div className="bento-card events-card" onClick={onClick}>
      <div className="card-content">
        <img src="/prog.png" alt="Программа обучения" className="card-image" />
        <h3 className="card-title">Программа обучения</h3>
        <p className="card-subtitle">Участвуй и голосуй</p>
      </div>
    </div>
  );
};
