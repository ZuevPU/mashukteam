import React, { useState, useEffect } from 'react';
import { TargetedQuestion, RandomizerQuestion } from '../../types';
import { useTelegram } from '../../hooks/useTelegram';
import { buildApiEndpoint } from '../../utils/apiUrl';
import { adminApi } from '../../services/adminApi';
import { randomizerApi } from '../../services/randomizerApi';
import './AdminScreens.css';

interface AdminQuestionsListScreenProps {
  onBack: () => void;
  onEdit?: (question: TargetedQuestion) => void;
}

export const AdminQuestionsListScreen: React.FC<AdminQuestionsListScreenProps> = ({ onBack, onEdit }) => {
  const { initData, showAlert } = useTelegram();
  const [questions, setQuestions] = useState<TargetedQuestion[]>([]);
  const [randomizers, setRandomizers] = useState<Record<string, RandomizerQuestion & { participantsCount: number }>>({});
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState<string | null>(null);

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
          setQuestions(data.questions);
          
          // Загружаем данные рандомайзеров для вопросов типа randomizer
          const randomizerQuestions = data.questions.filter((q: TargetedQuestion) => q.type === 'randomizer');
          const randomizerMap: Record<string, RandomizerQuestion & { participantsCount: number }> = {};
          
          for (const q of randomizerQuestions) {
            try {
              // Получаем рандомайзер по question_id через бэкенд
              const randomizerResponse = await fetch(buildApiEndpoint(`/randomizer/by-question/${q.id}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData })
              });
              
              if (randomizerResponse.ok) {
                const randomizerData = await randomizerResponse.json();
                if (randomizerData.randomizer) {
                  // Получаем количество участников
                  const participantsResponse = await fetch(buildApiEndpoint(`/randomizer/${randomizerData.randomizer.id}/participants-count`), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ initData })
                  });
                  
                  let participantsCount = 0;
                  if (participantsResponse.ok) {
                    const participantsData = await participantsResponse.json();
                    participantsCount = participantsData.count || 0;
                  }
                  
                  randomizerMap[q.id] = {
                    ...randomizerData.randomizer,
                    participantsCount,
                  };
                }
              }
            } catch (err) {
              console.error('Error loading randomizer for question:', q.id, err);
            }
          }
          
          setRandomizers(randomizerMap);
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

  const handleDistribute = async (questionId: string) => {
    if (!initData) return;
    const randomizer = randomizers[questionId];
    if (!randomizer) return;
    
    if (distributing) {
      showAlert('Распределение уже выполняется');
      return;
    }
    
    if (confirm(`Подвести итоги и распределить ${randomizer.participantsCount} участников по столам?`)) {
      setDistributing(questionId);
      try {
        await randomizerApi.distribute(initData, randomizer.id);
        showAlert('Участники распределены! Уведомления отправлены.');
        loadQuestions();
      } catch (error: any) {
        console.error('Error distributing:', error);
        showAlert(error.message || 'Ошибка при распределении');
      } finally {
        setDistributing(null);
      }
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return '📝 Текст';
      case 'single': return '⭕ Один вариант';
      case 'multiple': return '☑️ Несколько';
      case 'scale': return '🔢 Число';
      case 'randomizer': return '🎲 Рандомайзер';
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
                {q.type === 'randomizer' && randomizers[q.id] && (
                  <div style={{marginBottom: 8, padding: '8px', background: 'var(--color-bg-primary, #F8F8F7)', borderRadius: '6px'}}>
                    <div style={{fontSize: 12, marginBottom: 4}}>
                      <strong>Тема:</strong> {randomizers[q.id].topic}
                    </div>
                    {randomizers[q.id].description && (
                      <div style={{fontSize: 11, opacity: 0.8, marginBottom: 4}}>
                        {randomizers[q.id].description}
                      </div>
                    )}
                    <div style={{fontSize: 11, display: 'flex', gap: '12px', marginTop: 4}}>
                      <span>Столов: {randomizers[q.id].tables_count}</span>
                      <span>На стол: {randomizers[q.id].participants_per_table}</span>
                      <span>Участников: {randomizers[q.id].participantsCount}</span>
                    </div>
                    <div style={{fontSize: 11, marginTop: 4}}>
                      Статус: <strong>{randomizers[q.id].status === 'open' ? 'Открыт' : randomizers[q.id].status === 'distributed' ? 'Распределен' : 'Закрыт'}</strong>
                    </div>
                  </div>
                )}
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
                {q.type === 'randomizer' && randomizers[q.id] && randomizers[q.id].status === 'open' && (
                  <button
                    className="action-btn"
                    onClick={() => handleDistribute(q.id)}
                    disabled={distributing === q.id}
                    title="Подвести итоги"
                    style={{background: '#28a745', color: '#fff'}}
                  >
                    {distributing === q.id ? '⏳' : '🎲'}
                  </button>
                )}
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
