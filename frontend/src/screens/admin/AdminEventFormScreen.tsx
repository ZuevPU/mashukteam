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

export const AdminEventFormScreen: React.FC<AdminEventFormScreenProps> = ({ 
  onBack, onSuccess, editingEvent 
}) => {
  const { initData, showAlert } = useTelegram();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: editingEvent?.title || '',
    speaker: editingEvent?.speaker || '',
    description: editingEvent?.description || '',
    audience: editingEvent?.audience || '',
    event_date: editingEvent?.event_date || '',
    event_time: editingEvent?.event_time || '',
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
      const data = {
        ...formData,
        type: 'event' as const, // Всегда event
      };

      if (editingEvent) {
        await adminApi.updateEvent(editingEvent.id, data, initData);
        showAlert('Обновлено');
      } else {
        await adminApi.createEvent(data, initData);
        showAlert('Создано');
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

        <div className="form-group">
          <label>Время (старое поле)</label>
          <input 
            type="time"
            className="form-input"
            name="event_time"
            value={formData.event_time}
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

        <button type="submit" className="save-btn" disabled={loading}>
          {loading ? 'Сохранение...' : (editingEvent ? 'Обновить' : 'Создать')}
        </button>
      </form>
    </div>
  );
};
