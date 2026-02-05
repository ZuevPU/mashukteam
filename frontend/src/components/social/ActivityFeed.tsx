import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../hooks/useTelegram';
import './ActivityFeed.css';

// Типы активностей
type ActivityType = 
  | 'registration'
  | 'achievement'
  | 'assignment_submit'
  | 'assignment_approve'
  | 'event_complete'
  | 'diagnostic_complete'
  | 'level_up'
  | 'question_answer';

interface Activity {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    direction?: string;
  };
}

interface ActivityFeedProps {
  direction?: string; // Фильтр по направлению
  userId?: string; // Показать активность конкретного пользователя
  limit?: number;
  showTeamOnly?: boolean; // Показать только активность команды
}

// Иконки для типов активности
const activityIcons: Record<ActivityType, string> = {
  registration: '👋',
  achievement: '🏆',
  assignment_submit: '📝',
  assignment_approve: '✅',
  event_complete: '📅',
  diagnostic_complete: '📊',
  level_up: '⬆️',
  question_answer: '💬',
};

// Цвета для типов активности
const activityColors: Record<ActivityType, string> = {
  registration: '#4CAF50',
  achievement: '#FFC107',
  assignment_submit: '#2196F3',
  assignment_approve: '#4CAF50',
  event_complete: '#9C27B0',
  diagnostic_complete: '#00BCD4',
  level_up: '#FF5722',
  question_answer: '#607D8B',
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  direction,
  userId,
  limit = 30,
  showTeamOnly = false,
}) => {
  const { initData } = useTelegram();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!initData) return;

      setLoading(true);
      setError(null);

      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        let endpoint = '/api/social/feed';
        let body: Record<string, unknown> = { initData, limit };

        if (showTeamOnly && userId) {
          endpoint = '/api/social/team-feed';
          body = { initData, userId };
        } else if (userId) {
          endpoint = '/api/social/user-activity';
          body = { initData, targetUserId: userId, limit };
        } else if (direction) {
          body.direction = direction;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (data.success) {
          setActivities(data.activities || []);
          if (data.team) {
            setTeam(data.team);
          }
        } else {
          setError(data.error || 'Ошибка загрузки активности');
        }
      } catch (err) {
        console.error('Error fetching activity feed:', err);
        setError('Ошибка соединения');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [initData, direction, userId, limit, showTeamOnly]);

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    if (days < 7) return `${days} дн. назад`;
    
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  if (loading) {
    return (
      <div className="activity-feed activity-feed--loading">
        <div className="activity-feed__skeleton">
          {[1, 2, 3].map(i => (
            <div key={i} className="activity-skeleton-item">
              <div className="activity-skeleton-item__icon" />
              <div className="activity-skeleton-item__content">
                <div className="activity-skeleton-item__title" />
                <div className="activity-skeleton-item__time" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="activity-feed activity-feed--error">
        <span className="activity-feed__error-icon">⚠️</span>
        <span className="activity-feed__error-text">{error}</span>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="activity-feed activity-feed--empty">
        <span className="activity-feed__empty-icon">📭</span>
        <span className="activity-feed__empty-text">Пока нет активности</span>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      {team && (
        <div className="activity-feed__header">
          <span className="activity-feed__team-badge">🏷️ {team}</span>
        </div>
      )}
      
      <div className="activity-feed__list">
        {activities.map(activity => (
          <div 
            key={activity.id} 
            className="activity-item"
            style={{ '--activity-color': activityColors[activity.activity_type] } as React.CSSProperties}
          >
            <div className="activity-item__icon">
              {activityIcons[activity.activity_type]}
            </div>
            
            <div className="activity-item__content">
              <div className="activity-item__title">{activity.title}</div>
              {activity.description && (
                <div className="activity-item__description">{activity.description}</div>
              )}
              <div className="activity-item__meta">
                {activity.user && (
                  <span className="activity-item__user">
                    {activity.user.first_name} {activity.user.last_name}
                  </span>
                )}
                <span className="activity-item__time">{formatTime(activity.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
