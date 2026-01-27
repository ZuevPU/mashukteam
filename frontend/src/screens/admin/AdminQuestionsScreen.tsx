import React, { useState } from 'react';
import { Event, CreateQuestionRequest, QuestionType } from '../../types';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css';

interface AdminQuestionsScreenProps {
  event: Event;
  onBack: () => void;
}

export const AdminQuestionsScreen: React.FC<AdminQuestionsScreenProps> = ({ event, onBack }) => {
  const { initData, showAlert } = useTelegram();
  const [loading, setLoading] = useState(false);
  
  const [question, setQuestion] = useState<CreateQuestionRequest>({
    text: '',
    type: 'text',
    options: [''],
    char_limit: 1000
  });

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setQuestion(prev => ({ ...prev, type: e.target.value as QuestionType }));
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
    const newOptions = [...(question.options || [])];
    newOptions.splice(index, 1);
    setQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initData) return;

    if (!question.text) {
      showAlert('Введите текст вопроса');
      return;
    }

    if ((question.type === 'single' || question.type === 'multiple') && 
        (!question.options || question.options.filter(o => o.trim()).length < 2)) {
      showAlert('Добавьте минимум 2 варианта ответа');
      return;
    }

    setLoading(true);
    try {
      // Очищаем пустые опции перед отправкой
      const dataToSend = {
        ...question,
        options: question.options?.filter(o => o.trim())
      };

      await adminApi.addQuestion(event.id, dataToSend, initData);
      showAlert('Вопрос добавлен!');
      // Сброс формы
      setQuestion({
        text: '',
        type: 'text',
        options: [''],
        char_limit: 1000
      });
    } catch (error) {
      console.error('Error adding question:', error);
      showAlert('Ошибка добавления');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Вопросы к "{event.title}"</h3>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Текст вопроса</label>
          <input 
            className="form-input"
            value={question.text}
            onChange={(e) => setQuestion({...question, text: e.target.value})}
            placeholder="Как вам мероприятие?"
          />
        </div>

        <div className="form-group">
          <label>Тип ответа</label>
          <select 
            className="form-select"
            value={question.type}
            onChange={handleTypeChange}
          >
            <option value="text">Текст (развернутый ответ)</option>
            <option value="single">Один вариант (Radio)</option>
            <option value="multiple">Несколько вариантов (Checkbox)</option>
            <option value="scale">Шкала (1-10)</option>
          </select>
        </div>

        {(question.type === 'single' || question.type === 'multiple') && (
          <div className="form-group">
            <label>Варианты ответов</label>
            {question.options?.map((opt, idx) => (
              <div key={idx} className="option-row">
                <input 
                  className="form-input"
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Вариант ${idx + 1}`}
                />
                <button 
                  type="button" 
                  className="remove-option"
                  onClick={() => removeOption(idx)}
                >✕</button>
              </div>
            ))}
            <button type="button" className="add-option-btn" onClick={addOption}>
              + Добавить вариант
            </button>
          </div>
        )}

        {question.type === 'text' && (
          <div className="form-group">
            <label>Лимит символов</label>
            <input 
              type="number"
              className="form-input"
              value={question.char_limit}
              onChange={(e) => setQuestion({...question, char_limit: parseInt(e.target.value)})}
            />
          </div>
        )}

        <button type="submit" className="save-btn" disabled={loading}>
          {loading ? 'Сохранение...' : 'Добавить вопрос'}
        </button>
      </form>
    </div>
  );
};
