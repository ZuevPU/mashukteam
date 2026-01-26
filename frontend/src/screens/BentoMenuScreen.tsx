import React, { useState, useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { getInitData, getUserStatus, getUserStats, getUserAchievements } from '../services/api';
import { User, UserStats as UserStatsType, Achievement, UserAchievement } from '../types';
import { BentoGrid, BentoGridItem } from '../components/bento/BentoGrid';
import { ProfileCard } from '../components/bento/ProfileCard';
import { GamificationCard } from '../components/bento/GamificationCard';
import { AchievementsCard } from '../components/bento/AchievementsCard';
import { TasksCard } from '../components/bento/TasksCard';
import { StatsCard } from '../components/gamification/StatsCard';
import { SettingsCard } from '../components/bento/SettingsCard';
import './BentoMenuScreen.css';

/**
 * Экран Bento-меню с полноценным функционалом
 */
export function BentoMenuScreen() {
  const { initData, isReady } = useTelegram();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStatsType | null>(null);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);

  // Загрузка данных пользователя при монтировании
  useEffect(() => {
    if (!isReady || !initData) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Получаем статус пользователя для получения userId
        const statusResponse = await getUserStatus(initData);
        if (!statusResponse.success || !statusResponse.user) {
          throw new Error('Не удалось загрузить данные пользователя');
        }

        const userId = statusResponse.user.id;
        
        // Создаем базовые данные пользователя из ответа
        // В будущем можно добавить отдельный эндпоинт для получения полных данных
        const userData: User = {
          id: userId,
          telegram_id: statusResponse.user.telegram_id,
          telegram_username: null,
          first_name: statusResponse.user.first_name,
          last_name: '',
          middle_name: null,
          motivation: '',
          status: (statusResponse.status || 'new') as 'new' | 'registered',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setUser(userData);

        // Загружаем статистику
        try {
          const statsResponse = await getUserStats(userId, initData);
          if (statsResponse.success && statsResponse.stats) {
            setStats(statsResponse.stats);
          }
        } catch (err) {
          console.warn('Не удалось загрузить статистику:', err);
        }

        // Загружаем достижения
        try {
          const achievementsResponse = await getUserAchievements(userId, initData);
          if (achievementsResponse.success) {
            setAllAchievements(achievementsResponse.all_achievements || []);
            setUserAchievements(achievementsResponse.user_achievements || []);
          }
        } catch (err) {
          console.warn('Не удалось загрузить достижения:', err);
        }
      } catch (err: any) {
        console.error('Ошибка при загрузке данных:', err);
        setError(err.message || 'Ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isReady, initData]);

  // Формируем элементы сетки Bento
  const bentoItems: BentoGridItem[] = [];

  if (user) {
    bentoItems.push({
      id: 'profile',
      content: <ProfileCard user={user} />,
      size: '2x1',
    });
  }

  if (stats) {
    bentoItems.push({
      id: 'gamification',
      content: <GamificationCard stats={stats} />,
      size: '1x1',
    });

    bentoItems.push({
      id: 'achievements',
      content: (
        <AchievementsCard
          allAchievements={allAchievements}
          userAchievements={userAchievements}
        />
      ),
      size: '1x1',
    });

    bentoItems.push({
      id: 'stats',
      content: <StatsCard stats={stats} />,
      size: '2x1',
    });
  }

  bentoItems.push({
    id: 'tasks',
    content: <TasksCard />,
    size: '1x1',
  });

  bentoItems.push({
    id: 'settings',
    content: <SettingsCard />,
    size: '1x1',
  });

  if (loading) {
    return (
      <div className="bento-menu-screen">
        <div className="bento-loading">
          <div className="loading-spinner">⏳</div>
          <p>Загрузка меню...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bento-menu-screen">
        <div className="bento-error">
          <p>Ошибка: {error}</p>
          <button onClick={() => window.location.reload()}>Обновить</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bento-menu-screen">
      <div className="bento-container">
        <h1 className="bento-title">Главное меню</h1>
        <BentoGrid items={bentoItems} />
      </div>
    </div>
  );
}
