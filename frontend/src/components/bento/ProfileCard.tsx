import { useState, useEffect } from 'react';
import { User, Direction } from '../../types';
import { buildApiEndpoint } from '../../utils/apiUrl';
import './ProfileCard.css';

interface ProfileCardProps {
  user: User;
  className?: string;
}

/**
 * Компонент карточки профиля пользователя
 */
export function ProfileCard({ user, className = '' }: ProfileCardProps) {
  const [direction, setDirection] = useState<Direction | null>(null);

  useEffect(() => {
    if (user.direction) {
      const loadDirection = async () => {
        try {
          const response = await fetch(buildApiEndpoint('/directions'));
          if (response.ok) {
            const data = await response.json();
            const found = data.directions?.find((d: Direction) => d.slug === user.direction);
            if (found) setDirection(found);
          }
        } catch (error) {
          console.error('Error loading direction:', error);
        }
      };
      loadDirection();
    }
  }, [user.direction]);

  // Полное ФИО: Фамилия Имя Отчество
  const fullName = [
    user.last_name,
    user.first_name,
    user.middle_name,
  ].filter(Boolean).join(' ');

  return (
    <div className={`profile-card ${className}`}>
      <div className="profile-header">
        <div className="profile-avatar">
          {user.first_name.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <h2 className="profile-name">{fullName}</h2>
          <div className="profile-badges">
            {direction && (
              <span className="status-badge status-direction">
                {direction.name}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="profile-details">
        <div className="profile-detail-item">
          <span className="profile-detail-label">⭐ Звездочки:</span>
          <span className="profile-detail-value">{user.stars_count ?? 0}</span>
        </div>
        {user.telegram_username && (
          <div className="profile-detail-item">
            <span className="profile-detail-label">Telegram:</span>
            <span className="profile-detail-value">@{user.telegram_username}</span>
          </div>
        )}
      </div>
    </div>
  );
}
