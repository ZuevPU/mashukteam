import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../hooks/useTelegram';
import {
  analyticsApi,
  UserActivityStats,
  DirectionStats,
  EventParticipationStats,
  QuestionAnswerStats,
  GamificationStats,
  AssignmentStats,
  RegistrationTrend,
} from '../../services/analyticsApi';
import { MetricCard } from '../../components/analytics/MetricCard';
import { ProgressBar } from '../../components/analytics/ProgressBar';
import './AdminScreens.css';
import './AnalyticsScreen.css';

interface AdminAnalyticsScreenProps {
  onBack: () => void;
}

type TabType = 'activity' | 'directions' | 'events' | 'questions' | 'gamification' | 'assignments' | 'registrations';

export const AdminAnalyticsScreen: React.FC<AdminAnalyticsScreenProps> = ({ onBack }) => {
  const { initData, showAlert } = useTelegram();
  const [activeTab, setActiveTab] = useState<TabType>('activity');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [trendDays, setTrendDays] = useState<number>(30);
  
  const [activityStats, setActivityStats] = useState<UserActivityStats | null>(null);
  const [directionStats, setDirectionStats] = useState<DirectionStats[]>([]);
  const [eventStats, setEventStats] = useState<EventParticipationStats[]>([]);
  const [questionStats, setQuestionStats] = useState<QuestionAnswerStats[]>([]);
  const [gamificationStats, setGamificationStats] = useState<GamificationStats | null>(null);
  const [assignmentStats, setAssignmentStats] = useState<AssignmentStats | null>(null);
  const [registrationTrend, setRegistrationTrend] = useState<RegistrationTrend[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab, period, trendDays]);

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
    
    setLoading(prev => ({ ...prev, [activeTab]: true }));
    try {
      const dateRange = getDateRange();
      
      switch (activeTab) {
        case 'activity':
          const activity = await analyticsApi.getUserActivity(initData, dateRange.dateFrom, dateRange.dateTo);
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
        case 'gamification':
          const gamification = await analyticsApi.getGamificationStats(initData);
          setGamificationStats(gamification);
          break;
        case 'assignments':
          const assignments = await analyticsApi.getAssignmentStats(initData);
          setAssignmentStats(assignments);
          break;
        case 'registrations':
          const trend = await analyticsApi.getRegistrationTrend(initData, trendDays);
          setRegistrationTrend(trend);
          break;
      }
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      showAlert('Ошибка загрузки аналитики');
    } finally {
      setLoading(prev => ({ ...prev, [activeTab]: false }));
    }
  };

  const tabs = [
    { id: 'activity' as TabType, label: 'Активность', icon: '👥' },
    { id: 'directions' as TabType, label: 'Направления', icon: '📍' },
    { id: 'events' as TabType, label: 'Программа', icon: '📅' },
    { id: 'questions' as TabType, label: 'Вопросы', icon: '❓' },
    { id: 'gamification' as TabType, label: 'Баллы', icon: '🏆' },
    { id: 'assignments' as TabType, label: 'Задания', icon: '📋' },
    { id: 'registrations' as TabType, label: 'Регистрации', icon: '📊' },
  ];

  const periods = [
    { value: 'today', label: 'Сегодня' },
    { value: 'week', label: 'Неделя' },
    { value: 'month', label: 'Месяц' },
    { value: 'all', label: 'Все время' },
  ];

  const isLoading = loading[activeTab] || false;
  const activeUsersPercent = activityStats && activityStats.totalUsers > 0
    ? (activityStats.activeUsers / activityStats.totalUsers) * 100
    : 0;

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Аналитика</h3>
      </div>

      {/* Выбор периода */}
      {(activeTab === 'activity' || activeTab === 'registrations') && (
        <div className="settings-section" style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
            {activeTab === 'registrations' ? 'Период (дней):' : 'Период:'}
          </label>
          {activeTab === 'registrations' ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[7, 14, 30, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setTrendDays(days)}
                  className="create-btn"
                  style={{
                    background: trendDays === days ? 'var(--color-primary, #3E529B)' : '#999',
                    padding: '8px 16px',
                    fontSize: '14px',
                  }}
                >
                  {days} дней
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {periods.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value as any)}
                  className="create-btn"
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
          )}
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
      {isLoading ? (
        <div className="loading">Загрузка...</div>
      ) : (
        <div className="admin-list">
          {/* Вкладка Активность */}
          {activeTab === 'activity' && activityStats && (
            <>
              <div className="analytics-section">
                <h4>Общая статистика</h4>
                <div className="analytics-grid">
                  <MetricCard
                    title="Всего пользователей"
                    value={activityStats.totalUsers}
                    icon="👥"
                    color="#3E529B"
                  />
                  <MetricCard
                    title="Активных пользователей"
                    value={activityStats.activeUsers}
                    icon="✅"
                    progress={activeUsersPercent}
                    color="#28a745"
                    subtitle={`${activeUsersPercent.toFixed(1)}% от общего числа`}
                  />
                  <MetricCard
                    title="Среднее ответов"
                    value={activityStats.averageAnswersPerUser.toFixed(2)}
                    icon="📝"
                    color="#35A2A8"
                  />
                </div>
              </div>

              <div className="analytics-section">
                <h4>Ответы</h4>
                <div className="analytics-grid">
                  <MetricCard
                    title="Всего ответов"
                    value={activityStats.totalAnswers}
                    icon="💬"
                    color="#3E529B"
                  />
                  <MetricCard
                    title="На программы"
                    value={activityStats.totalEventAnswers}
                    icon="📅"
                    color="#3E529B"
                  />
                  <MetricCard
                    title="На диагностики"
                    value={activityStats.totalDiagnosticAnswers}
                    icon="🩺"
                    color="#3E529B"
                  />
                  <MetricCard
                    title="На вопросы"
                    value={activityStats.totalTargetedAnswers}
                    icon="❓"
                    color="#3E529B"
                  />
                  <MetricCard
                    title="Выполнено заданий"
                    value={activityStats.totalSubmissions}
                    icon="📋"
                    color="#3E529B"
                  />
                </div>
              </div>
            </>
          )}

          {/* Вкладка Направления */}
          {activeTab === 'directions' && (
            <div className="analytics-section">
              <h4>Статистика по направлениям</h4>
              {directionStats.length === 0 ? (
                <p className="no-data">Нет данных</p>
              ) : (
                <>
                  {directionStats.map((stat) => {
                    const totalUsers = directionStats.reduce((sum, s) => sum + s.userCount, 0);
                    const userPercent = totalUsers > 0 ? (stat.userCount / totalUsers) * 100 : 0;
                    return (
                      <div key={stat.directionCode} className="admin-item-card block" style={{ marginBottom: '12px' }}>
                        <h4 style={{ marginBottom: '12px' }}>{stat.directionName}</h4>
                        <div className="analytics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                          <MetricCard
                            title="Пользователей"
                            value={stat.userCount}
                            progress={userPercent}
                            color="#3E529B"
                          />
                          <MetricCard
                            title="Ответов"
                            value={stat.totalAnswers}
                            color="#35A2A8"
                          />
                          <MetricCard
                            title="Заданий"
                            value={stat.totalSubmissions}
                            color="#35A2A8"
                          />
                        </div>
                        <div style={{ marginTop: '12px' }}>
                          <ProgressBar
                            value={stat.averageAnswersPerUser * 10}
                            label="Среднее на пользователя"
                            color="#3E529B"
                            showPercentage={false}
                          />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* Вкладка Программа */}
          {activeTab === 'events' && (
            <div className="analytics-section">
              <h4>Статистика по программам</h4>
              {eventStats.length === 0 ? (
                <p className="no-data">Нет данных</p>
              ) : (
                eventStats.map((stat) => (
                  <div key={stat.eventId} className="admin-item-card block" style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <h4>{stat.eventTitle}</h4>
                      <span className={`status-badge ${stat.eventType}`}>
                        {stat.eventType === 'event' ? 'Программа' : 'Диагностика'}
                      </span>
                    </div>
                    <div className="analytics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                      <MetricCard
                        title="Участников"
                        value={stat.participantsCount}
                        color="#3E529B"
                      />
                      <MetricCard
                        title="Ответов"
                        value={stat.answersCount}
                        color="#35A2A8"
                      />
                      <MetricCard
                        title="Вопросов"
                        value={stat.questionsCount}
                        color="#35A2A8"
                      />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <ProgressBar
                        value={stat.participationRate}
                        label="Процент участия"
                        color="#3E529B"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Вкладка Вопросы */}
          {activeTab === 'questions' && (
            <div className="analytics-section">
              <h4>Статистика по вопросам</h4>
              {questionStats.length === 0 ? (
                <p className="no-data">Нет данных</p>
              ) : (
                questionStats.map((stat) => {
                  const answerRate = stat.uniqueUsersCount > 0 ? (stat.answersCount / stat.uniqueUsersCount) * 100 : 0;
                  return (
                    <div key={stat.questionId} className="admin-item-card block" style={{ marginBottom: '12px' }}>
                      <h4 style={{ marginBottom: '12px', fontSize: '14px' }}>{stat.questionText}</h4>
                      <div className="analytics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                        <MetricCard
                          title="Ответов"
                          value={stat.answersCount}
                          color="#3E529B"
                        />
                        <MetricCard
                          title="Уникальных пользователей"
                          value={stat.uniqueUsersCount}
                          color="#35A2A8"
                        />
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-primary, #2C2B2B)', opacity: 0.7 }}>
                        Тип: {stat.questionType}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Вкладка Баллы */}
          {activeTab === 'gamification' && gamificationStats && (
            <>
              <div className="analytics-section">
                <h4>Статистика по баллам и достижениям</h4>
                <div className="analytics-grid">
                  <MetricCard
                    title="Всего баллов"
                    value={gamificationStats.totalPoints}
                    icon="⭐"
                    color="#3E529B"
                  />
                  <MetricCard
                    title="Среднее на пользователя"
                    value={gamificationStats.averagePointsPerUser}
                    icon="📊"
                    color="#35A2A8"
                  />
                  <MetricCard
                    title="Всего достижений"
                    value={gamificationStats.totalAchievements}
                    icon="🏆"
                    color="#3E529B"
                  />
                  <MetricCard
                    title="Разблокировано"
                    value={gamificationStats.unlockedAchievements}
                    icon="✅"
                    progress={gamificationStats.totalAchievements > 0
                      ? (gamificationStats.unlockedAchievements / gamificationStats.totalAchievements) * 100
                      : 0}
                    color="#28a745"
                  />
                </div>
              </div>

              {gamificationStats.topUsers.length > 0 && (
                <div className="analytics-section">
                  <h4>Топ пользователей по баллам</h4>
                  <div className="analytics-top-users">
                    {gamificationStats.topUsers.map((user, index) => (
                      <div key={user.userId} className="analytics-top-user-item">
                        <div className="analytics-top-user-name">
                          {index + 1}. {user.userName}
                        </div>
                        <div className="analytics-top-user-stats">
                          <span className="analytics-top-user-points">{user.points} баллов</span>
                          <span className="analytics-top-user-achievements">{user.achievements} достижений</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Вкладка Задания */}
          {activeTab === 'assignments' && assignmentStats && (
            <>
              <div className="analytics-section">
                <h4>Статистика по заданиям</h4>
                <div className="analytics-grid">
                  <MetricCard
                    title="Всего заданий"
                    value={assignmentStats.totalAssignments}
                    icon="📋"
                    color="#3E529B"
                  />
                  <MetricCard
                    title="Выполнено"
                    value={assignmentStats.totalSubmissions}
                    icon="✅"
                    color="#28a745"
                  />
                  <MetricCard
                    title="Принято"
                    value={assignmentStats.approvedSubmissions}
                    icon="✓"
                    color="#28a745"
                  />
                  <MetricCard
                    title="Отклонено"
                    value={assignmentStats.rejectedSubmissions}
                    icon="✗"
                    color="#dc3545"
                  />
                  <MetricCard
                    title="На проверке"
                    value={assignmentStats.pendingSubmissions}
                    icon="⏳"
                    color="#ffc107"
                  />
                  <MetricCard
                    title="Средняя награда"
                    value={assignmentStats.averageReward}
                    icon="🎁"
                    color="#3E529B"
                    subtitle="баллов"
                  />
                </div>
              </div>

              {assignmentStats.totalSubmissions > 0 && (
                <div className="analytics-section">
                  <h4>Распределение статусов</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <ProgressBar
                      value={(assignmentStats.approvedSubmissions / assignmentStats.totalSubmissions) * 100}
                      label="Принято"
                      color="#28a745"
                    />
                    <ProgressBar
                      value={(assignmentStats.rejectedSubmissions / assignmentStats.totalSubmissions) * 100}
                      label="Отклонено"
                      color="#dc3545"
                    />
                    <ProgressBar
                      value={(assignmentStats.pendingSubmissions / assignmentStats.totalSubmissions) * 100}
                      label="На проверке"
                      color="#ffc107"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Вкладка Регистрации */}
          {activeTab === 'registrations' && (
            <div className="analytics-section">
              <h4>Динамика регистраций</h4>
              {registrationTrend.length === 0 ? (
                <p className="no-data">Нет данных</p>
              ) : (
                <>
                  <div className="analytics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: '16px' }}>
                    <MetricCard
                      title="Сегодня"
                      value={registrationTrend[registrationTrend.length - 1]?.count || 0}
                      icon="📅"
                      color="#3E529B"
                    />
                    <MetricCard
                      title="За неделю"
                      value={registrationTrend.slice(-7).reduce((sum, item) => sum + item.count, 0)}
                      icon="📊"
                      color="#35A2A8"
                    />
                    <MetricCard
                      title="За месяц"
                      value={registrationTrend.reduce((sum, item) => sum + item.count, 0)}
                      icon="📈"
                      color="#3E529B"
                    />
                  </div>
                  <div className="analytics-trend-chart">
                    {registrationTrend.map((item) => {
                      const maxCount = Math.max(...registrationTrend.map(i => i.count), 1);
                      const percent = (item.count / maxCount) * 100;
                      return (
                        <div key={item.date} className="analytics-trend-item">
                          <div className="analytics-trend-date">
                            {new Date(item.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                          </div>
                          <div className="analytics-trend-bar">
                            <div className="analytics-trend-bar-fill" style={{ width: `${percent}%` }} />
                          </div>
                          <div className="analytics-trend-count">{item.count}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
