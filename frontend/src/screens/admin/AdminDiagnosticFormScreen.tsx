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

type PublishMode = 'draft' | 'now' | 'scheduled';

export const AdminDiagnosticFormScreen: React.FC<AdminDiagnosticFormScreenProps> = ({ 
  onBack, onSuccess, editingDiagnostic 
}) => {
  const { initData, showAlert } = useTelegram();
  const [loading, setLoading] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [publishMode, setPublishMode] = useState<PublishMode>(
    editingDiagnostic?.status === 'published' ? 'now' : 'draft'
  );
  
  const [formData, setFormData] = useState({
    title: editingDiagnostic?.title || '',
    description: editingDiagnostic?.description || '',
    admin_comment: editingDiagnostic?.admin_comment || '',
    footer_text: editingDiagnostic?.footer_text || '',
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
      // Определяем статус на основе publishMode
      const status: 'draft' | 'published' = publishMode === 'now' ? 'published' : 'draft';
      const shouldNotify = publishMode === 'now' && sendNotification;

      // Очищаем пустые строки перед отправкой
      const cleanFormData: any = { ...formData };
      Object.keys(cleanFormData).forEach(key => {
        if (cleanFormData[key] === '' || cleanFormData[key] === undefined) {
          delete cleanFormData[key];
        }
      });

      const data = {
        ...cleanFormData,
        type: 'diagnostic' as const,
        event_date: new Date().toISOString().split('T')[0],
        status,
        sendNotification: shouldNotify,
      };

      if (editingDiagnostic) {
        await adminApi.updateEvent(editingDiagnostic.id, data, initData);
        showAlert(publishMode === 'now' ? 'Опубликовано' : 'Обновлено');
      } else {
        await adminApi.createEvent(data, initData);
        showAlert(publishMode === 'now' ? 'Диагностика опубликована' : 'Диагностика создана');
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
          <label>Комментарий администратора (необязательно)</label>
          <textarea 
            className="form-textarea"
            name="admin_comment"
            value={formData.admin_comment}
            onChange={handleChange}
            placeholder="Комментарий будет отображаться курсивом после описания..."
            style={{ fontStyle: 'italic' }}
          />
          <small style={{fontSize: 11, opacity: 0.7, marginTop: 4, display: 'block'}}>
            Этот текст будет показан участникам курсивом сразу после описания
          </small>
        </div>

        <div className="form-group">
          <label>Текст в конце диагностики (необязательно)</label>
          <textarea 
            className="form-textarea"
            name="footer_text"
            value={formData.footer_text}
            onChange={handleChange}
            placeholder="Этот текст будет отображаться в конце, после всех вопросов..."
          />
          <small style={{fontSize: 11, opacity: 0.7, marginTop: 4, display: 'block'}}>
            Отображается участникам после всех вопросов диагностики
          </small>
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
              value={formData.group_order ?? ''}
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
          </div>
        </div>

        <p style={{fontSize: 13, opacity: 0.7, marginBottom: 16}}>
          После создания добавьте вопросы через кнопку "❓" в списке
        </p>

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
