import { Achievement, UserAchievement } from '../../types';
import { AchievementCard } from '../gamification/AchievementCard';
import './AchievementsCard.css';

interface AchievementsCardProps {
  allAchievements: Achievement[];
  userAchievements: UserAchievement[];
  onViewAll?: () => void;
  className?: string;
}

/**
 * Компонент карточки достижений (последние разблокированные, прогресс)
 */
export function AchievementsCard({
  allAchievements,
  userAchievements,
  onViewAll,
  className = '',
}: AchievementsCardProps) {
  const unlockedCount = userAchievements.length;
  const totalCount = allAchievements.length;
  const progressPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  // Получаем последние 3 разблокированных достижения
  const recentAchievements = userAchievements
    .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
    .slice(0, 3)
    .map(ua => {
      const achievement = allAchievements.find(a => a.id === ua.achievement_id);
      return achievement ? { ...achievement, unlockedAt: ua.unlocked_at } : null;
    })
    .filter(Boolean) as (Achievement & { unlockedAt: string })[];

  const getUnlockedAt = (achievementId: string): string | undefined => {
    const userAchievement = userAchievements.find(ua => ua.achievement_id === achievementId);
    return userAchievement?.unlocked_at;
  };

  return (
    <div className={`achievements-card ${className}`}>
      <div className="achievements-card-header">
        <h3 className="achievements-card-title">Достижения</h3>
        <div className="achievements-progress">
          <span className="achievements-count">{unlockedCount}/{totalCount}</span>
        </div>
      </div>
      
      <div className="achievements-progress-bar">
        <div
          className="achievements-progress-fill"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {recentAchievements.length > 0 ? (
        <div className="achievements-recent">
          <h4 className="achievements-recent-title">Последние достижения</h4>
          <div className="achievements-recent-list">
            {recentAchievements.map(achievement => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                unlocked={true}
                unlockedAt={getUnlockedAt(achievement.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="achievements-empty">
          <p>Пока нет разблокированных достижений</p>
        </div>
      )}

      {onViewAll && (
        <button className="achievements-view-all" onClick={onViewAll}>
          Посмотреть все достижения
        </button>
      )}
    </div>
  );
}
