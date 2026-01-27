import React from 'react';
import './AssignmentsCard.css';

interface AssignmentsCardProps {
  onClick: () => void;
}

export const AssignmentsCard: React.FC<AssignmentsCardProps> = ({ onClick }) => {
  return (
    <div className="bento-card assignments-card" onClick={onClick}>
      <div className="card-content">
        <span className="card-icon">📋</span>
        <h3 className="card-title">Задания</h3>
        <p className="card-subtitle">Выполняй и получай баллы</p>
      </div>
    </div>
  );
};
