import React, { useState, useEffect } from 'react';
import { Broadcast, CreateBroadcastRequest, Direction, BroadcastTargetType } from '../../types';
import { broadcastApi } from '../../services/broadcastApi';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import { UserSelector } from './UserSelector';
import './AdminScreens.css';

type ViewMode = 'list' | 'form';
type PublishMode = 'now' | 'scheduled';

interface AdminBroadcastScreenProps {
  onBack: () => void;
}

export const AdminBroadcastScreen: React.FC<AdminBroadcastScreenProps> = ({ onBack }) => {
  const { initData, showAlert } = useTelegram();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [directions, setDirections] = useState<Direction[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<CreateBroadcastRequest>({
    title: '',
    message: '',
    image_url: '',
    target_type: 'all',
    target_values: [],
  });
  const [publishMode, setPublishMode] = useState<PublishMode>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [initData]);

  const loadData = async () => {
    if (!initData) return;
    setLoading(true);
    try {
      const [broadcastsData, directionsData] = await Promise.all([
        broadcastApi.getAllBroadcasts(initData),
        adminApi.getDirections(),
      ]);
      setBroadcasts(broadcastsData);
      setDirections(directionsData);
    } catch (error) {
      console.error('Error loading broadcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendBroadcast = async (broadcast: Broadcast) => {
    if (!initData) return;
    
    const confirmed = window.confirm(
      `Отправить рассылку "${broadcast.title}"?\n\nПолучатели: ${getTargetLabel(broadcast.target_type)}`
    );
    if (!confirmed) return;

    setSending(broadcast.id);
    try {
      const result = await broadcastApi.sendBroadcast(broadcast.id, initData);
      showAlert(`Отправлено: ${result.sent}\nНе доставлено: ${result.failed}`);
      loadData();
    } catch (error) {
      console.error('Error sending broadcast:', error);
      showAlert('Ошибка отправки рассылки');
    } finally {
      setSending(null);
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    if (!initData) return;
    
    const confirmed = window.confirm('Удалить рассылку?');
    if (!confirmed) return;

    try {
      await broadcastApi.deleteBroadcast(id, initData);
      loadData();
    } catch (error) {
      console.error('Error deleting broadcast:', error);
      showAlert('Ошибка удаления');
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'target_type' ? { target_values: [] } : {}),
    }));
  };

  const handleDirectionCheckbox = (slug: string) => {
    const current = formData.target_values || [];
    if (current.includes(slug)) {
      setFormData(prev => ({ ...prev, target_values: current.filter(v => v !== slug) }));
    } else {
      setFormData(prev => ({ ...prev, target_values: [...current, slug] }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initData) return;

    if (!formData.title || !formData.message) {
      showAlert('Заполните название и текст сообщения');
      return;
    }

    if (publishMode === 'scheduled' && !scheduledAt) {
      showAlert('Выберите дату и время отправки');
      return;
    }

    setFormLoading(true);
    try {
      const data: CreateBroadcastRequest = {
        ...formData,
        scheduled_at: publishMode === 'scheduled' ? new Date(scheduledAt).toISOString() : undefined,
      };

      const broadcast = await broadcastApi.createBroadcast(data, initData);

      // Если режим "сейчас", сразу отправляем
      if (publishMode === 'now') {
        const result = await broadcastApi.sendBroadcast(broadcast.id, initData);
        showAlert(`Рассылка отправлена!\n\nДоставлено: ${result.sent}\nНе доставлено: ${result.failed}`);
      } else {
        showAlert('Рассылка запланирована');
      }

      // Сброс формы
      setFormData({
        title: '',
        message: '',
        image_url: '',
        target_type: 'all',
        target_values: [],
      });
      setScheduledAt('');
      setViewMode('list');
      loadData();
    } catch (error) {
      console.error('Error creating broadcast:', error);
      showAlert('Ошибка создания рассылки');
    } finally {
      setFormLoading(false);
    }
  };

  const getTargetLabel = (targetType: BroadcastTargetType) => {
    switch (targetType) {
      case 'all': return 'Все пользователи';
      case 'by_direction': return 'По направлению';
      case 'individual': return 'Выбранные пользователи';
      default: return targetType;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return '📝 Черновик';
      case 'sent': return '✅ Отправлено';
      case 'scheduled': return '⏰ Запланировано';
      default: return status;
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={viewMode === 'form' ? () => setViewMode('list') : onBack} className="back-button">
          ← {viewMode === 'form' ? 'К списку' : 'Назад'}
        </button>
        <h3>{viewMode === 'form' ? 'Новая рассылка' : 'Рассылки'}</h3>
      </div>

      {viewMode === 'list' ? (
        <>
          <button 
            className="add-btn" 
            onClick={() => setViewMode('form')}
            style={{ marginBottom: 16 }}
          >
            + Создать рассылку
          </button>

          {broadcasts.length === 0 ? (
            <div className="empty-state">
              <p>Рассылок пока нет</p>
            </div>
          ) : (
            <div className="broadcasts-list">
              {broadcasts.map(broadcast => (
                <div key={broadcast.id} className="broadcast-card" style={{
                  background: 'var(--tg-theme-bg-color)',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  border: '1px solid var(--tg-theme-hint-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0' }}>{broadcast.title}</h4>
                      <p style={{ margin: '0 0 8px 0', fontSize: 13, opacity: 0.8 }}>
                        {broadcast.message.substring(0, 100)}{broadcast.message.length > 100 ? '...' : ''}
                      </p>
                      <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                        {getStatusLabel(broadcast.status)} | {getTargetLabel(broadcast.target_type)}
                        {broadcast.sent_at && (
                          <span> | Отправлено: {new Date(broadcast.sent_at).toLocaleString('ru-RU')}</span>
                        )}
                        {broadcast.scheduled_at && broadcast.status === 'scheduled' && (
                          <span> | Запланировано: {new Date(broadcast.scheduled_at).toLocaleString('ru-RU')}</span>
                        )}
                      </div>
                      {broadcast.status === 'sent' && (
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          ✅ {broadcast.sent_count} | ❌ {broadcast.failed_count}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {broadcast.status !== 'sent' && (
                        <button
                          onClick={() => handleSendBroadcast(broadcast)}
                          disabled={sending === broadcast.id}
                          style={{
                            padding: '8px 12px',
                            background: 'var(--tg-theme-button-color)',
                            color: 'var(--tg-theme-button-text-color)',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                          }}
                        >
                          {sending === broadcast.id ? '...' : '📤'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteBroadcast(broadcast.id)}
                        style={{
                          padding: '8px 12px',
                          background: '#ff4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <form className="admin-form" onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label>Заголовок *</label>
            <input
              className="form-input"
              name="title"
              value={formData.title}
              onChange={handleFormChange}
              placeholder="Например: Важное объявление"
            />
          </div>

          <div className="form-group">
            <label>Текст сообщения *</label>
            <textarea
              className="form-textarea"
              name="message"
              value={formData.message}
              onChange={handleFormChange}
              placeholder="Текст рассылки..."
              style={{ minHeight: 120 }}
            />
          </div>

          <div className="form-group">
            <label>URL изображения (необязательно)</label>
            <input
              className="form-input"
              name="image_url"
              value={formData.image_url}
              onChange={handleFormChange}
              placeholder="https://example.com/image.jpg"
            />
            <small style={{ fontSize: 11, opacity: 0.7, display: 'block', marginTop: 4 }}>
              Ссылка на изображение (должна быть публичной)
            </small>
          </div>

          <div className="form-group">
            <label>Получатели</label>
            <select
              className="form-select"
              name="target_type"
              value={formData.target_type}
              onChange={handleFormChange}
            >
              <option value="all">👥 Все пользователи</option>
              <option value="by_direction">📋 По направлению</option>
              <option value="individual">👤 Конкретные пользователи</option>
            </select>
          </div>

          {formData.target_type === 'by_direction' && (
            <div className="form-group">
              <label>Выберите направления</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {directions.map(d => (
                  <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.target_values?.includes(d.slug) || false}
                      onChange={() => handleDirectionCheckbox(d.slug)}
                    />
                    {d.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {formData.target_type === 'individual' && (
            <div className="form-group">
              <label>Выберите пользователей</label>
              <UserSelector
                selectedUserIds={formData.target_values || []}
                onChange={(ids) => setFormData(prev => ({ ...prev, target_values: ids }))}
              />
            </div>
          )}

          <div className="form-group">
            <label>Когда отправить</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="publishMode"
                  checked={publishMode === 'now'}
                  onChange={() => setPublishMode('now')}
                />
                <span>📤 Отправить сейчас</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="publishMode"
                  checked={publishMode === 'scheduled'}
                  onChange={() => setPublishMode('scheduled')}
                />
                <span>⏰ Запланировать отправку</span>
              </label>
            </div>
          </div>

          {publishMode === 'scheduled' && (
            <div className="form-group">
              <label>Дата и время отправки</label>
              <input
                type="datetime-local"
                className="form-input"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          )}

          <button type="submit" className="save-btn" disabled={formLoading}>
            {formLoading ? 'Отправка...' : (publishMode === 'now' ? '📤 Отправить сейчас' : '⏰ Запланировать')}
          </button>
        </form>
      )}
    </div>
  );
};
