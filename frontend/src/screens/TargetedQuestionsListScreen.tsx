import React, { useEffect, useState } from 'react';
import { TargetedQuestion, TargetedAnswer } from '../types';
import { fetchApiWithAuth, fetchApi } from '../services/api';
import { useTelegram } from '../hooks/useTelegram';
import './TargetedQuestionsListScreen.css';

interface TargetedQuestionsListScreenProps {
  onBack: () => void;
  onAnswerSubmitted?: () => void; // Callback для обновления статистики после ответа
}

export const TargetedQuestionsListScreen: React.FC<TargetedQuestionsListScreenProps> = ({ onBack, onAnswerSubmitted }) => {
  const { initData, showAlert } = useTelegram();
  const [activeQuestions, setActiveQuestions] = useState<TargetedQuestion[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<TargetedQuestion[]>([]);
  const [answers, setAnswers] = useState<TargetedAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for current answer input
  const [inputValues, setInputValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!initData) return;
      try {
        const response = await fetchApiWithAuth<{ 
          success: boolean; 
          activeQuestions: TargetedQuestion[]; 
          answeredQuestions: TargetedQuestion[];
          answers: TargetedAnswer[] 
        }>('/questions/my', initData);
        
        // Рандомайзеры перенесены в раздел «Задания» — в вопросах показываем только не-рандомайзеры
        const active = (response.activeQuestions || []).filter(q => q.type !== 'randomizer');
        const answered = (response.answeredQuestions || []).filter(q => q.type !== 'randomizer');
        
        setActiveQuestions(active);
        setAnsweredQuestions(answered);
        setAnswers(response.answers || []);
      } catch (error) {
        console.error('Error loading questions:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [initData]);

  const handleSubmit = async (questionId: string) => {
    if (!initData) return;
    const value = inputValues[questionId];
    
    if (value === undefined || value === null || value === '') {
      showAlert('Введите ответ');
      return;
    }

    setSubmitting(questionId);
    try {
      const response = await fetchApi<{ success: boolean; answer: TargetedAnswer }>(
        '/questions/answer', 
        {
          method: 'POST',
          body: JSON.stringify({ initData, questionId, answerData: value })
        }
      );
      setAnswers(prev => [...prev, response.answer]);
      // Удаляем вопрос из активных и добавляем в архивные
      const answeredQuestion = activeQuestions.find(q => q.id === questionId);
      if (answeredQuestion) {
        setActiveQuestions(prev => prev.filter(q => q.id !== questionId));
        setAnsweredQuestions(prev => [...prev, answeredQuestion]);
      }
      showAlert('Ответ отправлен!');
      // Вызываем callback для обновления статистики
      if (onAnswerSubmitted) {
        onAnswerSubmitted();
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      showAlert('Ошибка отправки');
    } finally {
      setSubmitting(null);
    }
  };

  const handleInputChange = (qId: string, value: any) => {
    setInputValues(prev => ({ ...prev, [qId]: value }));
  };

  const handleMultipleChange = (qId: string, option: string, checked: boolean) => {
    const current = inputValues[qId] || [];
    let newValue: string[];
    if (checked) {
      newValue = [...current, option];
    } else {
      newValue = current.filter((v: string) => v !== option);
    }
    setInputValues(prev => ({ ...prev, [qId]: newValue }));
  };

  const formatAnswer = (answer: any) => {
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    return String(answer);
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  // Группировка активных вопросов по group_name
  const groupedActiveQuestions = activeQuestions.reduce((acc, q) => {
    const groupName = q.group_name || 'Общие вопросы';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(q);
    return acc;
  }, {} as Record<string, TargetedQuestion[]>);

  // Сортировка вопросов внутри групп по question_order
  Object.values(groupedActiveQuestions).forEach(questions => {
    questions.sort((a, b) => {
      if (a.instance_number && b.instance_number) {
        return a.instance_number - b.instance_number;
      }
      return (a.question_order ?? 0) - (b.question_order ?? 0);
    });
  });

  // Сортировка групп по group_order первого вопроса
  const sortedActiveGroups = Object.entries(groupedActiveQuestions).sort(([, a], [, b]) => {
    const orderA = a[0]?.group_order ?? 0;
    const orderB = b[0]?.group_order ?? 0;
    return orderA - orderB;
  });

  // Группировка архивных вопросов
  // Приоритет: template_name, потом group_name
  const groupedAnsweredQuestions = answeredQuestions.reduce((acc, q) => {
    // Если это экземпляр шаблона, группируем по template_name
    const groupName = q.template_name || q.group_name || 'Общие вопросы';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(q);
    return acc;
  }, {} as Record<string, TargetedQuestion[]>);

  // Сортировка внутри групп: экземпляры шаблонов по instance_number, остальные по question_order
  Object.values(groupedAnsweredQuestions).forEach(questions => {
    questions.sort((a, b) => {
      if (a.instance_number && b.instance_number) {
        return a.instance_number - b.instance_number;
      }
      return (a.question_order ?? 0) - (b.question_order ?? 0);
    });
  });

  const sortedAnsweredGroups = Object.entries(groupedAnsweredQuestions).sort(([, a], [, b]) => {
    const orderA = a[0]?.group_order ?? 0;
    const orderB = b[0]?.group_order ?? 0;
    return orderA - orderB;
  });

  // Получение названия вопроса с учётом шаблона
  const getQuestionDisplayTitle = (q: TargetedQuestion) => {
    if (q.template_name && q.instance_number) {
      return `${q.template_name} ${q.instance_number}`;
    }
    return q.text;
  };

  // Рендер карточки вопроса (рандомайзеры отображаются в разделе «Задания»)
  const renderQuestionCard = (q: TargetedQuestion) => (
      <div key={q.id} className="question-card">
        {/* Если это экземпляр шаблона, показываем название с номером */}
        {q.template_name && q.instance_number && (
          <p className="question-title" style={{fontWeight: 600, color: '#1976d2', marginBottom: 8}}>
            {q.template_name} {q.instance_number}
          </p>
        )}
        <p className="question-text">{q.text}</p>
        
        <div className="answer-form">
          {/* Текстовый ответ */}
          {q.type === 'text' && (
            <textarea
              className="input-text"
              value={inputValues[q.id] || ''}
              onChange={(e) => handleInputChange(q.id, e.target.value)}
              placeholder="Введите ваш ответ..."
              maxLength={q.char_limit || 1000}
            />
          )}

          {/* Один вариант (radio) */}
          {q.type === 'single' && q.options && (
            <div className="options-list">
              {q.options.map((opt: string, idx: number) => (
                <label key={idx} className={`option-item ${inputValues[q.id] === opt ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    value={opt}
                    checked={inputValues[q.id] === opt}
                    onChange={() => handleInputChange(q.id, opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}

          {/* Несколько вариантов (checkbox) */}
          {q.type === 'multiple' && q.options && (
            <div className="options-list">
              {q.options.map((opt: string, idx: number) => (
                <label key={idx} className={`option-item ${(inputValues[q.id] || []).includes(opt) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={(inputValues[q.id] || []).includes(opt)}
                    onChange={(e) => handleMultipleChange(q.id, opt, e.target.checked)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}

          {/* Шкала / число */}
          {q.type === 'scale' && (
            <div className="scale-input">
              <div className="scale-buttons">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`scale-btn ${inputValues[q.id] === num ? 'active' : ''}`}
                    onClick={() => handleInputChange(q.id, num)}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <button 
            className="submit-btn" 
            onClick={() => handleSubmit(q.id)}
            disabled={submitting === q.id}
          >
            {submitting === q.id ? 'Отправка...' : 'Отправить ответ'}
          </button>
        </div>
      </div>
    );

  // Рендер архивной карточки
  const renderAnsweredCard = (q: TargetedQuestion) => {
    const answer = answers.find(a => a.question_id === q.id);
    const displayTitle = getQuestionDisplayTitle(q);
    const isTemplateInstance = q.template_name && q.instance_number;
    
    return (
      <div key={q.id} className="question-card answered">
        {/* Если это экземпляр шаблона, показываем название с номером */}
        {isTemplateInstance && (
          <p className="question-title" style={{fontWeight: 600, color: '#2e7d32', marginBottom: 8}}>
            {displayTitle}
          </p>
        )}
        <p className="question-text" style={isTemplateInstance ? {fontSize: 14, opacity: 0.8} : {}}>
          {q.text}
        </p>
        <div className="answer-display">
          <span className="check-icon">✓</span>
          <span>{formatAnswer(answer?.answer_data)}</span>
        </div>
        <p className="answer-date" style={{fontSize: 12, opacity: 0.6, marginTop: 8}}>
          {answer?.created_at ? new Date(answer.created_at).toLocaleDateString('ru-RU') : ''}
        </p>
      </div>
    );
  };

  return (
    <div className="targeted-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Вопросы</h3>
      </div>

      {/* Активные вопросы по группам */}
      {activeQuestions.length > 0 && (
        <>
          <h4 className="section-title">Активные вопросы ({activeQuestions.length})</h4>
          {sortedActiveGroups.map(([groupName, groupQuestions]) => (
            <div key={groupName} style={{marginBottom: '20px'}}>
              {sortedActiveGroups.length > 1 && (
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{fontWeight: 600}}>📁 {groupName}</span>
                  <span style={{fontSize: 12, opacity: 0.9}}>{groupQuestions.length} вопр.</span>
                </div>
              )}
              <div className="questions-list">
                {groupQuestions.map(renderQuestionCard)}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Архив ответов по группам */}
      {answeredQuestions.length > 0 && (
        <>
          <h4 className="section-title" style={{marginTop: 24}}>Мои ответы / Архив ({answeredQuestions.length})</h4>
          {sortedAnsweredGroups.map(([groupName, groupQuestions]) => {
            // Проверяем, является ли группа группой шаблонов
            const isTemplateGroup = groupQuestions.some(q => q.template_name === groupName);
            
            return (
              <div key={groupName} style={{marginBottom: '20px'}}>
                {sortedAnsweredGroups.length > 1 && (
                  <div style={{
                    background: isTemplateGroup 
                      ? 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)' 
                      : 'linear-gradient(135deg, #28a745 0%, #218838 100%)',
                    color: '#fff',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{fontWeight: 600}}>
                      {isTemplateGroup ? '🔄' : '✓'} {groupName}
                    </span>
                    <span style={{fontSize: 12, opacity: 0.9}}>{groupQuestions.length} ответ.</span>
                  </div>
                )}
                <div className="questions-list">
                  {groupQuestions.map(renderAnsweredCard)}
                </div>
              </div>
            );
          })}
        </>
      )}

      {activeQuestions.length === 0 && answeredQuestions.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <p>У вас пока нет вопросов</p>
        </div>
      )}
    </div>
  );
};
