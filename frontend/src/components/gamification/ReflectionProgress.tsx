import React from 'react';
import { UserStats } from '../../types';
import './ReflectionProgress.css';

interface ReflectionProgressProps {
  stats: UserStats;
}

const LEVEL_NAMES: Record<number, string> = {
  1: 'Начал задумываться',
  2: 'Поймал смысл',
  3: 'Опять рефлексирует',
  4: 'Уже хватит рефлексировать',
  5: 'Мастер рефлексии'
};

const LEVEL_THRESHOLDS = [0, 21, 51, 101, 201];

export const ReflectionProgress: React.FC<ReflectionProgressProps> = ({ stats }) => {
  const level = stats.reflection_level || 1;
  const points = stats.reflection_points || 0;
  const pointsToNext = stats.reflection_to_next_level || 21;
  
  const levelName = LEVEL_NAMES[level] || 'Неизвестно';
  
  // Определяем текущий и следующий пороги
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || 201;
  const progressInLevel = points - currentThreshold;
  const levelRange = nextThreshold - currentThreshold;
  const progressPercent = levelRange > 0 ? (progressInLevel / levelRange) * 100 : 100;

  return (
    <div className="reflection-progress-card">
      <div className="reflection-header">
        <span className="reflection-icon">🧠</span>
        <div className="reflection-title-group">
          <h3 className="reflection-title">Уровень рефлексии</h3>
          <p className="reflection-level-name">{levelName}</p>
        </div>
        <div className="reflection-level-badge">Уровень {level}</div>
      </div>
      
      <div className="reflection-progress-bar-container">
        <div className="reflection-progress-bar">
          <div 
            className="reflection-progress-fill"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
        <div className="reflection-progress-info">
          <span className="reflection-points">{points} баллов</span>
          {level < 5 && (
            <span className="reflection-to-next">
              До следующего уровня: {pointsToNext}
            </span>
          )}
        </div>
      </div>
      
      {level === 5 && (
        <div className="reflection-max-level">
          🎉 Вы достигли максимального уровня рефлексии!
        </div>
      )}
    </div>
  );
};
