import { PointsDisplay } from '../gamification/PointsDisplay';
import { LevelProgress } from '../gamification/LevelProgress';
import { UserStats } from '../../types';
import './GamificationCard.css';

interface GamificationCardProps {
  stats: UserStats;
  className?: string;
}

/**
 * Компонент карточки геймификации (баллы, уровень, прогресс)
 */
export function GamificationCard({ stats, className = '' }: GamificationCardProps) {
  return (
    <div className={`gamification-card ${className}`}>
      <h3 className="gamification-card-title">Геймификация</h3>
      <div className="gamification-content">
        <PointsDisplay totalPoints={stats.total_points} />
        <LevelProgress
          level={stats.current_level}
          experiencePoints={stats.experience_points}
          experienceToNextLevel={stats.experience_to_next_level}
        />
      </div>
    </div>
  );
}
