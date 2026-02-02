import React, { useState, useEffect } from 'react';
import { Assignment, CreateAssignmentRequest, UserType, User } from '../../types';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import { UserSelector } from './UserSelector';
import { buildApiEndpoint } from '../../utils/apiUrl';
import './AdminScreens.css';

interface AdminAssignmentFormScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  editingAssignment?: Assignment;
}

export const AdminAssignmentFormScreen: React.FC<AdminAssignmentFormScreenProps> = ({ 
  onBack, onSuccess, editingAssignment 
}) => {
  const { initData, showAlert } = useTelegram();
  const [loading, setLoading] = useState(false);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [sendNotification, setSendNotification] = useState(true);
  
  const [formData, setFormData] = useState<CreateAssignmentRequest>({
    title: editingAssignment?.title || '',
    description: editingAssignment?.description || '',
    answer_format: editingAssignment?.answer_format || 'text',
    reward: editingAssignment?.reward || 10,
    target_type: editingAssignment?.target_type || 'all',
    target_values: editingAssignment?.target_values || [],
  });

  useEffect(() => {
    adminApi.getUserTypes().then(setUserTypes).catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'reward' ? Number(value) : value,
      // Reset target_values when target_type changes
      ...(name === 'target_type' ? { target_values: [] } : {})
    }));
  };

  const handleTypeCheckbox = (slug: string) => {
    const current = formData.target_values || [];
    if (current.includes(slug)) {
      setFormData(prev => ({ ...prev, target_values: current.filter(v => v !== slug) }));
    } else {
      setFormData(prev => ({ ...prev, target_values: [...current, slug] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initData) return;
    
    if (!formData.title) {
      showAlert('Введите название задания');
      return;
    }

    setLoading(true);
    try {
      if (editingAssignment) {
        await adminApi.updateAssignment(editingAssignment.id, formData, initData);
        showAlert('Обновлено');
      } else {
        // Передаем sendNotification отдельно
        const response = await fetch(buildApiEndpoint('/admin/assignments'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData, ...formData, sendNotification })
        });
        if (!response.ok) throw new Error('Ошибка создания');
        showAlert('Создано');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving assignment:', error);
      showAlert('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Отмена</button>
        <h3>{editingAssignment ? 'Редактирование' : 'Новое задание'}</h3>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Название *</label>
          <input 
            className="form-input"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Например: Поделись историей успеха"
          />
        </div>

        <div className="form-group">
          <label>Описание</label>
          <textarea 
            className="form-textarea"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Подробное описание задания..."
          />
        </div>

        <div className="form-group">
          <label>Формат ответа</label>
          <select 
            className="form-select"
            name="answer_format"
            value={formData.answer_format}
            onChange={handleChange}
          >
            <option value="text">📝 Текст (открытый ответ)</option>
            <option value="number">🔢 Число</option>
            <option value="link">🔗 Ссылка</option>
          </select>
        </div>

        <div className="form-group">
          <label>Награда (баллы)</label>
          <input 
            type="number"
            className="form-input"
            name="reward"
            value={formData.reward}
            onChange={handleChange}
            min={0}
          />
        </div>

        <div className="form-group">
          <label>Кому доступно</label>
          <select 
            className="form-select"
            name="target_type"
            value={formData.target_type}
            onChange={handleChange}
          >
            <option value="all">👥 Всем пользователям</option>
            <option value="user_type">📋 По типу пользователя</option>
            <option value="individual">👤 Конкретным людям</option>
          </select>
        </div>

        {formData.target_type === 'user_type' && (
          <div className="form-group">
            <label>Выберите типы</label>
            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
              {userTypes.map(t => (
                <label key={t.id} style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
                  <input 
                    type="checkbox"
                    checked={formData.target_values?.includes(t.slug) || false}
                    onChange={() => handleTypeCheckbox(t.slug)}
                  />
                  {t.name}
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

        {!editingAssignment && (
          <div className="form-group">
            <label className="checkbox-item" style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
              />
              <span>Уведомить пользователей о новом задании</span>
            </label>
          </div>
        )}

        <button type="submit" className="save-btn" disabled={loading}>
          {loading ? 'Сохранение...' : (editingAssignment ? 'Обновить' : 'Создать')}
        </button>
      </form>
    </div>
  );
};
