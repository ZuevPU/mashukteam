import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../hooks/useTelegram';
import { analyticsApi, UserActivityStats, DirectionStats, EventParticipationStats, QuestionAnswerStats } from '../../services/analyticsApi';
import './AdminScreens.css';

interface AdminAnalyticsScreenProps {
  onBack: () => void;
}

type TabType = 'activity' | 'directions' | 'events' | 'questions';

export const AdminAnalyticsScreen: React.FC<AdminAnalyticsScreenProps> = ({ onBack }) => {
  const { initData, showAlert } = useTelegram();
  const [activeTab, setActiveTab] = useState<TabType>('activity');
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');
  
  const [activityStats, setActivityStats] = useState<UserActivityStats | null>(null);
  const [directionStats, setDirectionStats] = useState<DirectionStats[]>([]);
  const [eventStats, setEventStats] = useState<EventParticipationStats[]>([]);
  const [questionStats, setQuestionStats] = useState<QuestionAnswerStats[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab, period]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'today':
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return { dateFrom: todayStart.toISOString(), dateTo: now.toISOString() };
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { dateFrom: weekAgo.toISOString(), dateTo: now.toISOString() };
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { dateFrom: monthAgo.toISOString(), dateTo: now.toISOString() };
      default:
        return {};
    }
  };

  const loadData = async () => {
    if (!initData) return;
    
    setLoading(true);
    try {
      const dateRange = getDateRange();
      
      switch (activeTab) {
        case 'activity':
          const activity = await analyticsApi.getUserActivity(dateRange.dateFrom, dateRange.dateTo, initData);
          setActivityStats(activity);
          break;
        case 'directions':
          const directions = await analyticsApi.getDirectionStats(initData);
          setDirectionStats(directions);
          break;
        case 'events':
          const events = await analyticsApi.getEventStats(undefined, initData);
          setEventStats(events);
          break;
        case 'questions':
          const questions = await analyticsApi.getQuestionStats(undefined, initData);
          setQuestionStats(questions);
          break;
      }
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      showAlert('Ошибка загрузки аналитики');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'activity' as TabType, label: 'Активность', icon: '👥' },
    { id: 'directions' as TabType, label: 'Направления', icon: '📍' },
    { id: 'events' as TabType, label: 'Мероприятия', icon: '📅' },
    { id: 'questions' as TabType, label: 'Вопросы', icon: '❓' },
  ];

  const periods = [
    { value: 'today', label: 'Сегодня' },
    { value: 'week', label: 'Неделя' },
    { value: 'month', label: 'Месяц' },
    { value: 'all', label: 'Все время' },
  ];

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Аналитика</h3>
      </div>

      {/* Выбор периода */}
      {activeTab === 'activity' && (
        <div className="settings-section" style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Период:</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value as any)}
                className={period === p.value ? 'create-btn' : 'create-btn'}
                style={{
                  background: period === p.value ? 'var(--color-primary, #3E529B)' : '#999',
                  padding: '8px 16px',
                  fontSize: '14px',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="create-btn"
            style={{
              background: activeTab === tab.id ? 'var(--color-primary, #3E529B)' : '#999',
              padding: '10px 16px',
              fontSize: '14px',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Контент вкладок */}
      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : (
        <div className="admin-list">
          {activeTab === 'activity' && activityStats && (
            <>
              <div className="settings-section">
                <h4>Общая статистика</h4>
                <div className="info-item">
                  <span className="info-label">Всего пользователей:</span>
                  <span className="info-value">{activityStats.totalUsers}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Активных пользователей:</span>
                  <span className="info-value">{activityStats.activeUsers}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Среднее ответов на пользователя:</span>
                  <span className="info-value">{activityStats.averageAnswersPerUser}</span>
                </div>
              </div>

              <div className="settings-section">
                <h4>Ответы</h4>
                <div className="info-item">
                  <span className="info-label">Всего ответов:</span>
                  <span className="info-value">{activityStats.totalAnswers}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Ответы на мероприятия:</span>
                  <span className="info-value">{activityStats.totalEventAnswers}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Ответы на диагностики:</span>
                  <span className="info-value">{activityStats.totalDiagnosticAnswers}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Ответы на вопросы:</span>
                  <span className="info-value">{activityStats.totalTargetedAnswers}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Выполнено заданий:</span>
                  <span className="info-value">{activityStats.totalSubmissions}</span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'directions' && (
            <div className="settings-section">
              <h4>Статистика по направлениям</h4>
              {directionStats.length === 0 ? (
                <p className="no-data">Нет данных</p>
              ) : (
                directionStats.map((stat) => (
                  <div key={stat.directionId} className="admin-item-card block" style={{ marginBottom: '12px' }}>
                    <h4 style={{ marginBottom: '8px' }}>{stat.directionName}</h4>
                    <div className="info-item">
                      <span className="info-label">Пользователей:</span>
                      <span className="info-value">{stat.userCount}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Ответов:</span>
                      <span className="info-value">{stat.totalAnswers}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Заданий:</span>
                      <span className="info-value">{stat.totalSubmissions}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Среднее на пользователя:</span>
                      <span className="info-value">{stat.averageAnswersPerUser}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div className="settings-section">
              <h4>Статистика по мероприятиям</h4>
              {eventStats.length === 0 ? (
                <p className="no-data">Нет данных</p>
              ) : (
                eventStats.map((stat) => (
                  <div key={stat.eventId} className="admin-item-card block" style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h4>{stat.eventTitle}</h4>
                      <span className={`status-badge ${stat.eventType}`}>
                        {stat.eventType === 'event' ? 'Мероприятие' : 'Диагностика'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Участников:</span>
                      <span className="info-value">{stat.participantsCount}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Ответов:</span>
                      <span className="info-value">{stat.answersCount}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Вопросов:</span>
                      <span className="info-value">{stat.questionsCount}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Процент участия:</span>
                      <span className="info-value">{stat.participationRate}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="settings-section">
              <h4>Статистика по вопросам</h4>
              {questionStats.length === 0 ? (
                <p className="no-data">Нет данных</p>
              ) : (
                questionStats.map((stat) => (
                  <div key={stat.questionId} className="admin-item-card block" style={{ marginBottom: '12px' }}>
                    <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>{stat.questionText}</h4>
                    <div className="info-item">
                      <span className="info-label">Тип:</span>
                      <span className="info-value">{stat.questionType}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Ответов:</span>
                      <span className="info-value">{stat.answersCount}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Уникальных пользователей:</span>
                      <span className="info-value">{stat.uniqueUsersCount}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
