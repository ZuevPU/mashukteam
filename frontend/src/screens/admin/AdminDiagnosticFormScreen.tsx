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
