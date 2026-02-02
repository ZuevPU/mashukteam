import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css';

interface AnswerWithDetails {
  id: string;
  answer_data: any;
  created_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name?: string;
    telegram_username?: string;
  };
  question?: {
    id: string;
    text: string;
    type: string;
  };
}

interface AdminQuestionAnswersScreenProps {
  onBack: () => void;
}

export const AdminQuestionAnswersScreen: React.FC<AdminQuestionAnswersScreenProps> = ({ onBack }) => {
  const { initData } = useTelegram();
  const [answers, setAnswers] = useState<AnswerWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!initData) return;
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/targeted-answers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.answers) setAnswers(data.answers);
        }
      } catch (error) {
        console.error('Error loading answers:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [initData]);

  const formatAnswer = (data: any) => {
    if (Array.isArray(data)) return data.join(', ');
    return String(data);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝';
      case 'single': return '⭕';
      case 'multiple': return '☑️';
      case 'scale': return '🔢';
      default: return '❓';
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Ответы на вопросы</h3>
      </div>

      <div className="admin-list">
        {answers.length === 0 ? (
          <p className="no-data">Пока нет ответов</p>
        ) : (
          answers.map((a) => (
            <div key={a.id} className="admin-item-card block">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8}}>
                <div>
                  <span style={{fontWeight: 600}}>
                    {a.user?.first_name} {a.user?.last_name || ''}
                  </span>
                  {a.user?.telegram_username && (
                    <span style={{fontSize: 12, opacity: 0.7, marginLeft: 8}}>
                      @{a.user.telegram_username}
                    </span>
                  )}
                </div>
                <span style={{fontSize: 11, opacity: 0.5}}>
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div style={{marginBottom: 8}}>
                <span style={{marginRight: 6}}>{getTypeIcon(a.question?.type || 'text')}</span>
                <span style={{fontSize: 14, opacity: 0.8}}>{a.question?.text}</span>
              </div>
              
              <div className="answer-box" style={{marginTop: 8}}>
                {formatAnswer(a.answer_data)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
