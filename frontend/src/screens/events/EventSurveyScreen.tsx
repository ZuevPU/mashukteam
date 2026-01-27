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
  
  // Состояние ответов
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadDetails = async () => {
      if (!initData) return;
      try {
        const { event, questions, userAnswers } = await eventApi.getEventDetails(eventId, initData);
        setEvent(event);
        setQuestions(questions);

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

  const handleAnswerChange = (value: any) => {
    const questionId = questions[currentStep].id;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = async () => {
    const currentQ = questions[currentStep];
    const answer = answers[currentQ.id];

    if (!answer || (Array.isArray(answer) && answer.length === 0)) {
      showAlert('Пожалуйста, ответьте на вопрос');
      return;
    }

    setSubmitting(true);
    try {
      if (initData) {
        await eventApi.submitAnswer(eventId, currentQ.id, answer, initData);
      }
      
      if (currentStep < questions.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        setIsReadOnly(true); // Завершили опрос
        showAlert('Спасибо! Ваши ответы сохранены.');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      showAlert('Ошибка сохранения ответа');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!event) return <div className="error">Событие не найдено</div>;

  // === READ ONLY MODE (Список всех вопросов) ===
  if (isReadOnly) {
    return (
      <div className="survey-screen">
        <div className="header">
          <button onClick={onBack} className="back-button">← Назад</button>
          <h3>{event.title}</h3>
        </div>
        <div className="info-banner success">✅ Опрос пройден</div>
        <div className="questions-list">
          {questions.map((q, index) => (
            <div key={q.id} className="question-card read-only">
              <p className="question-text">{index + 1}. {q.text}</p>
              <div className="answer-display">
                {Array.isArray(answers[q.id]) 
                  ? answers[q.id].join(', ') 
                  : String(answers[q.id] || 'Нет ответа')}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // === WIZARD MODE (Пошагово) ===
  const q = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <div className="survey-screen wizard">
      <div className="header">
        <button onClick={onBack} className="back-button">✕ Закрыть</button>
        <div className="progress-bar">
          <div className="progress-fill" style={{width: `${progress}%`}}></div>
        </div>
      </div>

      <div className="wizard-content">
        <div className="question-card active">
          <span className="step-counter">Вопрос {currentStep + 1} из {questions.length}</span>
          <h2 className="question-title">{q.text}</h2>

          {q.type === 'text' && (
            <textarea
              className="input-text"
              maxLength={q.char_limit || 1000}
              value={answers[q.id] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Ваш ответ..."
            />
          )}

          {(q.type === 'single' || q.type === 'multiple') && q.options && (
            <div className="options-list">
              {q.options.map((opt) => (
                <label key={opt} className={`option-card ${
                  q.type === 'single' 
                    ? (answers[q.id] === opt ? 'selected' : '')
                    : ((answers[q.id] || []).includes(opt) ? 'selected' : '')
                }`}>
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
                        handleAnswerChange(opt);
                      } else {
                        const current = answers[q.id] || [];
                        if (e.target.checked) {
                          handleAnswerChange([...current, opt]);
                        } else {
                          handleAnswerChange(current.filter((v: string) => v !== opt));
                        }
                      }
                    }}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'scale' && (
            <div className="scale-options large">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                <button
                  key={val}
                  className={`scale-btn ${answers[q.id] === val ? 'active' : ''}`}
                  onClick={() => handleAnswerChange(val)}
                >
                  {val}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="wizard-footer">
        <button 
          className="submit-button" 
          onClick={handleNext} 
          disabled={submitting}
        >
          {submitting ? 'Сохранение...' : (currentStep === questions.length - 1 ? 'Завершить' : 'Далее →')}
        </button>
      </div>
    </div>
  );
};
