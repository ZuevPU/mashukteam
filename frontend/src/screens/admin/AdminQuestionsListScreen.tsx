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
  const [templates, setTemplates] = useState<TargetedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingTemplateId, setPublishingTemplateId] = useState<string | null>(null);

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
          // И разделяем шаблоны и обычные вопросы
          const allQuestions = data.questions.filter((q: TargetedQuestion) => q.type !== 'randomizer');
          const templatesList = allQuestions.filter((q: TargetedQuestion) => q.is_template);
          const regularQuestions = allQuestions.filter((q: TargetedQuestion) => !q.is_template);
          setTemplates(templatesList);
          setQuestions(regularQuestions);
        }
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка шаблонов с количеством экземпляров
  const loadTemplatesWithCount = async () => {
    if (!initData) return;
    try {
      const templatesData = await adminApi.getQuestionTemplates(initData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  useEffect(() => {
    loadQuestions();
    loadTemplatesWithCount();
  }, [initData]);

  // Публикация экземпляра шаблона
  const handlePublishTemplate = async (templateId: string, templateName: string) => {
    if (!initData) return;
    
    const sendNotification = confirm(`Отправить уведомление пользователям о новом вопросе "${templateName}"?`);
    
    setPublishingTemplateId(templateId);
    try {
      const instance = await adminApi.publishTemplateInstance(templateId, sendNotification, initData);
      showAlert(`Опубликовано: ${instance.template_name} ${instance.instance_number}`);
      loadQuestions();
      loadTemplatesWithCount();
    } catch (error: any) {
      console.error('Error publishing template:', error);
      showAlert(error.message || 'Ошибка при публикации шаблона');
    } finally {
      setPublishingTemplateId(null);
    }
  };

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

  // Формирование названия вопроса с учётом шаблона
  const getQuestionDisplayName = (q: TargetedQuestion) => {
    if (q.template_name && q.instance_number) {
      return `${q.template_name} ${q.instance_number}`;
    }
    return q.text;
  };

  const renderQuestionCard = (q: TargetedQuestion) => (
    <div key={q.id} className="admin-item-card">
      <div className="item-info">
        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap'}}>
          <span className={`status-badge ${q.status === 'published' ? 'published' : 'draft'}`}>
            {q.status === 'published' ? 'Опубликовано' : 'Черновик'}
          </span>
          <span className="status-badge event">{getTypeLabel(q.type)}</span>
          <span className="status-badge diagnostic">{getAudienceLabel(q.target_audience)}</span>
          {q.template_id && (
            <span className="status-badge" style={{background: '#e3f2fd', color: '#1976d2'}}>
              🔄 Экземпляр шаблона
            </span>
          )}
        </div>
        <h4 style={{marginBottom: 8}}>{getQuestionDisplayName(q)}</h4>
        {q.template_name && q.instance_number && (
          <p style={{fontSize: 12, opacity: 0.7, marginBottom: 4, fontStyle: 'italic'}}>
            Текст: {q.text}
          </p>
        )}
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

  // Рендеринг карточки шаблона
  const renderTemplateCard = (template: TargetedQuestion) => (
    <div key={template.id} className="admin-item-card" style={{
      background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
      border: '2px solid #2196f3'
    }}>
      <div className="item-info">
        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap'}}>
          <span className="status-badge" style={{background: '#2196f3', color: '#fff'}}>
            🔄 Шаблон
          </span>
          <span className="status-badge event">{getTypeLabel(template.type)}</span>
          <span className="status-badge diagnostic">{getAudienceLabel(template.target_audience)}</span>
        </div>
        <h4 style={{marginBottom: 8, color: '#1565c0'}}>{template.template_name || template.text}</h4>
        <p style={{fontSize: 12, opacity: 0.7, marginBottom: 4}}>
          Текст вопроса: {template.text}
        </p>
        {template.instances_count !== undefined && (
          <p style={{fontSize: 12, fontWeight: 600, color: '#1976d2', marginTop: 8}}>
            Опубликовано экземпляров: {template.instances_count}
          </p>
        )}
        <p style={{fontSize: 11, opacity: 0.5, marginTop: 8}}>
          Создан: {new Date(template.created_at).toLocaleDateString()}
        </p>
      </div>
      <div className="item-actions" style={{flexDirection: 'column', gap: 8}}>
        <button 
          className="action-btn"
          onClick={() => handlePublishTemplate(template.id, template.template_name || template.text)}
          disabled={publishingTemplateId === template.id}
          title="Опубликовать новый экземпляр"
          style={{
            background: '#4caf50',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            border: 'none',
            cursor: publishingTemplateId === template.id ? 'not-allowed' : 'pointer',
            opacity: publishingTemplateId === template.id ? 0.6 : 1
          }}
        >
          {publishingTemplateId === template.id ? '⏳...' : `🚀 ${template.template_name || 'Вопрос'} ${(template.instances_count || 0) + 1}`}
        </button>
        <div style={{display: 'flex', gap: 8}}>
          {onEdit && (
            <button className="action-btn" onClick={() => onEdit(template)} title="Редактировать">✏️</button>
          )}
          <button className="action-btn" onClick={() => handleDelete(template.id, template.template_name || template.text)} title="Удалить">🗑️</button>
        </div>
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
        {/* Секция шаблонов */}
        {templates.length > 0 && (
          <div style={{marginBottom: '32px'}}>
            <div style={{
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              color: '#fff',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{fontWeight: 600}}>🔄 Шаблоны для повторной публикации</span>
              <span style={{fontSize: 12, opacity: 0.9}}>{templates.length} шаблон(ов)</span>
            </div>
            {templates.map(renderTemplateCard)}
          </div>
        )}

        {/* Обычные вопросы */}
        {questions.length === 0 && templates.length === 0 ? (
          <p className="no-data">Нет созданных вопросов</p>
        ) : questions.length > 0 && (
          <>
            {templates.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                padding: '10px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
              }}>
                <span style={{fontWeight: 600}}>📋 Опубликованные вопросы</span>
              </div>
            )}
            {sortedGroups.map(([groupName, groupQuestions]) => (
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
            ))}
          </>
        )}
      </div>
    </div>
  );
};
