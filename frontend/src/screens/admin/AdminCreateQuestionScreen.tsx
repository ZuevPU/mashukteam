import React, { useState, useEffect } from 'react';
import { CreateTargetedQuestionRequest, QuestionType, UserType, TargetedQuestion } from '../../types';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import { UserSelector } from './UserSelector';
import './AdminScreens.css';

interface AdminCreateQuestionScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  editingQuestion?: TargetedQuestion;
}

export const AdminCreateQuestionScreen: React.FC<AdminCreateQuestionScreenProps> = ({ onBack, onSuccess, editingQuestion }) => {
  const { initData, showAlert } = useTelegram();
  const [loading, setLoading] = useState(false);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [sendNotification, setSendNotification] = useState(true);
  
  const [question, setQuestion] = useState<CreateTargetedQuestionRequest>({
    text: editingQuestion?.text || '',
    type: editingQuestion?.type || 'text',
    options: editingQuestion?.options || ['', ''],
    char_limit: editingQuestion?.char_limit || 1000,
    target_audience: editingQuestion?.target_audience || 'all',
    target_values: editingQuestion?.target_values || []
  });

  useEffect(() => {
    const load = async () => {
      try {
        const types = await adminApi.getUserTypes();
        setUserTypes(types);
      } catch (error) {
        console.error('Error loading user types:', error);
      }
    };
    load();
  }, []);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as QuestionType;
    setQuestion(prev => ({ 
      ...prev, 
      type: newType,
      options: (newType === 'single' || newType === 'multiple') ? ['', ''] : []
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(question.options || [])];
    newOptions[index] = value;
    setQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setQuestion(prev => ({ ...prev, options: [...(prev.options || []), ''] }));
  };

  const removeOption = (index: number) => {
    if ((question.options?.length || 0) <= 2) return;
    const newOptions = [...(question.options || [])];
    newOptions.splice(index, 1);
    setQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initData) return;

    if (question.target_audience === 'individual' && (!question.target_values || question.target_values.length === 0)) {
      showAlert('Выберите пользователей');
      return;
    }
    if (question.target_audience === 'by_type' && (!question.target_values || question.target_values.length === 0)) {
      showAlert('Выберите тип пользователя');
      return;
    }

    if (!question.text.trim()) {
      showAlert('Введите текст вопроса');
      return;
    }

    if ((question.type === 'single' || question.type === 'multiple')) {
      const validOptions = question.options?.filter(o => o.trim()) || [];
      if (validOptions.length < 2) {
        showAlert('Добавьте минимум 2 варианта ответа');
        return;
      }
    }

    setLoading(true);
    try {
      const dataToSend = {
        ...question,
        options: question.options?.filter(o => o.trim()),
        sendNotification
      };
      
      if (editingQuestion) {
        await adminApi.updateTargetedQuestion(editingQuestion.id, dataToSend, initData);
        showAlert('Вопрос обновлен!');
      } else {
        await adminApi.createTargetedQuestion({ ...dataToSend, status: 'published' }, initData);
        showAlert('Вопрос создан!');
      }
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      showAlert(editingQuestion ? 'Ошибка обновления' : 'Ошибка создания');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Создать вопрос</h3>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        
        {/* 1. КОМУ ЗАДАТЬ */}
        <div className="form-group">
          <label>1. Кому задать вопрос?</label>
          <select 
            className="form-select"
            value={question.target_audience}
            onChange={(e) => setQuestion({...question, target_audience: e.target.value as any, target_values: []})}
          >
            <option value="all">👥 Всем пользователям</option>
            <option value="by_type">📋 По типу пользователя</option>
            <option value="individual">👤 Конкретным людям</option>
          </select>
        </div>

        {question.target_audience === 'by_type' && (
          <div className="form-group">
            <label>Выберите типы:</label>
            <div className="checkbox-group">
              {userTypes.map(t => (
                <label key={t.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={question.target_values?.includes(t.slug) || false}
                    onChange={(e) => {
                      const vals = question.target_values || [];
                      if (e.target.checked) {
                        setQuestion({...question, target_values: [...vals, t.slug]});
                      } else {
                        setQuestion({...question, target_values: vals.filter(v => v !== t.slug)});
                      }
                    }}
                  />
                  {t.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {question.target_audience === 'individual' && (
          <div className="form-group">
            <label>Выберите пользователей:</label>
            <UserSelector 
              selectedUserIds={question.target_values || []}
              onChange={(ids) => setQuestion({...question, target_values: ids})}
            />
          </div>
        )}

        {/* 2. ТИП ОТВЕТА */}
        <div className="form-group">
          <label>2. Тип ответа</label>
          <select className="form-select" value={question.type} onChange={handleTypeChange}>
            <option value="text">📝 Открытый ответ (текст)</option>
            <option value="single">⭕ Выбрать один вариант</option>
            <option value="multiple">☑️ Выбрать несколько вариантов</option>
            <option value="scale">🔢 Ввод числа (1-10)</option>
          </select>
        </div>

        {/* 3. ВАРИАНТЫ ОТВЕТОВ */}
        {(question.type === 'single' || question.type === 'multiple') && (
          <div className="form-group">
            <label>3. Варианты ответов</label>
            {question.options?.map((opt, idx) => (
              <div key={idx} className="option-row">
                <input 
                  className="form-input"
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Вариант ${idx + 1}`}
                />
                {(question.options?.length || 0) > 2 && (
                  <button 
                    type="button" 
                    className="remove-option"
                    onClick={() => removeOption(idx)}
                  >✕</button>
                )}
              </div>
            ))}
            <button type="button" className="add-option-btn" onClick={addOption}>
              + Добавить вариант
            </button>
          </div>
        )}

        {/* 4. ТЕКСТ ВОПРОСА */}
        <div className="form-group">
          <label>{(question.type === 'single' || question.type === 'multiple') ? '4.' : '3.'} Текст вопроса</label>
          <textarea 
            className="form-textarea"
            value={question.text}
            onChange={(e) => setQuestion({...question, text: e.target.value})}
            placeholder="Введите текст вопроса..."
            rows={3}
          />
        </div>

        {/* 5. УВЕДОМЛЕНИЕ */}
        <div className="form-group">
          <label className="checkbox-item" style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
            <input
              type="checkbox"
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
            />
            <span>Отправить уведомление пользователям</span>
          </label>
        </div>

        <button type="submit" className="save-btn" disabled={loading}>
          {loading ? (editingQuestion ? 'Обновление...' : 'Создание...') : (editingQuestion ? '✓ Сохранить изменения' : '✓ Создать и отправить')}
        </button>
      </form>
    </div>
  );
};
