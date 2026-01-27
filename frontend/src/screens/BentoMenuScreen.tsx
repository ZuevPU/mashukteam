import { useState, useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { getUserStatus, getUserStats, getUserAchievements } from '../services/api';
import { User, UserStats as UserStatsType, Achievement, UserAchievement, Event } from '../types';
import { BentoGrid, BentoGridItem } from '../components/bento/BentoGrid';
import { ProfileCard } from '../components/bento/ProfileCard';
import { GamificationCard } from '../components/bento/GamificationCard';
import { AchievementsCard } from '../components/bento/AchievementsCard';
import { TasksCard } from '../components/bento/TasksCard';
import { StatsCard } from '../components/gamification/StatsCard';
import { SettingsCard } from '../components/bento/SettingsCard';
import { EventsCard } from '../components/bento/EventsCard';
import { EventsListScreen } from './events/EventsListScreen';
import { EventSurveyScreen } from './events/EventSurveyScreen';
import { AdminDashboard } from './admin/AdminDashboard';
import { AdminEventsScreen } from './admin/AdminEventsScreen';
import { AdminEventFormScreen } from './admin/AdminEventFormScreen';
import { AdminQuestionsScreen } from './admin/AdminQuestionsScreen';
import { AdminUsersScreen } from './admin/AdminUsersScreen';
import { AdminUserDetailsScreen } from './admin/AdminUserDetailsScreen';
import { AdminEventAnalyticsScreen } from './admin/AdminEventAnalyticsScreen';
import './BentoMenuScreen.css';

type ScreenView = 
  | 'menu' 
  | 'events_list' 
  | 'event_survey' 
  | 'admin'
  | 'admin_events'
  | 'admin_event_form'
  | 'admin_questions'
  | 'admin_event_analytics'
  | 'admin_users'
  | 'admin_user_details';

export function BentoMenuScreen() {
  const { initData, isReady } = useTelegram();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStatsType | null>(null);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  
  // Навигация
  const [view, setView] = useState<ScreenView>('menu');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>(undefined);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Загрузка данных
  useEffect(() => {
    if (!isReady || !initData) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const statusResponse = await getUserStatus(initData);
        if (!statusResponse.success || !statusResponse.user) {
          throw new Error('Не удалось загрузить данные пользователя');
        }

        const userId = statusResponse.user.id;
        const userData: User = {
          id: userId,
          telegram_id: statusResponse.user.telegram_id,
          telegram_username: null,
          first_name: statusResponse.user.first_name,
          last_name: '',
          middle_name: null,
          motivation: '',
          status: (statusResponse.status || 'new') as 'new' | 'registered',
          is_admin: (statusResponse.user as any).is_admin,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setUser(userData);

        // Загрузка статистики и достижений (можно пропустить если ошибка)
        try {
          const statsResponse = await getUserStats(userId, initData);
          if (statsResponse.success && statsResponse.stats) setStats(statsResponse.stats);
          
          const achievementsResponse = await getUserAchievements(userId, initData);
          if (achievementsResponse.success) {
            setAllAchievements(achievementsResponse.all_achievements || []);
            setUserAchievements(achievementsResponse.user_achievements || []);
          }
        } catch (e) { console.warn(e); }

      } catch (err: any) {
        console.error('Ошибка:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isReady, initData]);

  // === РОУТИНГ ===

  // Пользовательская часть
  if (view === 'events_list') {
    return <EventsListScreen 
      onEventClick={(id) => { setSelectedEventId(id); setView('event_survey'); }} 
      onBack={() => setView('menu')} 
    />;
  }
  if (view === 'event_survey' && selectedEventId) {
    return <EventSurveyScreen eventId={selectedEventId} onBack={() => setView('events_list')} />;
  }

  // Админская часть
  if (view === 'admin') {
    return <AdminDashboard 
      onBack={() => setView('menu')} 
      onManageEvents={() => setView('admin_events')}
      onManageUsers={() => setView('admin_users')}
    />;
  }
  if (view === 'admin_events') {
    return <AdminEventsScreen 
      onBack={() => setView('admin')} 
      onCreate={() => { setSelectedEvent(undefined); setView('admin_event_form'); }}
      onEdit={(event) => { setSelectedEvent(event); setView('admin_event_form'); }}
      onAddQuestions={(event) => { setSelectedEvent(event); setView('admin_questions'); }}
      onAnalytics={(eventId) => { setSelectedEventId(eventId); setView('admin_event_analytics'); }}
    />;
  }
  if (view === 'admin_event_form') {
    return <AdminEventFormScreen 
      onBack={() => setView('admin_events')}
      onSuccess={() => setView('admin_events')}
      editingEvent={selectedEvent}
    />;
  }
  if (view === 'admin_questions' && selectedEvent) {
    return <AdminQuestionsScreen 
      event={selectedEvent}
      onBack={() => setView('admin_events')}
    />;
  }
  if (view === 'admin_event_analytics' && selectedEventId) {
    return <AdminEventAnalyticsScreen 
      eventId={selectedEventId}
      onBack={() => setView('admin_events')}
    />;
  }
  if (view === 'admin_users') {
    return <AdminUsersScreen 
      onBack={() => setView('admin')} 
      onUserClick={(id) => { setSelectedUserId(id); setView('admin_user_details'); }}
    />;
  }
  if (view === 'admin_user_details' && selectedUserId) {
    return <AdminUserDetailsScreen 
      userId={selectedUserId}
      onBack={() => setView('admin_users')}
    />;
  }

  // === ГЛАВНОЕ МЕНЮ (BENTO) ===

  const bentoItems: BentoGridItem[] = [];

  if (user) {
    bentoItems.push({
      id: 'profile',
      content: <ProfileCard user={user} />,
      size: '2x1',
    });
  }

  bentoItems.push({
    id: 'events',
    content: <EventsCard onClick={() => setView('events_list')} />,
    size: '1x1',
  });

  if (stats) {
    bentoItems.push({
      id: 'gamification',
      content: <GamificationCard stats={stats} />,
      size: '1x1',
    });
    bentoItems.push({
      id: 'achievements',
      content: <AchievementsCard allAchievements={allAchievements} userAchievements={userAchievements} />,
      size: '1x1',
    });
  }

  // Кнопка админки
  if (user?.is_admin === 1) {
    bentoItems.push({
      id: 'admin',
      content: (
        <div 
          onClick={() => setView('admin')}
          style={{
            height: '100%', display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center',
            background: '#333', color: 'white', borderRadius: '12px', cursor: 'pointer'
          }}
        >
          <span style={{fontSize: '24px'}}>🛠</span>
          <span style={{fontWeight: 600}}>Админка</span>
        </div>
      ),
      size: '1x1',
    });
  }

  bentoItems.push({ id: 'tasks', content: <TasksCard />, size: '1x1' });
  bentoItems.push({ id: 'settings', content: <SettingsCard />, size: '1x1' });

  if (loading) return (
    <div className="bento-menu-screen">
      <div className="bento-loading"><div className="loading-spinner">⏳</div><p>Загрузка...</p></div>
    </div>
  );

  if (error) return (
    <div className="bento-menu-screen">
      <div className="bento-error"><p>Ошибка: {error}</p><button onClick={() => window.location.reload()}>Обновить</button></div>
    </div>
  );

  return (
    <div className="bento-menu-screen">
      <div className="bento-container">
        <h1 className="bento-title">Главное меню</h1>
        <BentoGrid items={bentoItems} />
      </div>
    </div>
  );
}
