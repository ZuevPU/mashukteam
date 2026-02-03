import React, { useState, useEffect } from 'react';
import { Assignment, CreateAssignmentRequest, Direction, User, AssignmentFormat, RandomizerMode } from '../../types';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import { UserSelector } from './UserSelector';
import { buildApiEndpoint } from '../../utils/apiUrl';
import './AdminScreens.css';

type PublishMode = 'draft' | 'now' | 'scheduled';

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
  const [directions, setDirections] = useState<Direction[]>([]);
  const [sendNotification, setSendNotification] = useState(true);
  const [publishMode, setPublishMode] = useState<PublishMode>(
    editingAssignment?.scheduled_at ? 'scheduled' : 
    editingAssignment?.status === 'published' ? 'now' : 'draft'
  );
  const [scheduledAt, setScheduledAt] = useState(editingAssignment?.scheduled_at || '');
  
  const [formData, setFormData] = useState<CreateAssignmentRequest>({
    title: editingAssignment?.title || '',
    description: editingAssignment?.description || '',
    answer_format: editingAssignment?.answer_format || 'text',
    reward: editingAssignment?.reward || 10,
    target_type: editingAssignment?.target_type || 'all',
    target_values: editingAssignment?.target_values || [],
    // Поля для random_number
    randomizer_mode: editingAssignment?.randomizer_mode || 'tables',
    tables_count: editingAssignment?.tables_count || 20,
    participants_per_table: editingAssignment?.participants_per_table || 4,
    number_min: editingAssignment?.number_min || 1,
    number_max: editingAssignment?.number_max || 100,
  });

  useEffect(() => {
    adminApi.getDirections().then(setDirections).catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericFields = ['reward', 'tables_count', 'participants_per_table', 'number_min', 'number_max'];
    setFormData((prev: CreateAssignmentRequest) => ({ 
      ...prev, 
      [name]: numericFields.includes(name) ? Number(value) : value,
      // Reset target_values when target_type changes
      ...(name === 'target_type' ? { target_values: [] } : {})
    }));
  };

  const handleDirectionCheckbox = (slug: string) => {
    const current = formData.target_values || [];
    if (current.includes(slug)) {
      setFormData((prev: CreateAssignmentRequest) => ({ ...prev, target_values: current.filter((v: string) => v !== slug) }));
    } else {
      setFormData((prev: CreateAssignmentRequest) => ({ ...prev, target_values: [...current, slug] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initData) return;
    
    if (!formData.title) {
      showAlert('Введите название задания');
      return;
    }

    if (publishMode === 'scheduled' && !scheduledAt) {
      showAlert('Выберите дату и время публикации');
      return;
    }

    setLoading(true);
    try {
      // Определяем статус и scheduled_at на основе publishMode
      const status = publishMode === 'now' ? 'published' : 'draft';
      const scheduled_at = publishMode === 'scheduled' ? new Date(scheduledAt).toISOString() : null;
      
      // Отправляем уведомление только если публикуем сейчас
      const shouldNotify = publishMode === 'now' && sendNotification;

      if (editingAssignment) {
        const updateData = {
          ...formData,
          status,
          scheduled_at: scheduled_at || undefined,
        };
        await adminApi.updateAssignment(editingAssignment.id, updateData, initData, shouldNotify);
        showAlert(publishMode === 'scheduled' ? 'Запланировано' : 'Обновлено');
      } else {
        // Очищаем данные перед отправкой
        const cleanData: any = {
          ...formData,
          status,
          scheduled_at: scheduled_at || undefined,
        };

        // Удаляем undefined и пустые значения для полей рандомайзера, если это не random_number
        if (cleanData.answer_format !== 'random_number') {
          delete cleanData.randomizer_mode;
          delete cleanData.tables_count;
          delete cleanData.participants_per_table;
          delete cleanData.number_min;
          delete cleanData.number_max;
        }

        // Удаляем undefined значения
        Object.keys(cleanData).forEach(key => {
          if (cleanData[key] === undefined || cleanData[key] === '') {
            delete cleanData[key];
          }
        });

        // Передаем все данные включая статус и scheduled_at
        const response = await fetch(buildApiEndpoint('/admin/assignments'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            initData, 
            ...cleanData,
            sendNotification: shouldNotify 
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Ошибка создания' }));
          throw new Error(errorData.error || 'Ошибка создания');
        }
        
        showAlert(publishMode === 'scheduled' ? 'Запланировано' : 'Создано');
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
            <option value="photo_upload">📷 Загрузка фото</option>
            <option value="random_number">🎲 Случайное число</option>
          </select>
        </div>

        {formData.answer_format === 'photo_upload' && (
          <div style={{ padding: '12px', background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 8, marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>
              📷 Пользователь сможет загрузить фото (JPEG, PNG, GIF, WebP до 10MB).
              Файл будет сохранен в хранилище и доступен для просмотра в админке.
            </p>
          </div>
        )}

        {formData.answer_format === 'random_number' && (
          <>
            <div className="form-group">
              <label>Режим случайного числа</label>
              <select 
                className="form-select"
                name="randomizer_mode"
                value={formData.randomizer_mode || 'tables'}
                onChange={handleChange}
              >
                <option value="simple">🔢 Простое число (генерация в диапазоне)</option>
                <option value="tables">🪑 Распределение по столам</option>
              </select>
            </div>

            {formData.randomizer_mode === 'simple' && (
              <div className="form-group">
                <label>Диапазон чисел</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, opacity: 0.7 }}>Минимум</label>
                    <input 
                      type="number"
                      className="form-input"
                      name="number_min"
                      value={formData.number_min || 1}
                      onChange={handleChange}
                      min={1}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, opacity: 0.7 }}>Максимум</label>
                    <input 
                      type="number"
                      className="form-input"
                      name="number_max"
                      value={formData.number_max || 100}
                      onChange={handleChange}
                      min={1}
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.randomizer_mode === 'tables' && (
              <div className="form-group">
                <label>Настройки столов</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, opacity: 0.7 }}>Количество столов</label>
                    <input 
                      type="number"
                      className="form-input"
                      name="tables_count"
                      value={formData.tables_count || 20}
                      onChange={handleChange}
                      min={1}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, opacity: 0.7 }}>Участников на стол</label>
                    <input 
                      type="number"
                      className="form-input"
                      name="participants_per_table"
                      value={formData.participants_per_table || 4}
                      onChange={handleChange}
                      min={1}
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding: '12px', background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 8, marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>
                ℹ️ Пользователи смогут регистрироваться на участие. После того как регистрация будет закрыта, 
                вы сможете провести розыгрыш и опубликовать результаты. Участникам будут начислены звёздочки.
              </p>
            </div>
          </>
        )}

        <div className="form-group">
          <label>Звездочки</label>
          <input 
            type="number"
            className="form-input"
            name="reward"
            value={formData.reward}
            onChange={handleChange}
            min={0}
            placeholder="Количество звездочек за выполнение"
          />
          <small style={{fontSize: 12, opacity: 0.7, display: 'block', marginTop: 4}}>
            Количество звездочек, которые получит пользователь при одобрении задания
          </small>
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
            <option value="direction">📋 По направлению</option>
            <option value="individual">👤 Конкретным людям</option>
          </select>
        </div>

        {formData.target_type === 'direction' && (
          <div className="form-group">
            <label>Выберите направления</label>
            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
              {directions.map(d => (
                <label key={d.id} style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
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
              onChange={(ids: string[]) => setFormData((prev: CreateAssignmentRequest) => ({ ...prev, target_values: ids }))}
            />
          </div>
        )}

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
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="radio"
                name="publishMode"
                checked={publishMode === 'scheduled'}
                onChange={() => setPublishMode('scheduled')}
              />
              <span>⏰ Запланировать публикацию</span>
            </label>
          </div>
        </div>

        {publishMode === 'scheduled' && (
          <div className="form-group">
            <label>Дата и время публикации</label>
            <input
              type="datetime-local"
              className="form-input"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        )}

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
            publishMode === 'scheduled' ? '⏰ Запланировать' :
            publishMode === 'now' ? '🚀 Опубликовать' :
            '💾 Сохранить'
          )}
        </button>
      </form>
    </div>
  );
};
