import React from 'react';
import './QuestionsCard.css';

interface QuestionsCardProps {
  onClick: () => void;
}

export const QuestionsCard: React.FC<QuestionsCardProps> = ({ onClick }) => {
  return (
    <div className="bento-card questions-card" onClick={onClick}>
      <div className="card-content">
        <span className="card-icon">💬</span>
        <h3 className="card-title">Вопросы</h3>
        <p className="card-subtitle">Личные и общие</p>
      </div>
    </div>
  );
};
