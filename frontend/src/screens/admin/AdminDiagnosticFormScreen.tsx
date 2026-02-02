import React, { useState } from 'react';
import { Event } from '../../types';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css';

interface AdminDiagnosticFormScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  editingDiagnostic?: Event;
}

export const AdminDiagnosticFormScreen: React.FC<AdminDiagnosticFormScreenProps> = ({ 
  onBack, onSuccess, editingDiagnostic 
}) => {
  const { initData, showAlert } = useTelegram();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: editingDiagnostic?.title || '',
    description: editingDiagnostic?.description || '',
    group_name: editingDiagnostic?.group_name || '',
    group_order: editingDiagnostic?.group_order || 0,
    event_order: editingDiagnostic?.event_order || 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initData) return;
    
    if (!formData.title) {
      showAlert('Введите название диагностики');
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...formData,
        type: 'diagnostic' as const,
        event_date: new Date().toISOString().split('T')[0], // Текущая дата
      };

      if (editingDiagnostic) {
        await adminApi.updateEvent(editingDiagnostic.id, data, initData);
        showAlert('Обновлено');
      } else {
        await adminApi.createEvent(data, initData);
        showAlert('Диагностика создана');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving diagnostic:', error);
      showAlert('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Отмена</button>
        <h3>{editingDiagnostic ? 'Редактирование' : 'Новая диагностика'}</h3>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Название диагностики *</label>
          <input 
            className="form-input"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Например: Входное тестирование"
          />
        </div>

        <div className="form-group">
          <label>Описание (необязательно)</label>
          <textarea 
            className="form-textarea"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Краткое описание диагностики..."
          />
        </div>

        <div className="form-group">
          <label>Группа диагностики</label>
          <input 
            className="form-input"
            name="group_name"
            value={formData.group_name}
            onChange={handleChange}
            placeholder="Например: День 1, Блок 1..."
          />
          <small style={{fontSize: 11, opacity: 0.7, marginTop: 4, display: 'block'}}>
            Диагностики с одинаковым названием группы будут сгруппированы вместе
          </small>
        </div>

        <div style={{display: 'flex', gap: 12}}>
          <div className="form-group" style={{flex: 1}}>
            <label>Порядок группы</label>
            <input 
              type="number"
              className="form-input"
              name="group_order"
              value={formData.group_order}
              onChange={(e) => setFormData({...formData, group_order: parseInt(e.target.value) || 0})}
              placeholder="0"
            />
          </div>

          <div className="form-group" style={{flex: 1}}>
            <label>Порядок в группе</label>
            <input 
              type="number"
              className="form-input"
              name="event_order"
              value={formData.event_order}
              onChange={(e) => setFormData({...formData, event_order: parseInt(e.target.value) || 0})}
              placeholder="0"
            />
          </div>
        </div>

        <p style={{fontSize: 13, opacity: 0.7, marginBottom: 16}}>
          После создания добавьте вопросы через кнопку "❓" в списке
        </p>

        <button type="submit" className="save-btn" disabled={loading}>
          {loading ? 'Сохранение...' : (editingDiagnostic ? 'Обновить' : 'Создать')}
        </button>
      </form>
    </div>
  );
};
