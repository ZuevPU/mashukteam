import React from 'react';
import './MetricCard.css';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: string;
  progress?: number; // 0-100 для прогресс-бара
  color?: string; // Цвет карточки
  subtitle?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  progress,
  color = '#3E529B',
  subtitle,
}) => {
  return (
    <div className="metric-card" style={{ borderTopColor: color }}>
      {icon && <div className="metric-icon">{icon}</div>}
      <div className="metric-content">
        <div className="metric-title">{title}</div>
        <div className="metric-value" style={{ color }}>
          {typeof value === 'number' ? value.toLocaleString('ru-RU') : value}
        </div>
        {subtitle && <div className="metric-subtitle">{subtitle}</div>}
        {progress !== undefined && (
          <div className="metric-progress">
            <div
              className="metric-progress-bar"
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                backgroundColor: color,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
