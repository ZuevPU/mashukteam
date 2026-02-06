import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../hooks/useTelegram';
import { adminApi } from '../../services/adminApi';
import './AdminScreens.css';

interface AdminQuestionsRatingScreenProps {
  onBack: () => void;
}

interface RatingUser {
  user_id: string;
  first_name: string;
  last_name: string;
  telegram_username?: string;
  answers_count: number;
  questions_reflection_points: number;
  total_reflection_points: number;
  reflection_level: number;
}

export const AdminQuestionsRatingScreen: React.FC<AdminQuestionsRatingScreenProps> = ({ onBack }) => {
  const { initData } = useTelegram();
  const [rating, setRating] = useState<RatingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRating();
  }, [initData]);

  const loadRating = async () => {
    if (!initData) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await adminApi.getQuestionsRating(initData);
      setRating(data);
    } catch (err: any) {
      console.error('Error loading rating:', err);
      setError(err.message || 'Ошибка загрузки рейтинга');
    } finally {
      setLoading(false);
    }
  };

  const getLevelName = (level: number): string => {
    switch (level) {
      case 1: return 'Начал задумываться';
      case 2: return 'Поймал смысл';
      case 3: return 'Опять рефлексирует';
      case 4: return 'Мастер рефлексии';
      case 5: return 'Преисполнился в рефлексии';
      default: return `Уровень ${level}`;
    }
  };

  const getMedalEmoji = (index: number): string => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  if (loading) {
    return (
      <div className="admin-screen">
        <div className="header">
          <button onClick={onBack} className="back-button">← Назад</button>
          <h3>Загрузка...</h3>
        </div>
        <div className="loading">Загрузка рейтинга...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-screen">
        <div className="header">
          <button onClick={onBack} className="back-button">← Назад</button>
          <h3>Ошибка</h3>
        </div>
        <div className="admin-list">
          <p className="error" style={{color: '#e53935', padding: '20px', textAlign: 'center'}}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  // Общая статистика
  const totalAnswers = rating.reduce((sum, u) => sum + u.answers_count, 0);
  const totalPoints = rating.reduce((sum, u) => sum + u.questions_reflection_points, 0);

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Рейтинг по вопросам</h3>
      </div>

      <div className="admin-list">
        {/* Общая статистика */}
        <div style={{
          background: 'linear-gradient(135deg, #ffd54f 0%, #ffb300 100%)',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '20px',
          color: '#333'
        }}>
          <h4 style={{margin: '0 0 12px 0'}}>🏆 Общая статистика</h4>
          <div style={{display: 'flex', gap: '16px', flexWrap: 'wrap'}}>
            <div style={{flex: 1, minWidth: '100px', textAlign: 'center'}}>
              <div style={{fontSize: '24px', fontWeight: 700}}>{rating.length}</div>
              <div style={{fontSize: '12px', opacity: 0.8}}>Участников</div>
            </div>
            <div style={{flex: 1, minWidth: '100px', textAlign: 'center'}}>
              <div style={{fontSize: '24px', fontWeight: 700}}>{totalAnswers}</div>
              <div style={{fontSize: '12px', opacity: 0.8}}>Всего ответов</div>
            </div>
            <div style={{flex: 1, minWidth: '100px', textAlign: 'center'}}>
              <div style={{fontSize: '24px', fontWeight: 700}}>{totalPoints}</div>
              <div style={{fontSize: '12px', opacity: 0.8}}>Баллов начислено</div>
            </div>
          </div>
        </div>

        {/* Таблица рейтинга */}
        {rating.length === 0 ? (
          <p className="no-data">Пока нет данных для рейтинга</p>
        ) : (
          <div>
            <h4 style={{marginBottom: '12px', color: '#333'}}>Рейтинг участников</h4>
            {rating.map((user, index) => (
              <div 
                key={user.user_id} 
                className="admin-item-card"
                style={{
                  background: index < 3 
                    ? `linear-gradient(135deg, ${
                        index === 0 ? '#fff8e1, #ffecb3' : 
                        index === 1 ? '#fafafa, #e0e0e0' : 
                        '#fff3e0, #ffe0b2'
                      })`
                    : undefined,
                  border: index < 3 ? `2px solid ${
                    index === 0 ? '#ffc107' : 
                    index === 1 ? '#9e9e9e' : 
                    '#ff9800'
                  }` : undefined
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flex: 1
                }}>
                  {/* Место */}
                  <div style={{
                    fontSize: index < 3 ? '24px' : '16px',
                    fontWeight: 700,
                    minWidth: '40px',
                    textAlign: 'center',
                    color: index === 0 ? '#ffc107' : index === 1 ? '#757575' : index === 2 ? '#ff9800' : '#666'
                  }}>
                    {getMedalEmoji(index)}
                  </div>
                  
                  {/* Информация о пользователе */}
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: 600, marginBottom: '4px'}}>
                      {user.first_name} {user.last_name}
                    </div>
                    {user.telegram_username && (
                      <div style={{fontSize: '12px', color: '#666'}}>
                        @{user.telegram_username}
                      </div>
                    )}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '6px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{
                        background: '#e3f2fd',
                        color: '#1976d2',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px'
                      }}>
                        📝 {user.answers_count} ответ(ов)
                      </span>
                      <span style={{
                        background: '#e8f5e9',
                        color: '#2e7d32',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px'
                      }}>
                        Уровень {user.reflection_level}: {getLevelName(user.reflection_level)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Баллы */}
                  <div style={{textAlign: 'right'}}>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#4caf50'
                    }}>
                      {user.questions_reflection_points}
                    </div>
                    <div style={{fontSize: '11px', color: '#666'}}>
                      баллов за вопросы
                    </div>
                    <div style={{fontSize: '10px', color: '#999', marginTop: '2px'}}>
                      Всего: {user.total_reflection_points}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
