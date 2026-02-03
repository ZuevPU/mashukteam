import React, { useEffect, useState } from 'react';
import { Event } from '../../types';
import { eventApi } from '../../services/eventApi';
import { useTelegram } from '../../hooks/useTelegram';
import './DiagnosticSurveyScreen.css';

interface DiagnosticSurveyScreenProps {
  eventId: string;
  onBack: () => void;
}

interface Question {
  id: string;
  text: string;
  type: 'single' | 'multiple' | 'scale' | 'text';
  options?: string[];
  char_limit?: number;
  order_index?: number;
}

interface Answer {
  id: string;
  question_id: string;
  answer_data: any;
}

export const DiagnosticSurveyScreen: React.FC<DiagnosticSurveyScreenProps> = ({ eventId, onBack }) => {
  const { initData, showAlert } = useTelegram();
  const [event, setEvent] = useState<Event | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Map<string, Answer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [inputValues, setInputValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!initData) return;
      try {
        const { event, questions, userAnswers } = await eventApi.getDiagnosticQuestions(eventId, initData);
        setEvent(event);
        setQuestions(questions);
        
        // Создаем карту ответов пользователя
        const answersMap = new Map<string, Answer>();
        userAnswers.forEach((answer: Answer) => {
          answersMap.set(answer.question_id, answer);
          // Загружаем сохраненные ответы в inputValues
          setInputValues(prev => ({
            ...prev,
            [answer.question_id]: answer.answer_data
          }));
        });
        setUserAnswers(answersMap);
      } catch (error) {
        console.error('Error loading diagnostic:', error);
        showAlert('Ошибка загрузки диагностики');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [eventId, initData]);

  const handleInputChange = (questionId: string, value: any) => {
    setInputValues(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMultipleChange = (questionId: string, option: string, checked: boolean) => {
    const current = inputValues[questionId] || [];
    let newValue: string[];
    if (checked) {
      newValue = [...current, option];
    } else {
      newValue = current.filter((v: string) => v !== option);
    }
    setInputValues(prev => ({ ...prev, [questionId]: newValue }));
  };

  const handleSubmit = async (questionId: string) => {
    if (!initData) return;
    const value = inputValues[questionId];
    
    if (value === undefined || value === null || value === '') {
      showAlert('Введите ответ');
      return;
    }

    setSubmitting(questionId);
    try {
      const answer = await eventApi.submitDiagnosticAnswer(eventId, questionId, value, initData);
      setUserAnswers(prev => {
        const newMap = new Map(prev);
        newMap.set(questionId, answer as any);
        return newMap;
      });
      showAlert('Ответ сохранен!');
    } catch (error) {
      console.error('Error submitting answer:', error);
      showAlert('Ошибка отправки ответа');
    } finally {
      setSubmitting(null);
    }
  };

  const formatAnswer = (answer: any) => {
    if (Array.isArray(answer)) return answer.join(', ');
    return String(answer);
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!event) return <div className="error">Диагностика не найдена</div>;

  return (
    <div className="diagnostic-survey-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>{event.title}</h3>
      </div>

      {(event.description || event.admin_comment) && (
        <div className="event-info-card" style={{ marginBottom: '20px' }}>
          {event.description && (
            <p className="event-info-description">{event.description}</p>
          )}
          {event.admin_comment && (
            <p className="admin-comment">{event.admin_comment}</p>
          )}
        </div>
      )}

      {questions.length === 0 ? (
        <div className="no-questions">
          <p>В этой диагностике пока нет вопросов</p>
        </div>
      ) : (
        <div className="questions-list">
          {questions.map((question, index) => {
            const savedAnswer = userAnswers.get(question.id);
            const currentValue = inputValues[question.id] ?? savedAnswer?.answer_data;
            const isAnswered = !!savedAnswer;

            return (
              <div key={question.id} className="question-card">
                <div className="question-header">
                  <span className="question-number">Вопрос {index + 1}</span>
                  {isAnswered && <span className="answered-badge">✓ Отвечено</span>}
                </div>
                <h4 className="question-text">{question.text}</h4>

                {question.type === 'single' && question.options && (
                  <div className="options-list">
                    {question.options.map((option) => (
                      <label key={option} className="option-label">
                        <input
                          type="radio"
                          name={`question_${question.id}`}
                          value={option}
                          checked={currentValue === option}
                          onChange={(e) => handleInputChange(question.id, e.target.value)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'multiple' && question.options && (
                  <div className="options-list">
                    {question.options.map((option) => (
                      <label key={option} className="option-label">
                        <input
                          type="checkbox"
                          checked={(currentValue || []).includes(option)}
                          onChange={(e) => handleMultipleChange(question.id, option, e.target.checked)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'scale' && (
                  <div className="scale-input">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={currentValue || 5}
                      onChange={(e) => handleInputChange(question.id, parseInt(e.target.value))}
                    />
                    <div className="scale-labels">
                      <span>1</span>
                      <span className="scale-value">{currentValue || 5}</span>
                      <span>10</span>
                    </div>
                  </div>
                )}

                {question.type === 'text' && (
                  <textarea
                    className="form-textarea"
                    value={currentValue || ''}
                    onChange={(e) => handleInputChange(question.id, e.target.value)}
                    placeholder="Введите ваш ответ..."
                    maxLength={question.char_limit}
                    rows={4}
                  />
                )}

                <button
                  onClick={() => handleSubmit(question.id)}
                  disabled={submitting === question.id || !currentValue}
                  className="submit-btn"
                >
                  {submitting === question.id ? 'Сохранение...' : isAnswered ? 'Обновить ответ' : 'Сохранить ответ'}
                </button>

                {isAnswered && (
                  <div className="saved-answer">
                    <strong>Сохраненный ответ:</strong> {formatAnswer(savedAnswer.answer_data)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Текст в конце диагностики */}
      {event.footer_text && (
        <div className="footer-text-card">
          <p className="footer-text">{event.footer_text}</p>
        </div>
      )}
    </div>
  );
};
