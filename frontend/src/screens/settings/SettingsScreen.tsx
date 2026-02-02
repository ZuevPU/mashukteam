import React, { useState } from 'react';
import { User } from '../../types';
import { useTelegram } from '../../hooks/useTelegram';
import { updateProfile } from '../../services/api';
import './SettingsScreen.css';

interface SettingsScreenProps {
  user: User;
  onBack: () => void;
  onNotificationsClick: () => void;
  onThemeClick: () => void;
  onUserUpdate?: (updatedUser: User) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  onBack,
  onNotificationsClick,
  onThemeClick,
  onUserUpdate,
}) => {
  const { initData, showAlert } = useTelegram();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedUser, setEditedUser] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    middle_name: user.middle_name || '',
  });

  const handleSave = async () => {
    if (!initData) {
      showAlert('Ошибка авторизации');
      return;
    }

    if (!editedUser.first_name.trim() || !editedUser.last_name.trim()) {
      showAlert('Имя и фамилия обязательны');
      return;
    }

    setSaving(true);
    try {
      const response = await updateProfile(initData, {
        first_name: editedUser.first_name.trim(),
        last_name: editedUser.last_name.trim(),
        middle_name: editedUser.middle_name.trim() || null,
      });

      if (response.success && response.user) {
        showAlert('Профиль обновлен');
        setIsEditing(false);
        if (onUserUpdate) {
          onUserUpdate(response.user);
        }
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showAlert(error.message || 'Ошибка обновления профиля');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedUser({
      first_name: user.first_name,
      last_name: user.last_name,
      middle_name: user.middle_name || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="settings-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Настройки</h3>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4>Информация о пользователе</h4>
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                style={{
                  background: '#3E529B',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Редактировать
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={handleCancel}
                  style={{
                    background: '#999',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Отмена
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: '#3E529B',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: saving ? 'wait' : 'pointer',
                    opacity: saving ? 0.6 : 1
                  }}
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>Имя *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editedUser.first_name}
                  onChange={(e) => setEditedUser({...editedUser, first_name: e.target.value})}
                  placeholder="Имя"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>Фамилия *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editedUser.last_name}
                  onChange={(e) => setEditedUser({...editedUser, last_name: e.target.value})}
                  placeholder="Фамилия"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>Отчество</label>
                <input
                  type="text"
                  className="form-input"
                  value={editedUser.middle_name}
                  onChange={(e) => setEditedUser({...editedUser, middle_name: e.target.value})}
                  placeholder="Отчество (необязательно)"
                />
              </div>
            </>
          ) : (
            <>
              <div className="info-item">
                <span className="info-label">Имя</span>
                <span className="info-value">{user.first_name} {user.last_name} {user.middle_name || ''}</span>
              </div>
            </>
          )}

          <div className="info-item">
            <span className="info-label">Статус</span>
            <span className="info-value">{user.status === 'registered' ? 'Зарегистрирован' : 'Новый'}</span>
          </div>
          {user.direction && (
            <div className="info-item">
              <span className="info-label">Направление</span>
              <span className="info-value">{user.direction}</span>
            </div>
          )}
          <div className="info-item">
            <span className="info-label">Дата регистрации</span>
            <span className="info-value">
              {new Date(user.created_at).toLocaleDateString('ru-RU')}
            </span>
          </div>
        </div>

        <div className="settings-section">
          <h4>Настройки приложения</h4>
          <button className="settings-action-btn" onClick={onNotificationsClick}>
            <span className="settings-action-icon">🔔</span>
            <span className="settings-action-label">Уведомления</span>
            <span className="settings-action-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
