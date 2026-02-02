import React, { useState, useEffect } from 'react';
import { TargetedQuestion } from '../../types';
import { useTelegram } from '../../hooks/useTelegram';
import { buildApiEndpoint } from '../../utils/apiUrl';
import { adminApi } from '../../services/adminApi';
import './AdminScreens.css';

interface AdminQuestionsListScreenProps {
  onBack: () => void;
  onEdit?: (question: TargetedQuestion) => void;
}

export const AdminQuestionsListScreen: React.FC<AdminQuestionsListScreenProps> = ({ onBack, onEdit }) => {
  const { initData, showAlert } = useTelegram();
  const [questions, setQuestions] = useState<TargetedQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQuestions = async () => {
    if (!initData) return;
    try {
      const response = await fetch(buildApiEndpoint('/admin/targeted-questions'), {
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

  useEffect(() => {
    loadQuestions();
  }, [initData]);

  const handleDelete = async (id: string, text: string) => {
    if (!initData) return;
    if (confirm(`Удалить вопрос "${text.substring(0, 50)}..."?`)) {
      try {
        await adminApi.deleteTargetedQuestion(id, initData);
        showAlert('Вопрос удален');
        loadQuestions();
      } catch (error) {
        console.error('Error deleting question:', error);
        showAlert('Ошибка при удалении');
      }
    }
  };

  const handleStatusChange = async (question: TargetedQuestion) => {
    if (!initData) return;
    const newStatus = question.status === 'draft' ? 'published' : 'draft';
    const msg = newStatus === 'published' ? 'Опубликовать вопрос?' : 'Снять с публикации?';
    
    if (confirm(msg)) {
      try {
        await adminApi.updateTargetedQuestion(question.id, { status: newStatus }, initData);
        showAlert(newStatus === 'published' ? 'Опубликовано' : 'Скрыто');
        loadQuestions();
      } catch (error) {
        console.error('Error updating status:', error);
        showAlert('Ошибка при обновлении');
      }
    }
  };

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
            <div key={q.id} className="admin-item-card">
              <div className="item-info">
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                  <span className={`status-badge ${q.status === 'published' ? 'published' : 'draft'}`}>
                    {q.status === 'published' ? 'Опубликовано' : 'Черновик'}
                  </span>
                  <span className="status-badge event">{getTypeLabel(q.type)}</span>
                  <span className="status-badge diagnostic">{getAudienceLabel(q.target_audience)}</span>
                </div>
                <h4 style={{marginBottom: 8}}>{q.text}</h4>
                {q.options && q.options.length > 0 && (
                  <p style={{fontSize: 12, opacity: 0.7, marginBottom: 4}}>
                    Варианты: {q.options.join(', ')}
                  </p>
                )}
                <p style={{fontSize: 11, opacity: 0.5, marginTop: 8}}>
                  {new Date(q.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="item-actions">
                <button 
                  className="action-btn" 
                  onClick={() => handleStatusChange(q)}
                  title={q.status === 'draft' ? 'Опубликовать' : 'Скрыть'}
                >
                  {q.status === 'draft' ? '🚀' : '🔒'}
                </button>
                {onEdit && (
                  <button className="action-btn" onClick={() => onEdit(q)} title="Редактировать">✏️</button>
                )}
                <button className="action-btn" onClick={() => handleDelete(q.id, q.text)} title="Удалить">🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
