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
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const fullName = [
    user.last_name,
    user.first_name,
    user.middle_name,
  ].filter(Boolean).join(' ');

  // Преобразуем slug типа в читаемое название
  const getDirectionName = (slug?: string) => {
    if (!slug) return null;
    const typeMap: Record<string, string> = {
      'type_1': 'Тип 1',
      'type_2': 'Тип 2',
      'type_3': 'Тип 3',
      'type_4': 'Тип 4',
      'type_5': 'Тип 5',
    };
    return typeMap[slug] || slug;
  };

    const directionName = getDirectionName(user.direction);

  return (
    <div className={`profile-card ${className}`}>
      <div className="profile-header">
        <div className="profile-avatar">
          {user.first_name.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <h2 className="profile-name">{fullName}</h2>
          <div className="profile-badges">
            <span className={`status-badge status-${user.status}`}>
              {user.status === 'registered' ? 'Зарегистрирован' : 'Новый'}
            </span>
            {directionName && (
              <span className="status-badge status-direction">
                {directionName}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="profile-details">
        <div className="profile-detail-item">
          <span className="profile-detail-label">Дата регистрации:</span>
          <span className="profile-detail-value">{formatDate(user.created_at)}</span>
        </div>
        {direction && (
          <div className="profile-detail-item">
            <span className="profile-detail-label">Направление:</span>
            <span className="profile-detail-value">{direction.name}</span>
          </div>
        )}
        {user.stars_count !== undefined && (
          <div className="profile-detail-item">
            <span className="profile-detail-label">⭐ Звездочки:</span>
            <span className="profile-detail-value">{user.stars_count}</span>
          </div>
        )}
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
