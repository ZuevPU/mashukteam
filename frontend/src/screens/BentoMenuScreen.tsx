import { useState, useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { getUserStatus, getUserStats, getUserAchievements } from '../services/api';
import { User, UserStats as UserStatsType, Achievement, UserAchievement, Event } from '../types';
import { BentoGrid, BentoGridItem } from '../components/bento/BentoGrid';
import { ProfileCard } from '../components/bento/ProfileCard';
import { GamificationCard } from '../components/bento/GamificationCard';
import { AchievementsCard } from '../components/bento/AchievementsCard';
import { StatsCard } from '../components/gamification/StatsCard';
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
import { AdminAssignmentsScreen } from './admin/AdminAssignmentsScreen';
import { AdminAssignmentFormScreen } from './admin/AdminAssignmentFormScreen';
import { AdminAssignmentSubmissionsScreen } from './admin/AdminAssignmentSubmissionsScreen';
import { AdminLeaderboardScreen } from './admin/AdminLeaderboardScreen';
import { TargetedQuestionsListScreen } from './TargetedQuestionsListScreen';
import { AssignmentsListScreen } from './assignments/AssignmentsListScreen';
import { AssignmentSubmitScreen } from './assignments/AssignmentSubmitScreen';
import './BentoMenuScreen.css';

type ScreenView = 
  | 'menu' 
  | 'events_list' 
  | 'diagnostic_list'
  | 'targeted_questions'
  | 'event_survey' 
  | 'assignments_list'
  | 'admin'
  | 'admin_events'
  | 'admin_diagnostics'
  | 'admin_event_form'
  | 'admin_questions'
  | 'admin_event_analytics'
  | 'admin_users'
  | 'admin_user_details'
  | 'admin_assignments'
  | 'admin_assignment_form'
  | 'admin_assignment_submissions'
  | 'admin_leaderboard';

export function BentoMenuScreen() {
  const { initData, isReady, showAlert } = useTelegram();
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
  const [selectedAssignment, setSelectedAssignment] = useState<any>(undefined);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

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
          user_type: (statusResponse.user as any).user_type,
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
      typeFilter="event"
      onEventClick={(id) => { setSelectedEventId(id); setView('event_survey'); }} 
      onBack={() => setView('menu')} 
    />;
  }
  if (view === 'diagnostic_list') {
    return <EventsListScreen 
      typeFilter="diagnostic"
      onEventClick={(id) => { setSelectedEventId(id); setView('event_survey'); }} 
      onBack={() => setView('menu')} 
    />;
  }
  if (view === 'targeted_questions') {
    return <TargetedQuestionsListScreen onBack={() => setView('menu')} />;
  }
  if (view === 'assignments_list') {
    return <AssignmentsListScreen 
      onBack={() => setView('menu')} 
      onSelect={(a) => { setSelectedAssignment(a); setView('assignment_submit' as any); }}
    />;
  }
  if ((view as any) === 'assignment_submit' && selectedAssignment) {
    return <AssignmentSubmitScreen 
      assignment={selectedAssignment}
      onBack={() => setView('assignments_list')}
      onSuccess={() => setView('assignments_list')}
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
      onManageDiagnostics={() => setView('admin_diagnostics')}
      onManageAssignments={() => setView('admin_assignments')}
      onManageUsers={() => setView('admin_users')}
    />;
  }
  if (view === 'admin_events') {
    return <AdminEventsScreen 
      typeFilter="event"
      onBack={() => setView('admin')} 
      onCreate={() => { setSelectedEvent(undefined); setView('admin_event_form'); }}
      onEdit={(event) => { setSelectedEvent(event); setView('admin_event_form'); }}
      onAddQuestions={(event) => { setSelectedEvent(event); setView('admin_questions'); }}
      onAnalytics={(eventId) => { setSelectedEventId(eventId); setView('admin_event_analytics'); }}
    />;
  }
  if (view === 'admin_diagnostics') {
    return <AdminEventsScreen 
      typeFilter="diagnostic"
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

  // Админка заданий
  if (view === 'admin_assignments') {
    return <AdminAssignmentsScreen 
      onBack={() => setView('admin')}
      onCreate={() => { setSelectedAssignment(undefined); setView('admin_assignment_form'); }}
      onEdit={(a) => { setSelectedAssignment(a); setView('admin_assignment_form'); }}
      onSubmissions={(id) => { setSelectedAssignmentId(id); setView('admin_assignment_submissions'); }}
      onLeaderboard={() => setView('admin_leaderboard')}
    />;
  }
  if (view === 'admin_assignment_form') {
    return <AdminAssignmentFormScreen 
      onBack={() => setView('admin_assignments')}
      onSuccess={() => setView('admin_assignments')}
      editingAssignment={selectedAssignment}
    />;
  }
  if (view === 'admin_assignment_submissions' && selectedAssignmentId) {
    return <AdminAssignmentSubmissionsScreen 
      assignmentId={selectedAssignmentId}
      onBack={() => setView('admin_assignments')}
    />;
  }
  if (view === 'admin_leaderboard') {
    return <AdminLeaderboardScreen onBack={() => setView('admin_assignments')} />;
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

  // 1. Диагностика
  bentoItems.push({
    id: 'diagnostic',
    content: (
      <div className="bento-card diagnostic-card" onClick={() => setView('diagnostic_list')}>
        <span style={{fontSize: '24px'}}>🩺</span>
        <h3>Диагностика</h3>
        <p>Пройти входной тест</p>
      </div>
    ),
    size: '1x1',
  });

  // 2. Мероприятия
  bentoItems.push({
    id: 'events',
    content: <EventsCard onClick={() => setView('events_list')} />,
    size: '1x1',
  });

  // 3. Вопросы
  bentoItems.push({
    id: 'my_questions',
    content: (
      <div className="bento-card questions-card" onClick={() => setView('targeted_questions')}>
        <span style={{fontSize: '24px'}}>💬</span>
        <h3>Вопросы</h3>
        <p>Личные и общие</p>
      </div>
    ),
    size: '1x1',
  });

  // 4. Задания
  bentoItems.push({
    id: 'assignments',
    content: (
      <div className="bento-card assignments-card" onClick={() => setView('assignments_list')}>
        <span style={{fontSize: '24px'}}>📋</span>
        <h3>Задания</h3>
        <p>Выполняй и получай баллы</p>
      </div>
    ),
    size: '1x1',
  });

  // 5. Геймификация
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
    bentoItems.push({
      id: 'stats',
      content: <StatsCard stats={stats} />,
      size: '2x1',
    });
  }

  // Кнопка админки (внизу)
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
