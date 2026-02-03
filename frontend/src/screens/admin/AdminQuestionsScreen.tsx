import React, { useState, useEffect } from 'react';
import { Event, Question, CreateQuestionRequest, QuestionType } from '../../types';
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
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  const [question, setQuestion] = useState<CreateQuestionRequest>({
    text: '',
    type: 'text',
    options: [''],
    char_limit: 1000
  });

  // Загрузка существующих вопросов
  useEffect(() => {
    const loadQuestions = async () => {
      if (!initData) return;
      try {
        const { questions } = await adminApi.getEventAnalytics(event.id, initData);
        setQuestions(questions);
      } catch (error) {
        console.error('Error loading questions:', error);
      } finally {
        setLoadingQuestions(false);
      }
    };
    loadQuestions();
  }, [event.id, initData]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setQuestion((prev: CreateQuestionRequest) => ({ ...prev, type: e.target.value as QuestionType }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(question.options || [])];
    newOptions[index] = value;
    setQuestion((prev: CreateQuestionRequest) => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setQuestion((prev: CreateQuestionRequest) => ({ ...prev, options: [...(prev.options || []), ''] }));
  };

  const removeOption = (index: number) => {
    const newOptions = [...(question.options || [])];
    newOptions.splice(index, 1);
    setQuestion((prev: CreateQuestionRequest) => ({ ...prev, options: newOptions }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initData) return;

    if (!question.text) {
      showAlert('Введите текст вопроса');
      return;
    }

    if ((question.type === 'single' || question.type === 'multiple') && 
        (!question.options || question.options.filter((o: string) => o.trim()).length < 2)) {
      showAlert('Добавьте минимум 2 варианта ответа');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = {
        ...question,
        options: question.options?.filter((o: string) => o.trim())
      };

      if (editingQuestion) {
        // Обновление существующего вопроса
        const updatedQuestion = await adminApi.updateDiagnosticQuestion(editingQuestion.id, dataToSend, initData);
        showAlert('Вопрос обновлен!');
        setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? updatedQuestion : q));
        setEditingQuestion(null);
      } else {
        // Добавление нового вопроса
        const newQuestion = await adminApi.addQuestion(event.id, dataToSend, initData);
        showAlert('Вопрос добавлен!');
        setQuestions(prev => [...prev, newQuestion]);
      }
      
      // Сброс формы
      setQuestion({
        text: '',
        type: 'text',
        options: [''],
        char_limit: 1000
      });
    } catch (error) {
      console.error('Error saving question:', error);
      showAlert('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (q: Question) => {
    setEditingQuestion(q);
    setQuestion({
      text: q.text,
      type: q.type,
      options: q.options || [''],
      char_limit: q.char_limit || 1000
    });
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setQuestion({
      text: '',
      type: 'text',
      options: [''],
      char_limit: 1000
    });
  };

  const handleDelete = async (q: Question) => {
    if (!initData) return;
    if (!confirm(`Удалить вопрос "${q.text.substring(0, 50)}..."?`)) return;

    try {
      await adminApi.deleteDiagnosticQuestion(q.id, initData);
      showAlert('Вопрос удален');
      setQuestions(prev => prev.filter(item => item.id !== q.id));
    } catch (error) {
      console.error('Error deleting question:', error);
      showAlert('Ошибка удаления');
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return 'Текст';
      case 'single': return 'Один вариант';
      case 'multiple': return 'Несколько вариантов';
      case 'scale': return 'Шкала 1-10';
      default: return type;
    }
  };

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Вопросы</h3>
      </div>

      <p style={{marginBottom: 16, opacity: 0.7}}>{event.title}</p>

      {/* Список существующих вопросов */}
      {loadingQuestions ? (
        <p>Загрузка...</p>
      ) : questions.length > 0 ? (
        <div className="admin-list" style={{marginBottom: 24}}>
          <h4 style={{marginBottom: 12}}>Добавленные вопросы ({questions.length})</h4>
          {questions.map((q, idx) => (
            <div key={q.id} className="admin-item-card">
              <div className="item-info">
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                  <span style={{fontWeight: 600}}>#{idx + 1}</span>
                  <span className="status-badge draft">{getTypeLabel(q.type)}</span>
                </div>
                <p style={{marginBottom: 4}}>{q.text}</p>
                {q.options && q.options.length > 0 && (
                  <p style={{fontSize: 12, opacity: 0.7, marginTop: 4}}>
                    Варианты: {q.options.join(', ')}
                  </p>
                )}
              </div>
              <div className="item-actions">
                <button 
                  className="action-btn" 
                  onClick={() => handleEdit(q)}
                  title="Редактировать"
                >
                  ✏️
                </button>
                <button 
                  className="action-btn" 
                  onClick={() => handleDelete(q)}
                  title="Удалить"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Форма добавления/редактирования вопроса */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
        <h4 style={{margin: 0}}>{editingQuestion ? '✏️ Редактирование вопроса' : '➕ Добавить вопрос'}</h4>
        {editingQuestion && (
          <button 
            type="button" 
            onClick={handleCancelEdit}
            style={{
              background: 'transparent',
              border: '1px solid #ccc',
              padding: '6px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            Отмена
          </button>
        )}
      </div>
      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Текст вопроса</label>
          <textarea 
            className="form-textarea"
            value={question.text}
            onChange={(e) => setQuestion((prev: CreateQuestionRequest) => ({...prev, text: e.target.value}))}
            placeholder="Введите текст вопроса..."
            style={{minHeight: 80}}
          />
        </div>

        <div className="form-group">
          <label>Тип ответа</label>
          <select 
            className="form-select"
            value={question.type}
            onChange={handleTypeChange}
          >
            <option value="text">📝 Текст (развернутый ответ)</option>
            <option value="single">⭕ Один вариант (Radio)</option>
            <option value="multiple">☑️ Несколько вариантов (Checkbox)</option>
            <option value="scale">📊 Шкала (1-10)</option>
          </select>
        </div>

        {(question.type === 'single' || question.type === 'multiple') && (
          <div className="form-group">
            <label>Варианты ответов</label>
            {question.options?.map((opt: string, idx: number) => (
              <div key={idx} className="option-row">
                <input 
                  className="form-input"
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Вариант ${idx + 1}`}
                />
                {(question.options?.length || 0) > 1 && (
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

        {question.type === 'text' && (
          <div className="form-group">
            <label>Лимит символов</label>
            <input 
              type="number"
              className="form-input"
              value={question.char_limit}
              onChange={(e) => setQuestion((prev: CreateQuestionRequest) => ({...prev, char_limit: parseInt(e.target.value) || 1000}))}
            />
          </div>
        )}

        <button type="submit" className="save-btn" disabled={loading}>
          {loading ? 'Сохранение...' : (editingQuestion ? '✓ Сохранить изменения' : '+ Добавить вопрос')}
        </button>
      </form>
    </div>
  );
};
