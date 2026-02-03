import React from 'react';
import './QuestionsCard.css';

interface QuestionsCardProps {
  onClick: () => void;
}

export const QuestionsCard: React.FC<QuestionsCardProps> = ({ onClick }) => {
  return (
    <div className="bento-card questions-card" onClick={onClick}>
      <div className="card-content">
        <img src="/vop.png" alt="Вопросы" className="card-image" />
        <h3 className="card-title">Вопросы</h3>
        <p className="card-subtitle">Про тебя и про смыслы</p>
      </div>
    </div>
  );
};
