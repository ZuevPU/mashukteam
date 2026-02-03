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
        if (data.questions) {
          // Фильтруем вопросы типа randomizer (они теперь в заданиях)
          const filteredQuestions = data.questions.filter((q: TargetedQuestion) => q.type !== 'randomizer');
          setQuestions(filteredQuestions);
        }
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
      case 'by_direction': return '📋 По направлению';
      case 'individual': return '👤 Персонально';
      default: return audience;
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  // Группировка вопросов по group_name
  const groupedQuestions = questions.reduce((acc, q) => {
    const groupName = q.group_name || 'Без группы';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(q);
    return acc;
  }, {} as Record<string, TargetedQuestion[]>);

  // Сортировка групп по group_order первого вопроса
  const sortedGroups = Object.entries(groupedQuestions).sort(([, a], [, b]) => {
    const orderA = a[0]?.group_order ?? 0;
    const orderB = b[0]?.group_order ?? 0;
    return orderA - orderB;
  });

  const renderQuestionCard = (q: TargetedQuestion) => (
    <div key={q.id} className="admin-item-card">
      <div className="item-info">
        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap'}}>
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
        {q.reflection_points !== undefined && (
          <p style={{fontSize: 11, opacity: 0.7, marginTop: 4}}>
            Баллы рефлексии: {q.reflection_points}
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
  );

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
          sortedGroups.map(([groupName, groupQuestions]) => (
            <div key={groupName} style={{marginBottom: '24px'}}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                padding: '10px 16px',
                borderRadius: '8px',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{fontWeight: 600}}>📁 {groupName}</span>
                <span style={{fontSize: 12, opacity: 0.9}}>{groupQuestions.length} вопр.</span>
              </div>
              {groupQuestions.map(renderQuestionCard)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
