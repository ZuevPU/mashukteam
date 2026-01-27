import './PointsDisplay.css';

interface PointsDisplayProps {
  totalPoints: number;
  className?: string;
}

/**
 * Компонент для отображения текущих баллов пользователя
 */
export function PointsDisplay({ totalPoints, className = '' }: PointsDisplayProps) {
  return (
    <div className={`points-display ${className}`}>
      <div className="points-icon">⭐</div>
      <div className="points-content">
        <div className="points-label">Баллы</div>
        <div className="points-value">{totalPoints.toLocaleString('ru-RU')}</div>
      </div>
    </div>
  );
}
