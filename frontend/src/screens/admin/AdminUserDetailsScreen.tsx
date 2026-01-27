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
  const { initData, showAlert } = useTelegram();
  const [user, setUser] = useState<User & { answers: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState('');

  const loadDetails = async () => {
    if (!initData) return;
    try {
      const data = await adminApi.getUserDetails(userId, initData);
      setUser(data);
      setUserType(data.user_type || '');
    } catch (error) {
      console.error('Error loading user details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [userId, initData]);

  const handleSaveType = async () => {
    if (!initData) return;
    try {
      await adminApi.setUserType(userId, userType, initData);
      showAlert('Тип пользователя обновлен');
      loadDetails();
    } catch (error) {
      console.error('Error saving user type:', error);
      showAlert('Ошибка сохранения');
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!user) return <div className="error">Пользователь не найден</div>;

  const diagnosticAnswers = user.answers?.filter((a: any) => a.events?.type === 'diagnostic') || [];
  const eventAnswers = user.answers?.filter((a: any) => a.events?.type !== 'diagnostic') || [];

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
        
        <div className="form-group" style={{marginTop: 12}}>
          <label>Тип пользователя (для таргетинга)</label>
          <div style={{display: 'flex', gap: 8}}>
            <input 
              className="form-input" 
              value={userType} 
              onChange={(e) => setUserType(e.target.value)}
              placeholder="Например: Тип 1"
            />
            <button className="save-btn" style={{marginTop: 0, padding: '0 16px'}} onClick={handleSaveType}>OK</button>
          </div>
        </div>
      </div>

      <h3>Ответы на диагностику</h3>
      <div className="admin-list" style={{marginBottom: 20}}>
        {diagnosticAnswers.length > 0 ? (
          diagnosticAnswers.map((answer: any) => (
            <div key={answer.id} className="admin-item-card block" style={{background: 'rgba(51, 144, 236, 0.1)'}}>
              <p style={{fontSize: 12, opacity: 0.7, marginBottom: 4}}>
                {answer.events?.title}
              </p>
              <h4 style={{marginBottom: 4}}>{answer.questions?.text}</h4>
              <p className="answer-box">
                {Array.isArray(answer.answer_data) 
                  ? answer.answer_data.join(', ') 
                  : String(answer.answer_data)}
              </p>
            </div>
          ))
        ) : (
          <p className="no-data">Нет диагностических данных</p>
        )}
      </div>

      <h3>История ответов на мероприятия</h3>
      <div className="admin-list">
        {eventAnswers.length > 0 ? (
          eventAnswers.map((answer: any) => (
            <div key={answer.id} className="admin-item-card block">
              <p style={{fontSize: 12, opacity: 0.7, marginBottom: 4}}>
                {new Date(answer.created_at).toLocaleDateString()} • {answer.events?.title}
              </p>
              <h4 style={{marginBottom: 4}}>{answer.questions?.text}</h4>
              <p className="answer-box">
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
