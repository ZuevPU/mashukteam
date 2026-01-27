import { Achievement } from '../../types';
import './AchievementCard.css';

interface AchievementCardProps {
  achievement: Achievement;
  unlocked?: boolean;
  unlockedAt?: string;
  onClick?: () => void;
}

/**
 * Компонент карточки отдельного достижения
 */
export function AchievementCard({
  achievement,
  unlocked = false,
  unlockedAt,
  onClick,
}: AchievementCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div
      className={`achievement-card ${unlocked ? 'achievement-unlocked' : 'achievement-locked'}`}
      onClick={onClick}
    >
      <div className="achievement-icon">
        {achievement.icon_url ? (
          <img src={achievement.icon_url} alt={achievement.name} />
        ) : (
          <span>{unlocked ? '🏆' : '🔒'}</span>
        )}
      </div>
      <div className="achievement-content">
        <h3 className="achievement-name">{achievement.name}</h3>
        {achievement.description && (
          <p className="achievement-description">{achievement.description}</p>
        )}
        {unlocked && unlockedAt && (
          <div className="achievement-unlocked-date">
            Разблокировано: {formatDate(unlockedAt)}
          </div>
        )}
        {achievement.points_reward > 0 && (
          <div className="achievement-reward">
            +{achievement.points_reward} баллов
          </div>
        )}
      </div>
    </div>
  );
}
