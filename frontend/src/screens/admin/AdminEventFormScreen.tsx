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
        <h3>{editingEvent ? 'Редактирование' : 'Новое мероприятие'}</h3>
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
          <label>Время</label>
          <input 
            type="time"
            className="form-input"
            name="event_time"
            value={formData.event_time}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Описание</label>
          <textarea 
            className="form-textarea"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="О чем будет мероприятие..."
          />
        </div>

        <button type="submit" className="save-btn" disabled={loading}>
          {loading ? 'Сохранение...' : (editingEvent ? 'Обновить' : 'Создать')}
        </button>
      </form>
    </div>
  );
};
