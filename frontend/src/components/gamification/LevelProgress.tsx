import React from 'react';
import './LevelProgress.css';

interface LevelProgressProps {
  level: number;
  experiencePoints: number;
  experienceToNextLevel: number;
  className?: string;
}

/**
 * Компонент для отображения прогресса уровня с опытом
 */
export function LevelProgress({
  level,
  experiencePoints,
  experienceToNextLevel,
  className = '',
}: LevelProgressProps) {
  const totalForNextLevel = experiencePoints + experienceToNextLevel;
  const progressPercentage = totalForNextLevel > 0 
    ? (experiencePoints / totalForNextLevel) * 100 
    : 0;

  return (
    <div className={`level-progress ${className}`}>
      <div className="level-header">
        <div className="level-info">
          <span className="level-label">Уровень</span>
          <span className="level-value">{level}</span>
        </div>
        <div className="experience-info">
          <span className="experience-current">{experiencePoints}</span>
          <span className="experience-separator">/</span>
          <span className="experience-total">{totalForNextLevel}</span>
        </div>
      </div>
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill"
          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
        />
      </div>
      <div className="level-footer">
        <span className="next-level-text">
          До уровня {level + 1}: {experienceToNextLevel} опыта
        </span>
      </div>
    </div>
  );
}
