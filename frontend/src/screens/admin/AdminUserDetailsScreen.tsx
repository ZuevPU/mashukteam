import React, { useEffect, useState } from 'react';
import { User, UserType, AssignmentSubmission, Direction } from '../../types';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css';

interface TargetedAnswerWithQuestion {
  id: string;
  answer_data: any;
  created_at: string;
  question?: {
    id: string;
    text: string;
    type: string;
  };
}

interface UserWithDetails extends User {
  answers: any[];
  targetedAnswers?: TargetedAnswerWithQuestion[];
  submissions?: AssignmentSubmission[];
}

interface AdminUserDetailsScreenProps {
  userId: string;
  onBack: () => void;
}

export const AdminUserDetailsScreen: React.FC<AdminUserDetailsScreenProps> = ({ userId, onBack }) => {
  const { initData, showAlert } = useTelegram();
  const [user, setUser] = useState<UserWithDetails | null>(null);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('');
  const [selectedDirection, setSelectedDirection] = useState('');

  const loadDetails = async () => {
    if (!initData) return;
    try {
      const [userData, typesData, directionsResponse] = await Promise.all([
        adminApi.getUserDetails(userId, initData),
        adminApi.getUserTypes(),
        fetch(`${import.meta.env.VITE_API_URL || ''}/api/directions`).then(r => r.json())
      ]);
      setUser(userData as UserWithDetails);
      setUserTypes(typesData);
      setDirections(directionsResponse.directions || []);
      setSelectedType(userData.user_type || '');
      setSelectedDirection(userData.direction_id || '');
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
      await adminApi.setUserType(userId, selectedType, initData);
      showAlert('Тип сохранен');
      loadDetails();
    } catch (error) {
      console.error('Error saving user type:', error);
      showAlert('Ошибка сохранения');
    }
  };

  const handleSaveDirection = async () => {
    if (!initData) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/users/${userId}/direction`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, direction_id: selectedDirection || null })
      });
      if (response.ok) {
        showAlert('Направление сохранено');
        loadDetails();
      } else {
        showAlert('Ошибка сохранения');
      }
    } catch (error) {
      console.error('Error saving direction:', error);
      showAlert('Ошибка сохранения');
    }
  };

  const formatAnswer = (data: any) => {
    if (Array.isArray(data)) return data.join(', ');
    return String(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="status-badge published">✓ Принято</span>;
      case 'rejected': return <span className="status-badge completed">✗ Отклонено</span>;
      case 'pending': return <span className="status-badge draft">⏳ На проверке</span>;
      default: return <span className="status-badge">{status}</span>;
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!user) return <div className="error">Пользователь не найден</div>;

  const diagnosticAnswers = user.answers?.filter((a: any) => a.events?.type === 'diagnostic') || [];
  const eventAnswers = user.answers?.filter((a: any) => a.events?.type !== 'diagnostic') || [];
  const targetedAnswers = user.targetedAnswers || [];
  const submissions = user.submissions || [];

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Профиль</h3>
      </div>

      {/* Основная информация */}
      <div className="admin-card" style={{marginBottom: 20}}>
        <h3>{user.first_name} {user.last_name}</h3>
        <p>ID: {user.telegram_id}</p>
        <p>@{user.telegram_username || 'нет username'}</p>
        <p>Статус: <strong>{user.status}</strong></p>
        <p>Баллы: <strong>{user.total_points || 0}</strong></p>
        
        <div className="form-group" style={{marginTop: 16}}>
          <label>Тип пользователя</label>
          <div style={{display: 'flex', gap: 8}}>
            <select 
              className="form-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{flex: 1}}
            >
              <option value="">— Не задан —</option>
              {userTypes.map(t => (
                <option key={t.id} value={t.slug}>{t.name}</option>
              ))}
            </select>
            <button 
              className="save-btn" 
              style={{marginTop: 0, padding: '0 20px'}} 
              onClick={handleSaveType}
            >
              OK
            </button>
          </div>
        </div>

        <div className="form-group" style={{marginTop: 16}}>
          <label>Направление</label>
          <div style={{display: 'flex', gap: 8}}>
            <select 
              className="form-select"
              value={selectedDirection}
              onChange={(e) => setSelectedDirection(e.target.value)}
              style={{flex: 1}}
            >
              <option value="">— Не выбрано —</option>
              {directions.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button 
              className="save-btn" 
              style={{marginTop: 0, padding: '0 20px'}} 
              onClick={handleSaveDirection}
            >
              OK
            </button>
          </div>
        </div>
      </div>

      {/* Выполненные задания */}
      <h3 style={{marginBottom: 12}}>📋 Задания ({submissions.length})</h3>
      <div className="admin-list" style={{marginBottom: 24}}>
        {submissions.length > 0 ? (
          submissions.map((sub: any) => (
            <div key={sub.id} className="admin-item-card block">
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                <span style={{fontWeight: 600}}>{sub.assignment?.title || 'Задание'}</span>
                {getStatusBadge(sub.status)}
              </div>
              <p className="answer-box">{sub.content}</p>
              {sub.admin_comment && (
                <p style={{fontSize: 12, marginTop: 8, opacity: 0.7}}>
                  💬 {sub.admin_comment}
                </p>
              )}
              {sub.status === 'approved' && sub.assignment?.reward && (
                <p style={{fontSize: 12, marginTop: 4, color: '#34c759'}}>
                  +{sub.assignment.reward} баллов
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="no-data">Нет выполненных заданий</p>
        )}
      </div>

      {/* Ответы на персональные вопросы */}
      <h3 style={{marginBottom: 12}}>❓ Персональные вопросы ({targetedAnswers.length})</h3>
      <div className="admin-list" style={{marginBottom: 24}}>
        {targetedAnswers.length > 0 ? (
          targetedAnswers.map((answer: TargetedAnswerWithQuestion) => (
            <div key={answer.id} className="admin-item-card block" style={{background: 'rgba(255, 149, 0, 0.1)'}}>
              <h4 style={{marginBottom: 8}}>{answer.question?.text || 'Вопрос'}</h4>
              <p className="answer-box">{formatAnswer(answer.answer_data)}</p>
              <p style={{fontSize: 11, opacity: 0.6, marginTop: 8}}>
                {new Date(answer.created_at).toLocaleDateString()}
              </p>
            </div>
          ))
        ) : (
          <p className="no-data">Нет ответов</p>
        )}
      </div>

      {/* Ответы на диагностику */}
      <h3 style={{marginBottom: 12}}>🩺 Диагностика ({diagnosticAnswers.length})</h3>
      <div className="admin-list" style={{marginBottom: 24}}>
        {diagnosticAnswers.length > 0 ? (
          diagnosticAnswers.map((answer: any) => (
            <div key={answer.id} className="admin-item-card block" style={{background: 'rgba(52, 199, 89, 0.1)'}}>
              <p style={{fontSize: 12, opacity: 0.7, marginBottom: 4}}>
                {answer.events?.title}
              </p>
              <h4 style={{marginBottom: 8}}>{answer.questions?.text}</h4>
              <p className="answer-box">{formatAnswer(answer.answer_data)}</p>
            </div>
          ))
        ) : (
          <p className="no-data">Диагностика не пройдена</p>
        )}
      </div>

      {/* Ответы на мероприятия */}
      <h3 style={{marginBottom: 12}}>📅 Мероприятия ({eventAnswers.length})</h3>
      <div className="admin-list">
        {eventAnswers.length > 0 ? (
          eventAnswers.map((answer: any) => (
            <div key={answer.id} className="admin-item-card block">
              <p style={{fontSize: 12, opacity: 0.7, marginBottom: 4}}>
                {new Date(answer.created_at).toLocaleDateString()} • {answer.events?.title}
              </p>
              <h4 style={{marginBottom: 8}}>{answer.questions?.text}</h4>
              <p className="answer-box">{formatAnswer(answer.answer_data)}</p>
            </div>
          ))
        ) : (
          <p className="no-data">Нет ответов</p>
        )}
      </div>
    </div>
  );
};
