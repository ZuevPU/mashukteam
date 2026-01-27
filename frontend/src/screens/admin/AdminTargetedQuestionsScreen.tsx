import React, { useState } from 'react';
import { CreateTargetedQuestionRequest, QuestionType } from '../../types';
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
  
  const [question, setQuestion] = useState<CreateTargetedQuestionRequest>({
    text: '',
    type: 'text',
    options: [''],
    char_limit: 1000,
    target_audience: 'all',
    target_values: []
  });

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setQuestion(prev => ({ ...prev, type: e.target.value as QuestionType }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initData) return;

    if (!question.text) {
      showAlert('Введите текст вопроса');
      return;
    }

    setLoading(true);
    try {
      // Очистка пустых опций
      const dataToSend = {
        ...question,
        options: question.options?.filter(o => o.trim())
      };
      
      await adminApi.createTargetedQuestion(dataToSend, initData);
      
      showAlert('Вопрос создан');
      setQuestion({
        text: '',
        type: 'text',
        options: [''],
        char_limit: 1000,
        target_audience: 'all',
        target_values: []
      });
    } catch (error) {
      console.error('Error:', error);
      showAlert('Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Персональные вопросы</h3>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Текст вопроса</label>
          <input 
            className="form-input"
            value={question.text}
            onChange={(e) => setQuestion({...question, text: e.target.value})}
            placeholder="Вопрос..."
          />
        </div>

        <div className="form-group">
          <label>Тип ответа</label>
          <select className="form-select" value={question.type} onChange={handleTypeChange}>
            <option value="text">Текст</option>
            <option value="single">Один вариант</option>
            <option value="multiple">Несколько вариантов</option>
            <option value="scale">Шкала</option>
          </select>
        </div>

        <div className="form-group">
          <label>Кому задать?</label>
          <select 
            className="form-select"
            value={question.target_audience}
            onChange={(e) => setQuestion({...question, target_audience: e.target.value as any})}
          >
            <option value="all">Всем пользователям</option>
            <option value="by_type">По типу пользователя</option>
            <option value="individual">Конкретным людям</option>
          </select>
        </div>

        {question.target_audience === 'by_type' && (
          <div className="form-group">
            <label>Введите тип (Например: Тип 1)</label>
            <input 
              className="form-input"
              value={question.target_values?.[0] || ''}
              onChange={(e) => setQuestion({...question, target_values: [e.target.value]})}
            />
          </div>
        )}

        {question.target_audience === 'individual' && (
          <div className="form-group">
            <label>Выберите пользователей</label>
            <UserSelector 
              selectedUserIds={question.target_values || []}
              onChange={(ids) => setQuestion({...question, target_values: ids})}
            />
          </div>
        )}

        <button type="submit" className="save-btn" disabled={loading}>
          Создать вопрос
        </button>
      </form>
    </div>
  );
};
