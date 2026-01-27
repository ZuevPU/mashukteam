import React, { useEffect, useState } from 'react';
import { TargetedQuestion, TargetedAnswer } from '../../types';
import { fetchApiWithAuth, fetchApi } from '../../services/api';
import { useTelegram } from '../../hooks/useTelegram';
import './TargetedQuestionsListScreen.css';

interface TargetedQuestionsListScreenProps {
  onBack: () => void;
}

export const TargetedQuestionsListScreen: React.FC<TargetedQuestionsListScreenProps> = ({ onBack }) => {
  const { initData, showAlert } = useTelegram();
  const [questions, setQuestions] = useState<TargetedQuestion[]>([]);
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
          questions: TargetedQuestion[]; 
          answers: TargetedAnswer[] 
        }>('/questions/my', initData);
        
        setQuestions(response.questions);
        setAnswers(response.answers);
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
    
    if (!value) {
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
      showAlert('Ответ отправлен');
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

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="targeted-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Мои вопросы</h3>
      </div>

      <div className="questions-list">
        {questions.length === 0 ? (
          <p className="no-data">У вас пока нет персональных вопросов</p>
        ) : (
          questions.map((q) => {
            const existingAnswer = answers.find(a => a.question_id === q.id);
            
            return (
              <div key={q.id} className={`question-card ${existingAnswer ? 'answered' : ''}`}>
                <p className="question-text">{q.text}</p>
                
                {existingAnswer ? (
                  <div className="answer-display">
                    ✅ {String(existingAnswer.answer_data)}
                  </div>
                ) : (
                  <div className="answer-form">
                    {q.type === 'text' && (
                      <textarea
                        className="input-text"
                        value={inputValues[q.id] || ''}
                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                        placeholder="Ваш ответ..."
                      />
                    )}
                    {/* Добавить поддержку других типов инпутов по аналогии с EventSurveyScreen */}
                    
                    <button 
                      className="submit-btn-small" 
                      onClick={() => handleSubmit(q.id)}
                      disabled={submitting === q.id}
                    >
                      {submitting === q.id ? '...' : 'Отправить'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
