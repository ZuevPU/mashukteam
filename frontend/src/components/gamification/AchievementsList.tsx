import React from 'react';
import { Achievement, UserAchievement } from '../../types';
import { AchievementCard } from './AchievementCard';
import './AchievementsList.css';

interface AchievementsListProps {
  allAchievements: Achievement[];
  userAchievements: UserAchievement[];
  onAchievementClick?: (achievement: Achievement) => void;
  className?: string;
}

/**
 * Компонент списка достижений (заблокированных и разблокированных)
 */
export function AchievementsList({
  allAchievements,
  userAchievements,
  onAchievementClick,
  className = '',
}: AchievementsListProps) {
  const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id));

  // Разделяем достижения на разблокированные и заблокированные
  const unlockedAchievements = allAchievements.filter(a => unlockedIds.has(a.id));
  const lockedAchievements = allAchievements.filter(a => !unlockedIds.has(a.id));

  // Находим дату разблокировки для каждого достижения
  const getUnlockedAt = (achievementId: string): string | undefined => {
    const userAchievement = userAchievements.find(ua => ua.achievement_id === achievementId);
    return userAchievement?.unlocked_at;
  };

  return (
    <div className={`achievements-list ${className}`}>
      {unlockedAchievements.length > 0 && (
        <div className="achievements-section">
          <h3 className="achievements-section-title">
            Разблокированные ({unlockedAchievements.length})
          </h3>
          <div className="achievements-grid">
            {unlockedAchievements.map(achievement => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                unlocked={true}
                unlockedAt={getUnlockedAt(achievement.id)}
                onClick={() => onAchievementClick?.(achievement)}
              />
            ))}
          </div>
        </div>
      )}

      {lockedAchievements.length > 0 && (
        <div className="achievements-section">
          <h3 className="achievements-section-title">
            Заблокированные ({lockedAchievements.length})
          </h3>
          <div className="achievements-grid">
            {lockedAchievements.map(achievement => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                unlocked={false}
                onClick={() => onAchievementClick?.(achievement)}
              />
            ))}
          </div>
        </div>
      )}

      {allAchievements.length === 0 && (
        <div className="achievements-empty">
          <p>Достижения пока не добавлены</p>
        </div>
      )}
    </div>
  );
}
