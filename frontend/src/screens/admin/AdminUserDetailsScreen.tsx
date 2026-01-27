import React, { useEffect, useState } from 'react';
import { User } from '../../types';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css';

interface AdminUserDetailsScreenProps {
  userId: string;
  onBack: () => void;
}

export const AdminUserDetailsScreen: React.FC<AdminUserDetailsScreenProps> = ({ userId, onBack }) => {
  const { initData } = useTelegram();
  const [user, setUser] = useState<User & { answers: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      if (!initData) return;
      try {
        const data = await adminApi.getUserDetails(userId, initData);
        setUser(data);
      } catch (error) {
        console.error('Error loading user details:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [userId, initData]);

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!user) return <div className="error">Пользователь не найден</div>;

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Профиль пользователя</h3>
      </div>

      <div className="admin-card" style={{marginBottom: 20}}>
        <h3>{user.first_name} {user.last_name}</h3>
        <p>Telegram ID: {user.telegram_id}</p>
        <p>Username: @{user.telegram_username}</p>
        <p>Статус: {user.status}</p>
        <p>Баллы: {user.total_points || 0}</p>
        <p>Мотивация: {user.motivation}</p>
      </div>

      <h3>История ответов</h3>
      <div className="admin-list">
        {user.answers && user.answers.length > 0 ? (
          user.answers.map((answer: any) => (
            <div key={answer.id} className="admin-item-card" style={{display: 'block'}}>
              <p style={{fontSize: 12, color: '#999', marginBottom: 4}}>
                {new Date(answer.created_at).toLocaleDateString()} • {answer.events?.title}
              </p>
              <h4 style={{marginBottom: 4}}>{answer.questions?.text}</h4>
              <p style={{background: '#eef', padding: 8, borderRadius: 6}}>
                {Array.isArray(answer.answer_data) 
                  ? answer.answer_data.join(', ') 
                  : String(answer.answer_data)}
              </p>
            </div>
          ))
        ) : (
          <p className="no-data">Нет ответов</p>
        )}
      </div>
    </div>
  );
};
