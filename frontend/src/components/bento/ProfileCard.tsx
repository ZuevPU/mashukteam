import React from 'react';
import { User } from '../../types';
import './ProfileCard.css';

interface ProfileCardProps {
  user: User;
  className?: string;
}

/**
 * Компонент карточки профиля пользователя
 */
export function ProfileCard({ user, className = '' }: ProfileCardProps) {
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

  return (
    <div className={`profile-card ${className}`}>
      <div className="profile-header">
        <div className="profile-avatar">
          {user.first_name.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <h2 className="profile-name">{fullName}</h2>
          <div className="profile-status">
            <span className={`status-badge status-${user.status}`}>
              {user.status === 'registered' ? 'Зарегистрирован' : 'Новый'}
            </span>
          </div>
        </div>
      </div>
      <div className="profile-details">
        <div className="profile-detail-item">
          <span className="profile-detail-label">Дата регистрации:</span>
          <span className="profile-detail-value">{formatDate(user.created_at)}</span>
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
