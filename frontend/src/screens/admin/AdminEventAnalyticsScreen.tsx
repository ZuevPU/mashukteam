import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import { Question, Answer } from '../../types';
import './AdminScreens.css';

interface AdminEventAnalyticsScreenProps {
  eventId: string;
  onBack: () => void;
}

export const AdminEventAnalyticsScreen: React.FC<AdminEventAnalyticsScreenProps> = ({ eventId, onBack }) => {
  const { initData } = useTelegram();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ questions: Question[]; answers: Answer[] } | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!initData) return;
      try {
        const result = await adminApi.getEventAnalytics(eventId, initData);
        setData(result);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [eventId, initData]);

  if (loading) return <div className="loading">Загрузка аналитики...</div>;
  if (!data) return <div className="error">Нет данных</div>;

  const { questions, answers } = data;
  const totalRespondents = new Set(answers.map(a => a.user_id)).size;

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Анализ результатов</h3>
      </div>

      <div className="analytics-summary">
        <p>Всего ответов: <strong>{totalRespondents}</strong></p>
      </div>

      <div className="admin-list">
        {questions.map((q, index) => {
          const qAnswers = answers.filter(a => a.question_id === q.id);
          
          return (
            <div key={q.id} className="admin-item-card" style={{display: 'block'}}>
              <h4 style={{marginBottom: 10}}>{index + 1}. {q.text}</h4>
              
              {q.type === 'text' ? (
                <div className="text-answers">
                  {qAnswers.length === 0 ? (
                    <p style={{fontSize: 13, color: '#999'}}>Нет ответов</p>
                  ) : (
                    qAnswers.map((ans, i) => (
                      <div key={i} style={{
                        background: '#fff', padding: '8px', borderRadius: '6px', 
                        marginBottom: '6px', fontSize: '14px', border: '1px solid #eee'
                      }}>
                        {String(ans.answer_data)}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="stats-answers">
                  {calculateStats(q, qAnswers)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Хелпер для подсчета статистики
function calculateStats(question: Question, answers: Answer[]) {
  const counts: Record<string, number> = {};
  let total = 0;

  answers.forEach(ans => {
    const val = ans.answer_data;
    if (Array.isArray(val)) {
      val.forEach(v => {
        counts[v] = (counts[v] || 0) + 1;
        total++; // Или считать уникальных респондентов? Обычно считают выборы.
      });
    } else {
      counts[val] = (counts[val] || 0) + 1;
      total++;
    }
  });

  // Если total 0, чтобы не делить на ноль
  if (total === 0) return <p style={{fontSize: 13, color: '#999'}}>Нет ответов</p>;

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
      {Object.entries(counts).map(([option, count]) => {
        const percent = Math.round((count / answers.length) * 100); // % от числа ответивших людей
        return (
          <div key={option} style={{fontSize: '14px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '2px'}}>
              <span>{option}</span>
              <span>{count} ({percent}%)</span>
            </div>
            <div style={{
              width: '100%', height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden'
            }}>
              <div style={{
                width: `${percent}%`, height: '100%', background: '#3390ec'
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
