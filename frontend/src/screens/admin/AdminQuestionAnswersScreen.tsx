import React, { useState, useEffect } from 'react';
import { TargetedQuestion } from '../../types';
import { useTelegram } from '../../hooks/useTelegram';
import { adminApi } from '../../services/adminApi';
import './AdminScreens.css';

interface AdminQuestionAnswersScreenProps {
  questionId: string;
  onBack: () => void;
}

interface AnswerWithUser {
  id: string;
  user_id: string;
  question_id: string;
  answer_data: any;
  created_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    telegram_username?: string;
  };
}

export const AdminQuestionAnswersScreen: React.FC<AdminQuestionAnswersScreenProps> = ({ 
  questionId, 
  onBack 
}) => {
  const { initData } = useTelegram();
  const [question, setQuestion] = useState<TargetedQuestion | null>(null);
  const [answers, setAnswers] = useState<AnswerWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnswers();
  }, [questionId, initData]);

  const loadAnswers = async () => {
    if (!initData) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await adminApi.getQuestionAnswers(questionId, initData);
      setQuestion(data.question);
      setAnswers(data.answers || []);
    } catch (err: any) {
      console.error('Error loading answers:', err);
      setError(err.message || 'Ошибка загрузки ответов');
    } finally {
      setLoading(false);
    }
  };

  const formatAnswerData = (answerData: any, questionType?: string): string => {
    if (!answerData) return '—';
    
    // Если это объект с полем value или answer
    if (typeof answerData === 'object') {
      if (answerData.value !== undefined) {
        if (Array.isArray(answerData.value)) {
          return answerData.value.join(', ');
        }
        return String(answerData.value);
      }
      if (answerData.answer !== undefined) {
        if (Array.isArray(answerData.answer)) {
          return answerData.answer.join(', ');
        }
        return String(answerData.answer);
      }
      if (answerData.selected !== undefined) {
        if (Array.isArray(answerData.selected)) {
          return answerData.selected.join(', ');
        }
        return String(answerData.selected);
      }
      // Пробуем JSON stringify для других объектов
      return JSON.stringify(answerData);
    }
    
    // Если это массив
    if (Array.isArray(answerData)) {
      return answerData.join(', ');
    }
    
    return String(answerData);
  };

  const getQuestionTypeLabel = (type?: string): string => {
    switch (type) {
      case 'text': return '📝 Текстовый ответ';
      case 'single': return '⭕ Один вариант';
      case 'multiple': return '☑️ Несколько вариантов';
      case 'scale': return '🔢 Числовая шкала';
      default: return type || '';
    }
  };

  if (loading) {
    return (
      <div className="admin-screen">
        <div className="header">
          <button onClick={onBack} className="back-button">← Назад</button>
          <h3>Загрузка...</h3>
        </div>
        <div className="loading">Загрузка ответов...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-screen">
        <div className="header">
          <button onClick={onBack} className="back-button">← Назад</button>
          <h3>Ошибка</h3>
        </div>
        <div className="admin-list">
          <p className="error" style={{color: '#e53935', padding: '20px', textAlign: 'center'}}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Ответы на вопрос</h3>
      </div>

      <div className="admin-list">
        {/* Информация о вопросе */}
        {question && (
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap'}}>
              <span style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                {getQuestionTypeLabel(question.type)}
              </span>
              {question.reflection_points && (
                <span style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  ⭐ {question.reflection_points} балл(ов)
                </span>
              )}
            </div>
            <p style={{fontSize: '15px', fontWeight: 500, marginBottom: '8px'}}>
              {question.template_name && question.instance_number 
                ? `${question.template_name} ${question.instance_number}` 
                : question.text}
            </p>
            {question.template_name && question.instance_number && (
              <p style={{fontSize: '13px', opacity: 0.9, fontStyle: 'italic'}}>
                {question.text}
              </p>
            )}
            {question.options && question.options.length > 0 && (
              <p style={{fontSize: '12px', opacity: 0.8, marginTop: '8px'}}>
                Варианты: {question.options.join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Статистика */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            flex: 1,
            background: '#e8f5e9',
            padding: '16px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{fontSize: '28px', fontWeight: 700, color: '#2e7d32'}}>
              {answers.length}
            </div>
            <div style={{fontSize: '12px', color: '#666'}}>
              Всего ответов
            </div>
          </div>
        </div>

        {/* Список ответов */}
        {answers.length === 0 ? (
          <p className="no-data">Пока нет ответов на этот вопрос</p>
        ) : (
          <div>
            <h4 style={{marginBottom: '12px', color: '#333'}}>Ответы пользователей</h4>
            {answers.map((answer) => (
              <div key={answer.id} className="admin-item-card">
                <div className="item-info" style={{flex: 1}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                    <span style={{
                      background: '#e3f2fd',
                      color: '#1976d2',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500
                    }}>
                      👤 {answer.user?.first_name || ''} {answer.user?.last_name || ''}
                    </span>
                    {answer.user?.telegram_username && (
                      <span style={{fontSize: '12px', color: '#666'}}>
                        @{answer.user.telegram_username}
                      </span>
                    )}
                  </div>
                  
                  <div style={{
                    background: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <p style={{fontSize: '14px', color: '#333', margin: 0, whiteSpace: 'pre-wrap'}}>
                      {formatAnswerData(answer.answer_data, question?.type)}
                    </p>
                  </div>
                  
                  <p style={{fontSize: '11px', color: '#999', margin: 0}}>
                    {new Date(answer.created_at).toLocaleString('ru-RU')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
