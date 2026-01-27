import React, { useState, useEffect } from 'react';
import { CreateTargetedQuestionRequest, QuestionType, TargetedQuestion, UserType } from '../../types';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import { UserSelector } from './UserSelector';
import './AdminScreens.css';

interface AdminTargetedQuestionsScreenProps {
  onBack: () => void;
}

export const AdminTargetedQuestionsScreen: React.FC<AdminTargetedQuestionsScreenProps> = ({ onBack }) => {
  const { initData, showAlert } = useTelegram();
  const [loading, setLoading] = useState(false);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [existingQuestions, setExistingQuestions] = useState<TargetedQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  
  const [question, setQuestion] = useState<CreateTargetedQuestionRequest>({
    text: '',
    type: 'text',
    options: ['', ''],
    char_limit: 1000,
    target_audience: 'all',
    target_values: []
  });

  // Загрузка типов пользователей и существующих вопросов
  useEffect(() => {
    const load = async () => {
      try {
        const types = await adminApi.getUserTypes();
        setUserTypes(types);
        
        // Загрузка существующих вопросов (через общий API)
        if (initData) {
          const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/targeted-questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData })
          });
          if (response.ok) {
            const data = await response.json();
            if (data.questions) setExistingQuestions(data.questions);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingQuestions(false);
      }
    };
    load();
  }, [initData]);

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

    // Валидация: сначала аудитория
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
        status: 'published' // Сразу публикуем
      };
      
      await adminApi.createTargetedQuestion(dataToSend, initData);
      
      showAlert('Вопрос создан и отправлен!');
      setQuestion({
        text: '',
        type: 'text',
        options: ['', ''],
        char_limit: 1000,
        target_audience: 'all',
        target_values: []
      });
      
      // Обновляем список
      setLoadingQuestions(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/targeted-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.questions) setExistingQuestions(data.questions);
      }
      setLoadingQuestions(false);
    } catch (error) {
      console.error('Error:', error);
      showAlert('Ошибка создания');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return '📝 Текст';
      case 'single': return '⭕ Один вариант';
      case 'multiple': return '☑️ Несколько';
      case 'scale': return '🔢 Число';
      default: return type;
    }
  };

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case 'all': return 'Всем';
      case 'by_type': return 'По типу';
      case 'individual': return 'Персонально';
      default: return audience;
    }
  };

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Персональные вопросы</h3>
      </div>

      {/* Существующие вопросы */}
      {!loadingQuestions && existingQuestions.length > 0 && (
        <div style={{marginBottom: 24}}>
          <h4 style={{marginBottom: 12}}>Созданные вопросы ({existingQuestions.length})</h4>
          <div className="admin-list">
            {existingQuestions.map((q) => (
              <div key={q.id} className="admin-item-card block">
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                  <span className="status-badge draft">{getTypeLabel(q.type)}</span>
                  <span style={{fontSize: 12, opacity: 0.7}}>{getAudienceLabel(q.target_audience)}</span>
                </div>
                <p style={{fontWeight: 500}}>{q.text}</p>
                {q.options && q.options.length > 0 && (
                  <p style={{fontSize: 12, opacity: 0.7, marginTop: 4}}>
                    Варианты: {q.options.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <h4 style={{marginBottom: 12}}>Создать новый вопрос</h4>
      <form className="admin-form" onSubmit={handleSubmit}>
        
        {/* 1. КОМУ ЗАДАТЬ (первое поле) */}
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

        {/* 3. ВАРИАНТЫ ОТВЕТОВ (если выбрано single или multiple) */}
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

        <button type="submit" className="save-btn" disabled={loading}>
          {loading ? 'Создание...' : '✓ Создать и отправить'}
        </button>
      </form>
    </div>
  );
};
