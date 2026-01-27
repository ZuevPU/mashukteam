import React, { useEffect, useState } from 'react';
import { Event, Question } from '../../types';
import { eventApi } from '../../services/eventApi';
import { useTelegram } from '../../hooks/useTelegram';
import './EventSurveyScreen.css';

interface EventSurveyScreenProps {
  eventId: string;
  onBack: () => void;
}

export const EventSurveyScreen: React.FC<EventSurveyScreenProps> = ({ eventId, onBack }) => {
  const { initData, showAlert } = useTelegram();
  const [event, setEvent] = useState<Event | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Состояние ответов: questionId -> value
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    const loadDetails = async () => {
      if (!initData) return;
      try {
        const { event, questions, userAnswers } = await eventApi.getEventDetails(eventId, initData);
        setEvent(event);
        setQuestions(questions);

        // Если есть ответы пользователя, заполняем форму и блокируем её
        if (userAnswers && userAnswers.length > 0) {
          setIsReadOnly(true);
          const existingAnswers: Record<string, any> = {};
          userAnswers.forEach(ans => {
            existingAnswers[ans.question_id] = ans.answer_data;
          });
          setAnswers(existingAnswers);
        }
      } catch (error) {
        console.error('Error loading details:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [eventId, initData]);

  const handleAnswerChange = (questionId: string, value: any) => {
    if (isReadOnly) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!initData || isReadOnly) return;
    setSubmitting(true);
    try {
      // Отправляем ответы последовательно
      for (const question of questions) {
        const answer = answers[question.id];
        if (answer) {
          await eventApi.submitAnswer(eventId, question.id, answer, initData);
        }
      }
      showAlert('Ответы успешно отправлены!');
      onBack();
    } catch (error) {
      console.error('Error submitting answers:', error);
      showAlert('Ошибка при отправке ответов (или вы уже ответили)');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Загрузка опроса...</div>;
  if (!event) return <div className="error">Событие не найдено</div>;

  return (
    <div className="survey-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>{event.title}</h3>
      </div>

      {isReadOnly && (
        <div className="info-banner" style={{
          background: '#d4edda', color: '#155724', padding: '10px', 
          borderRadius: '8px', marginBottom: '16px', fontSize: '14px'
        }}>
          ✅ Вы уже прошли этот опрос. Вот ваши ответы:
        </div>
      )}

      <div className="questions-list">
        {questions.map((q, index) => (
          <div key={q.id} className="question-card" style={isReadOnly ? {opacity: 0.8} : {}}>
            <p className="question-text">{index + 1}. {q.text}</p>
            
            {q.type === 'text' && (
              <textarea
                className="input-text"
                maxLength={q.char_limit || 1000}
                value={answers[q.id] || ''}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                placeholder={isReadOnly ? "Нет ответа" : "Ваш ответ..."}
                disabled={isReadOnly}
              />
            )}

            {(q.type === 'single' || q.type === 'multiple') && q.options && (
              <div className="options-list">
                {q.options.map((opt) => (
                  <label key={opt} className="option-label">
                    <input
                      type={q.type === 'single' ? 'radio' : 'checkbox'}
                      name={q.id}
                      value={opt}
                      checked={q.type === 'single' 
                        ? answers[q.id] === opt 
                        : (answers[q.id] || []).includes(opt)
                      }
                      onChange={(e) => {
                        if (q.type === 'single') {
                          handleAnswerChange(q.id, opt);
                        } else {
                          const current = answers[q.id] || [];
                          if (e.target.checked) {
                            handleAnswerChange(q.id, [...current, opt]);
                          } else {
                            handleAnswerChange(q.id, current.filter((v: string) => v !== opt));
                          }
                        }
                      }}
                      disabled={isReadOnly}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === 'scale' && (
              <div className="scale-options">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                  <button
                    key={val}
                    className={`scale-btn ${answers[q.id] === val ? 'active' : ''}`}
                    onClick={() => handleAnswerChange(q.id, val)}
                    disabled={isReadOnly}
                  >
                    {val}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {!isReadOnly && (
        <button 
          className="submit-button" 
          onClick={handleSubmit} 
          disabled={submitting || questions.length === 0}
        >
          {submitting ? 'Отправка...' : 'Отправить ответы'}
        </button>
      )}
    </div>
  );
};
