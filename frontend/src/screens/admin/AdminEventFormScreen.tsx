import React, { useState } from 'react';
import { Event } from '../../types';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css';

interface AdminEventFormScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  editingEvent?: Event;
}

type PublishMode = 'draft' | 'now' | 'scheduled';

export const AdminEventFormScreen: React.FC<AdminEventFormScreenProps> = ({ 
  onBack, onSuccess, editingEvent 
}) => {
  const { initData, showAlert } = useTelegram();
  const [loading, setLoading] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [publishMode, setPublishMode] = useState<PublishMode>(
    editingEvent?.status === 'published' ? 'now' : 'draft'
  );
  
  const [formData, setFormData] = useState({
    title: editingEvent?.title || '',
    speaker: editingEvent?.speaker || '',
    description: editingEvent?.description || '',
    audience: editingEvent?.audience || '',
    event_date: editingEvent?.event_date || '',
    start_time: editingEvent?.start_time || '',
    end_time: editingEvent?.end_time || '',
    location: editingEvent?.location || '',
    group_name: editingEvent?.group_name || '',
    group_order: editingEvent?.group_order || 0,
    event_order: editingEvent?.event_order || 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initData) return;
    
    if (!formData.title || !formData.event_date) {
      showAlert('Заполните обязательные поля (Название и Дата)');
      return;
    }

    setLoading(true);
    try {
      // Определяем статус на основе publishMode
      const status: 'draft' | 'published' = publishMode === 'now' ? 'published' : 'draft';
      const shouldNotify = publishMode === 'now' && sendNotification;

      // Очищаем пустые строки и удаляем неиспользуемые поля
      const cleanData: any = {
        title: formData.title,
        speaker: formData.speaker || undefined,
        description: formData.description || undefined,
        audience: formData.audience || undefined,
        event_date: formData.event_date || undefined,
        start_time: formData.start_time || undefined,
        end_time: formData.end_time || undefined,
        location: formData.location || undefined,
        group_name: formData.group_name || undefined,
        group_order: formData.group_order || 0,
        event_order: formData.event_order || 0,
        type: 'event' as const,
        status,
        sendNotification: shouldNotify,
      };

      // Удаляем undefined значения (но не status и sendNotification!)
      Object.keys(cleanData).forEach(key => {
        if (key !== 'status' && key !== 'sendNotification' && (cleanData[key] === undefined || cleanData[key] === '')) {
          delete cleanData[key];
        }
      });

      if (editingEvent) {
        await adminApi.updateEvent(editingEvent.id, cleanData, initData);
        showAlert(publishMode === 'now' ? 'Опубликовано' : 'Обновлено');
      } else {
        await adminApi.createEvent(cleanData, initData);
        showAlert(publishMode === 'now' ? 'Программа опубликована' : 'Программа создана');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving event:', error);
      showAlert('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Отмена</button>
        <h3>{editingEvent ? 'Редактирование' : 'Новая программа'}</h3>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Название *</label>
          <input 
            className="form-input"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Например: Мастер-класс по лидерству"
          />
        </div>

        <div className="form-group">
          <label>Формат (лекция, мастер-класс и т.д.)</label>
          <input 
            className="form-input"
            name="audience"
            value={formData.audience}
            onChange={handleChange}
            placeholder="Мастер-класс, Лекция, Воркшоп..."
          />
        </div>

        <div className="form-group">
          <label>Спикер</label>
          <input 
            className="form-input"
            name="speaker"
            value={formData.speaker}
            onChange={handleChange}
            placeholder="Иван Иванов"
          />
        </div>

        <div className="form-group">
          <label>Дата *</label>
          <input 
            type="date"
            className="form-input"
            name="event_date"
            value={formData.event_date}
            onChange={handleChange}
          />
        </div>

        <div style={{display: 'flex', gap: 12}}>
          <div className="form-group" style={{flex: 1}}>
            <label>Время начала</label>
            <input 
              type="time"
              className="form-input"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
            />
          </div>

          <div className="form-group" style={{flex: 1}}>
            <label>Время окончания</label>
            <input 
              type="time"
              className="form-input"
              name="end_time"
              value={formData.end_time}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Место проведения</label>
          <input 
            className="form-input"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Например: Конференц-зал А, Аудитория 101..."
          />
        </div>

        <div className="form-group">
          <label>Описание</label>
          <textarea 
            className="form-textarea"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="О чем будет программа..."
          />
        </div>

        <div className="form-group">
          <label>Группа программы</label>
          <input 
            className="form-input"
            name="group_name"
            value={formData.group_name}
            onChange={handleChange}
            placeholder="Например: День 1, День 2, Блок 1..."
          />
          <small style={{fontSize: 11, opacity: 0.7, marginTop: 4, display: 'block'}}>
            Программы с одинаковым названием группы будут сгруппированы вместе
          </small>
        </div>

        <div style={{display: 'flex', gap: 12}}>
          <div className="form-group" style={{flex: 1}}>
            <label>Порядок группы</label>
            <input 
              type="number"
              className="form-input"
              name="group_order"
              value={formData.group_order || ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setFormData({...formData, group_order: 0});
                } else {
                  const numValue = parseInt(value, 10);
                  if (!isNaN(numValue) && numValue >= 0) {
                    setFormData({...formData, group_order: numValue});
                  }
                }
              }}
              placeholder="0"
              min="0"
            />
            <small style={{fontSize: 11, opacity: 0.7, marginTop: 4, display: 'block'}}>
              Меньше = выше в списке
            </small>
          </div>

          <div className="form-group" style={{flex: 1}}>
            <label>Порядок в группе</label>
            <input 
              type="number"
              className="form-input"
              name="event_order"
              value={formData.event_order ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setFormData({...formData, event_order: 0});
                } else {
                  const numValue = parseInt(value, 10);
                  if (!isNaN(numValue) && numValue >= 0) {
                    setFormData({...formData, event_order: numValue});
                  }
                }
              }}
              placeholder="0"
              min="0"
            />
            <small style={{fontSize: 11, opacity: 0.7, marginTop: 4, display: 'block'}}>
              Порядок внутри группы
            </small>
          </div>
        </div>

        {/* Секция публикации */}
        <div className="form-group">
          <label>Публикация</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="radio"
                name="publishMode"
                checked={publishMode === 'draft'}
                onChange={() => setPublishMode('draft')}
              />
              <span>💾 Сохранить как черновик</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="radio"
                name="publishMode"
                checked={publishMode === 'now'}
                onChange={() => setPublishMode('now')}
              />
              <span>🚀 Опубликовать сейчас</span>
            </label>
          </div>
        </div>

        {publishMode === 'now' && (
          <div className="form-group">
            <label className="checkbox-item" style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
              />
              <span>📬 Отправить уведомление пользователям</span>
            </label>
          </div>
        )}

        <button type="submit" className="save-btn" disabled={loading}>
          {loading ? 'Сохранение...' : (
            publishMode === 'now' ? '🚀 Опубликовать' : '💾 Сохранить'
          )}
        </button>
      </form>
    </div>
  );
};
