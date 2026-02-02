import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../hooks/useTelegram';
import { userPreferencesApi } from '../../services/userPreferencesApi';
import { notificationApi } from '../../services/notificationApi';
import { UserPreferences, Notification } from '../../types';
import './NotificationsSettingsScreen.css';

interface NotificationsSettingsScreenProps {
  onBack: () => void;
}

export const NotificationsSettingsScreen: React.FC<NotificationsSettingsScreenProps> = ({ onBack }) => {
  const { initData, showAlert } = useTelegram();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    if (initData) {
      loadPreferences();
      loadNotifications();
    }
  }, [initData]);

  const loadPreferences = async () => {
    if (!initData) return;
    try {
      const prefs = await userPreferencesApi.getPreferences(initData);
      setPreferences(prefs);
    } catch (error: any) {
      console.error('Error loading preferences:', error);
      showAlert('Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    if (!initData) return;
    setLoadingNotifications(true);
    try {
      const data = await notificationApi.getMyNotifications(initData, 100);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      // Не показываем ошибку, так как это не критично
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!initData) return;
    try {
      await notificationApi.markAsRead(initData, notificationId);
      setNotifications((prev: Notification[]) => prev.map((n: Notification) => n.id === notificationId ? { ...n, read: true } : n));
      setUnreadCount((prev: number) => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!initData) return;
    try {
      await notificationApi.markAllAsRead(initData);
      setNotifications((prev: Notification[]) => prev.map((n: Notification) => ({ ...n, read: true })));
      setUnreadCount(0);
      showAlert('Все уведомления отмечены как прочитанные');
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      showAlert('Ошибка при обновлении уведомлений');
    }
  };

  const handleToggle = async (field: keyof UserPreferences, value: boolean) => {
    if (!initData || !preferences || saving) return;

    setSaving(true);
    try {
      const updated = await userPreferencesApi.updatePreferences(
        { [field]: value },
        initData
      );
      setPreferences(updated);
      showAlert('Настройки сохранены');
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      showAlert('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="notifications-settings-screen">
        <div className="header">
          <button onClick={onBack} className="back-button">← Назад</button>
          <h3>Уведомления</h3>
        </div>
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="notifications-settings-screen">
        <div className="header">
          <button onClick={onBack} className="back-button">← Назад</button>
          <h3>Уведомления</h3>
        </div>
        <div className="error">Ошибка загрузки настроек</div>
      </div>
    );
  }

  return (
    <div className="notifications-settings-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Уведомления</h3>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h4>Уведомления в приложении</h4>
          <p style={{ marginBottom: '16px', fontSize: '14px', opacity: 0.7 }}>
            Здесь вы можете настроить, какие уведомления будут приходить вам в Telegram бот.
          </p>
          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">Все уведомления</span>
              <span className="toggle-description">Включить/выключить все уведомления</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.notifications_enabled}
                onChange={(e) => handleToggle('notifications_enabled', e.target.checked)}
                disabled={saving}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h4>Типы уведомлений</h4>
          <p style={{ marginBottom: '16px', fontSize: '13px', opacity: 0.7 }}>
            Выберите, о каких событиях вы хотите получать уведомления:
          </p>
          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">Мероприятия</span>
              <span className="toggle-description">Уведомления о новых мероприятиях</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.notification_events}
                onChange={(e) => handleToggle('notification_events', e.target.checked)}
                disabled={saving || !preferences.notifications_enabled}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">Вопросы</span>
              <span className="toggle-description">Уведомления о новых вопросах</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.notification_questions}
                onChange={(e) => handleToggle('notification_questions', e.target.checked)}
                disabled={saving || !preferences.notifications_enabled}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">Задания</span>
              <span className="toggle-description">Уведомления о новых заданиях</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.notification_assignments}
                onChange={(e) => handleToggle('notification_assignments', e.target.checked)}
                disabled={saving || !preferences.notifications_enabled}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">Диагностика</span>
              <span className="toggle-description">Уведомления о новых диагностиках</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.notification_diagnostics}
                onChange={(e) => handleToggle('notification_diagnostics', e.target.checked)}
                disabled={saving || !preferences.notifications_enabled}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h4>История уведомлений</h4>
          {loadingNotifications ? (
            <div className="loading" style={{ padding: '20px', textAlign: 'center' }}>Загрузка...</div>
          ) : notifications.length === 0 ? (
            <p style={{ fontSize: '14px', opacity: 0.7, textAlign: 'center', padding: '20px' }}>
              У вас пока нет уведомлений
            </p>
          ) : (
            <>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginBottom: '12px',
                    background: '#3E529B',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Отметить все как прочитанные ({unreadCount})
                </button>
              )}
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {notifications.map((notif: Notification) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.read) {
                        handleMarkAsRead(notif.id);
                      }
                      // Если есть deep_link, можно обработать навигацию
                      if (notif.deep_link && typeof window !== 'undefined' && window.Telegram?.WebApp) {
                        const tg = window.Telegram.WebApp as any;
                        if (tg.openLink) {
                          tg.openLink(notif.deep_link);
                        } else {
                          // Fallback: открываем ссылку в новом окне
                          window.open(notif.deep_link, '_blank');
                        }
                      }
                    }}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: notif.read ? 'var(--color-bg-primary, #F8F8F7)' : '#e3f2fd',
                      border: '1px solid var(--color-border, #35A2A8)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      opacity: notif.read ? 0.7 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--color-text-primary, #2C2B2B)' }}>
                        {notif.title}
                      </strong>
                      {!notif.read && (
                        <span style={{
                          width: '8px',
                          height: '8px',
                          background: '#3E529B',
                          borderRadius: '50%',
                          flexShrink: 0,
                          marginLeft: '8px'
                        }} />
                      )}
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-primary, #2C2B2B)', margin: '4px 0', lineHeight: '1.4' }}>
                      {notif.message.replace(/<[^>]*>/g, '').substring(0, 100)}
                      {notif.message.length > 100 ? '...' : ''}
                    </p>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-primary, #2C2B2B)', opacity: 0.6, marginTop: '4px' }}>
                      {new Date(notif.created_at).toLocaleString('ru-RU')}
                    </div>
                    {notif.deep_link && (
                      <div style={{ fontSize: '11px', color: '#3E529B', marginTop: '4px', fontWeight: 500 }}>
                        Нажмите, чтобы перейти →
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="settings-section">
          <h4>Информация об уведомлениях</h4>
          <div style={{ fontSize: '13px', lineHeight: '1.6', opacity: 0.8 }}>
            <p style={{ marginBottom: '8px' }}>
              <strong>Мероприятия:</strong> Анонсы новых мероприятий с прямой ссылкой на событие
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>Вопросы:</strong> Персональные вопросы от администраторов с ссылкой на ответ
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>Задания:</strong> Новые задания и результаты проверки выполненных заданий
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>Диагностика:</strong> Анонсы новых диагностик с прямой ссылкой на прохождение
            </p>
            <p style={{ marginTop: '12px', fontSize: '12px', opacity: 0.7 }}>
              Все уведомления содержат прямую ссылку для быстрого перехода к соответствующему разделу приложения.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
