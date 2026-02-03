import React from 'react';
import './DiagnosticCard.css';

interface DiagnosticCardProps {
  onClick: () => void;
}

export const DiagnosticCard: React.FC<DiagnosticCardProps> = ({ onClick }) => {
  return (
    <div className="bento-card diagnostic-card" onClick={onClick}>
      <div className="card-content">
        <img src="/dia.png" alt="Опросник фокуса внимания" className="card-image" />
        <h3 className="card-title">Опросник фокуса внимания</h3>
        <p className="card-subtitle">Пройди тест, участвуй в эксперименте</p>
      </div>
    </div>
  );
};
