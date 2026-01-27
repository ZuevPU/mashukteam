import React from 'react';
import './DiagnosticCard.css';

interface DiagnosticCardProps {
  onClick: () => void;
}

export const DiagnosticCard: React.FC<DiagnosticCardProps> = ({ onClick }) => {
  return (
    <div className="bento-card diagnostic-card" onClick={onClick}>
      <div className="card-content">
        <span className="card-icon">🩺</span>
        <h3 className="card-title">Диагностика</h3>
        <p className="card-subtitle">Пройти входной тест</p>
      </div>
    </div>
  );
};
