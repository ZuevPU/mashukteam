import { UserStats } from '../../types';
import { PointsDisplay } from './PointsDisplay';
import { LevelProgress } from './LevelProgress';
import './StatsCard.css';

interface StatsCardProps {
  stats: UserStats;
  className?: string;
}

/**
 * Компонент карточки со статистикой пользователя
 */
export function StatsCard({ stats, className = '' }: StatsCardProps) {
  return (
    <div className={`stats-card ${className}`}>
      <div className="stats-header">
        <h2 className="stats-title">Ваша статистика</h2>
      </div>
      
      <div className="stats-content">
        <PointsDisplay totalPoints={stats.total_points} />
        
        <LevelProgress
          level={stats.current_level}
          experiencePoints={stats.experience_points}
          experienceToNextLevel={stats.experience_to_next_level}
        />
        
        <div className="stats-summary">
          <div className="stats-summary-item">
            <span className="stats-summary-label">Достижений</span>
            <span className="stats-summary-value">{stats.achievements_count}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
