import React, { useEffect, useState } from 'react';
import { TargetedQuestion, TargetedAnswer, RandomizerQuestion } from '../types';
import { fetchApiWithAuth, fetchApi } from '../services/api';
import { buildApiEndpoint } from '../utils/apiUrl';
import { RandomizerCard } from '../components/questions/RandomizerCard';
import { useTelegram } from '../hooks/useTelegram';
import './TargetedQuestionsListScreen.css';

interface TargetedQuestionsListScreenProps {
  onBack: () => void;
}

export const TargetedQuestionsListScreen: React.FC<TargetedQuestionsListScreenProps> = ({ onBack }) => {
  const { initData, showAlert } = useTelegram();
  const [activeQuestions, setActiveQuestions] = useState<TargetedQuestion[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<TargetedQuestion[]>([]);
  const [answers, setAnswers] = useState<TargetedAnswer[]>([]);
  const [randomizers, setRandomizers] = useState<Record<string, string>>({}); // question_id -> randomizer_id
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
        
        setActiveQuestions(response.activeQuestions || []);
        setAnsweredQuestions(response.answeredQuestions || []);
        setAnswers(response.answers || []);
        
        // Загружаем данные рандомайзеров для вопросов типа randomizer
        const allQuestions = [...(response.activeQuestions || []), ...(response.answeredQuestions || [])];
        const randomizerQuestions = allQuestions.filter(q => q.type === 'randomizer');
        const randomizerMap: Record<string, string> = {};
        
        for (const q of randomizerQuestions) {
          try {
            const response = await fetch(buildApiEndpoint(`/randomizer/by-question/${q.id}`), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData }),
            });
            
            if (response.ok) {
              const randomizerResponse = await response.json();
              if (randomizerResponse.randomizer) {
                randomizerMap[q.id] = randomizerResponse.randomizer.id;
              }
            }
          } catch (err) {
            console.error('Error loading randomizer for question:', q.id, err);
          }
        }
        
        setRandomizers(randomizerMap);
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

  const unansweredQuestions = questions.filter(q => !answers.find(a => a.question_id === q.id));
  const answeredQuestions = questions.filter(q => answers.find(a => a.question_id === q.id));

  return (
    <div className="targeted-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Мои вопросы</h3>
      </div>

      {/* Неотвеченные вопросы */}
      {unansweredQuestions.length > 0 && (
        <>
          <h4 className="section-title">Новые вопросы ({unansweredQuestions.length})</h4>
          <div className="questions-list">
            {unansweredQuestions.map((q) => {
              // Для рандомайзеров показываем специальный компонент
              if (q.type === 'randomizer' && randomizers[q.id]) {
                return (
                  <div key={q.id} className="question-card">
                    <RandomizerCard questionId={q.id} randomizerId={randomizers[q.id]} />
                  </div>
                );
              }
              
              return (
                <div key={q.id} className="question-card">
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
                        {q.options.map((opt, idx) => (
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
                        {q.options.map((opt, idx) => (
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
            })}
          </div>
        </>
      )}

      {/* Архив ответов */}
      {answeredQuestions.length > 0 && (
        <>
          <h4 className="section-title" style={{marginTop: 24}}>Мои ответы / Архив ({answeredQuestions.length})</h4>
          <div className="questions-list">
            {answeredQuestions.map((q) => {
              const answer = answers.find(a => a.question_id === q.id);
              return (
                <div key={q.id} className="question-card answered">
                  <p className="question-text">{q.text}</p>
                  <div className="answer-display">
                    <span className="check-icon">✓</span>
                    <span>{formatAnswer(answer?.answer_data)}</span>
                  </div>
                  <p className="answer-date" style={{fontSize: 12, opacity: 0.6, marginTop: 8}}>
                    {answer?.created_at ? new Date(answer.created_at).toLocaleDateString('ru-RU') : ''}
                  </p>
                </div>
              );
            })}
          </div>
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
