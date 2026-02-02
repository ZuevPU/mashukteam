import React, { useState, useEffect } from 'react';
import { TargetedQuestion } from '../../types';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css';

interface AdminQuestionsListScreenProps {
  onBack: () => void;
}

export const AdminQuestionsListScreen: React.FC<AdminQuestionsListScreenProps> = ({ onBack }) => {
  const { initData } = useTelegram();
  const [questions, setQuestions] = useState<TargetedQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!initData) return;
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/targeted-questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.questions) setQuestions(data.questions);
        }
      } catch (error) {
        console.error('Error loading questions:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [initData]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return '📝 Текст';
      case 'single': return '⭕ Один вариант';
      case 'multiple': return '☑️ Несколько';
      case 'scale': return '🔢 Число';
      default: return type;
    }
  };

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case 'all': return '👥 Всем';
      case 'by_type': return '📋 По типу';
      case 'individual': return '👤 Персонально';
      default: return audience;
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Список вопросов</h3>
      </div>

      <div className="admin-list">
        {questions.length === 0 ? (
          <p className="no-data">Нет созданных вопросов</p>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="admin-item-card block">
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                <span className="status-badge draft">{getTypeLabel(q.type)}</span>
                <span className="status-badge published">{getAudienceLabel(q.target_audience)}</span>
              </div>
              <p style={{fontWeight: 500, marginBottom: 8}}>{q.text}</p>
              {q.options && q.options.length > 0 && (
                <p style={{fontSize: 12, opacity: 0.7}}>
                  Варианты: {q.options.join(', ')}
                </p>
              )}
              <p style={{fontSize: 11, opacity: 0.5, marginTop: 8}}>
                {new Date(q.created_at).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
