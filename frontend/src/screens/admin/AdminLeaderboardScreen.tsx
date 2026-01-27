import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css';

interface LeaderboardEntry {
  user_id: string;
  user: {
    id: string;
    first_name: string;
    last_name?: string;
    telegram_username?: string;
    user_type?: string;
  };
  approved_count: number;
  total_reward: number;
}

interface AdminLeaderboardScreenProps {
  onBack: () => void;
}

export const AdminLeaderboardScreen: React.FC<AdminLeaderboardScreenProps> = ({ onBack }) => {
  const { initData } = useTelegram();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!initData) return;
      try {
        const data = await adminApi.getLeaderboard(initData);
        setLeaderboard(data);
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLeaderboard();
  }, [initData]);

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Рейтинг по заданиям</h3>
      </div>

      {leaderboard.length === 0 ? (
        <p className="no-data">Пока нет данных</p>
      ) : (
        <div className="admin-list">
          {leaderboard.map((entry, index) => (
            <div key={entry.user_id} className="admin-item-card">
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <span style={{
                  fontSize: 20, 
                  fontWeight: 'bold',
                  color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#666'
                }}>
                  #{index + 1}
                </span>
                <div className="item-info">
                  <h4>{entry.user.first_name} {entry.user.last_name}</h4>
                  <p>@{entry.user.telegram_username || 'no_username'}</p>
                </div>
              </div>
              <div style={{textAlign: 'right'}}>
                <div style={{fontSize: 18, fontWeight: 'bold', color: 'var(--tg-theme-button-color, #3390ec)'}}>
                  {entry.total_reward} баллов
                </div>
                <div style={{fontSize: 12, opacity: 0.6}}>
                  {entry.approved_count} заданий
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
