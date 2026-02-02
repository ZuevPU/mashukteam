import React, { useState, useEffect } from 'react';
import { CreateTargetedQuestionRequest, QuestionType, Direction, TargetedQuestion } from '../../types';
import { adminApi } from '../../services/adminApi';
import { randomizerApi } from '../../services/randomizerApi';
import { useTelegram } from '../../hooks/useTelegram';
import { UserSelector } from './UserSelector';
import './AdminScreens.css';

interface AdminCreateQuestionScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  editingQuestion?: TargetedQuestion;
}

export const AdminCreateQuestionScreen: React.FC<AdminCreateQuestionScreenProps> = ({ onBack, onSuccess, editingQuestion }) => {
  const { initData, showAlert } = useTelegram();
  const [loading, setLoading] = useState(false);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [sendNotification, setSendNotification] = useState(true);
  
  const [question, setQuestion] = useState<CreateTargetedQuestionRequest>({
    text: editingQuestion?.text || '',
    type: editingQuestion?.type || 'text',
    options: editingQuestion?.options || ['', ''],
    char_limit: editingQuestion?.char_limit || 1000,
    target_audience: editingQuestion?.target_audience || 'all',
    target_values: editingQuestion?.target_values || [],
    reflection_points: editingQuestion?.reflection_points || 1,
    group_name: editingQuestion?.group_name || '',
    group_order: editingQuestion?.group_order || 0,
    question_order: editingQuestion?.question_order || 0,
    status: editingQuestion?.status || 'draft'
  });
  
  // Состояние для выбора публикации при создании
  const [publishOnCreate, setPublishOnCreate] = useState(false);

  // Состояние для рандомайзера
  const [randomizerData, setRandomizerData] = useState({
    tables_count: 20,
    participants_per_table: 4,
    topic: '',
    description: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const directionsData = await adminApi.getDirections();
        setDirections(directionsData);
      } catch (error) {
        console.error('Error loading directions:', error);
      }
    };
    load();
  }, []);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as QuestionType;
    setQuestion((prev: CreateTargetedQuestionRequest) => ({ 
      ...prev, 
      type: newType,
      options: (newType === 'single' || newType === 'multiple') ? ['', ''] : []
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(question.options || [])];
    newOptions[index] = value;
    setQuestion((prev: CreateTargetedQuestionRequest) => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setQuestion((prev: CreateTargetedQuestionRequest) => ({ ...prev, options: [...(prev.options || []), ''] }));
  };

  const removeOption = (index: number) => {
    if ((question.options?.length || 0) <= 2) return;
    const newOptions = [...(question.options || [])];
    newOptions.splice(index, 1);
    setQuestion((prev: CreateTargetedQuestionRequest) => ({ ...prev, options: newOptions }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initData) return;

    if (question.target_audience === 'individual' && (!question.target_values || question.target_values.length === 0)) {
      showAlert('Выберите пользователей');
      return;
    }
    if (question.target_audience === 'by_direction' && (!question.target_values || question.target_values.length === 0)) {
      showAlert('Выберите направление');
      return;
    }

    if (!question.text.trim()) {
      showAlert('Введите текст вопроса');
      return;
    }

    if ((question.type === 'single' || question.type === 'multiple')) {
      const validOptions = question.options?.filter((o: string) => o.trim()) || [];
      if (validOptions.length < 2) {
        showAlert('Добавьте минимум 2 варианта ответа');
        return;
      }
    }

    if (question.type === 'randomizer') {
      if (!randomizerData.topic.trim()) {
        showAlert('Введите тему вопроса');
        return;
      }
      if (randomizerData.tables_count <= 0) {
        showAlert('Укажите количество столов');
        return;
      }
      if (randomizerData.participants_per_table <= 0) {
        showAlert('Укажите количество участников на стол');
        return;
      }
    }

    setLoading(true);
    try {
      // Для рандомайзера используем topic как text вопроса
      const questionText = question.type === 'randomizer' 
        ? randomizerData.topic || 'Рандомайзер'
        : question.text;
      
      // Подготавливаем данные для отправки
      const dataToSend: any = {
        text: questionText,
        type: question.type,
        target_audience: question.target_audience,
        reflection_points: question.reflection_points || 1,
        group_name: question.group_name || null,
        group_order: question.group_order || 0,
        question_order: question.question_order || 0,
      };
      
      // Для рандомайзера не отправляем options
      if (question.type !== 'randomizer') {
        const filteredOptions = question.options?.filter((o: string) => o.trim());
        dataToSend.options = filteredOptions && filteredOptions.length > 0 ? filteredOptions : undefined;
      }
      
      // Обработка target_values: отправляем только если есть значения
      if (question.target_values && question.target_values.length > 0) {
        dataToSend.target_values = question.target_values;
      }
      
      // Обработка char_limit
      if (question.char_limit) {
        dataToSend.char_limit = question.char_limit;
      }
      
      if (editingQuestion) {
        await adminApi.updateTargetedQuestion(editingQuestion.id, dataToSend, initData);
        showAlert('Вопрос обновлен!');
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6ee1941a-785a-4be3-ad48-7432e5d314b9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AdminCreateQuestionScreen.tsx:153',message:'before createTargetedQuestion',data:{type:dataToSend.type,hasOptions:!!dataToSend.options,optionsLength:dataToSend.options?.length,targetAudience:dataToSend.target_audience,hasTargetValues:!!dataToSend.target_values,targetValuesLength:dataToSend.target_values?.length,reflectionPoints:dataToSend.reflection_points,status:'published'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        const createdQuestion = await adminApi.createTargetedQuestion({ 
          ...dataToSend, 
          status: publishOnCreate ? 'published' : 'draft', 
          sendNotification: publishOnCreate && sendNotification 
        }, initData);
        
        // Если тип рандомайзер, создаем рандомайзер
        if (question.type === 'randomizer' && createdQuestion?.id) {
          try {
            await randomizerApi.createRandomizer(initData, {
              question_id: createdQuestion.id,
              tables_count: randomizerData.tables_count,
              participants_per_table: randomizerData.participants_per_table,
              topic: randomizerData.topic,
              description: randomizerData.description || undefined,
            });
          } catch (randomizerError: any) {
            console.error('Error creating randomizer:', randomizerError);
            showAlert('Вопрос создан, но ошибка создания рандомайзера: ' + (randomizerError.message || 'Неизвестная ошибка'));
            onSuccess();
            return;
          }
        }
        
        showAlert('Вопрос создан!');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error:', error);
      showAlert(error.message || (editingQuestion ? 'Ошибка обновления' : 'Ошибка создания'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Создать вопрос</h3>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        
        {/* 1. КОМУ ЗАДАТЬ */}
        <div className="form-group">
          <label>1. Кому задать вопрос?</label>
          <select 
            className="form-select"
            value={question.target_audience}
            onChange={(e) => setQuestion((prev: CreateTargetedQuestionRequest) => ({...prev, target_audience: e.target.value as 'all' | 'by_direction' | 'individual', target_values: []}))}
          >
            <option value="all">👥 Всем пользователям</option>
            <option value="by_direction">📋 По направлению</option>
            <option value="individual">👤 Конкретным людям</option>
          </select>
        </div>

        {question.target_audience === 'by_direction' && (
          <div className="form-group">
            <label>Выберите направления:</label>
            <div className="checkbox-group">
              {directions.map(d => (
                <label key={d.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={question.target_values?.includes(d.slug) || false}
                    onChange={(e) => {
                      const vals = question.target_values || [];
                      if (e.target.checked) {
                        setQuestion((prev: CreateTargetedQuestionRequest) => ({...prev, target_values: [...vals, d.slug]}));
                      } else {
                        setQuestion((prev: CreateTargetedQuestionRequest) => ({...prev, target_values: vals.filter((v: string) => v !== d.slug)}));
                      }
                    }}
                  />
                  {d.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {question.target_audience === 'individual' && (
          <div className="form-group">
            <label>Выберите пользователей:</label>
            <UserSelector 
              selectedUserIds={question.target_values || []}
              onChange={(ids: string[]) => setQuestion((prev: CreateTargetedQuestionRequest) => ({...prev, target_values: ids}))}
            />
          </div>
        )}

        {/* 2. ТИП ОТВЕТА */}
        <div className="form-group">
          <label>2. Тип ответа</label>
          <select className="form-select" value={question.type} onChange={handleTypeChange}>
            <option value="text">📝 Открытый ответ (текст)</option>
            <option value="single">⭕ Выбрать один вариант</option>
            <option value="multiple">☑️ Выбрать несколько вариантов</option>
            <option value="scale">🔢 Ввод числа (1-10)</option>
            <option value="randomizer">🎲 Рандомайзер</option>
          </select>
        </div>

        {/* ПОЛЯ ДЛЯ РАНДОМАЙЗЕРА */}
        {question.type === 'randomizer' && (
          <>
            <div className="form-group">
              <label>Количество столов</label>
              <input
                type="number"
                className="form-input"
                value={randomizerData.tables_count}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setRandomizerData(prev => ({...prev, tables_count: 0}));
                  } else {
                    const numValue = parseInt(value, 10);
                    if (!isNaN(numValue) && numValue > 0) {
                      setRandomizerData(prev => ({...prev, tables_count: numValue}));
                    }
                  }
                }}
                min="1"
                placeholder="20"
              />
            </div>

            <div className="form-group">
              <label>Участников на стол</label>
              <input
                type="number"
                className="form-input"
                value={randomizerData.participants_per_table}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setRandomizerData(prev => ({...prev, participants_per_table: 0}));
                  } else {
                    const numValue = parseInt(value, 10);
                    if (!isNaN(numValue) && numValue > 0) {
                      setRandomizerData(prev => ({...prev, participants_per_table: numValue}));
                    }
                  }
                }}
                min="1"
                placeholder="4"
              />
            </div>

            <div className="form-group">
              <label>Тема вопроса *</label>
              <input
                type="text"
                className="form-input"
                value={randomizerData.topic}
                onChange={(e) => setRandomizerData(prev => ({...prev, topic: e.target.value}))}
                placeholder="Введите тему вопроса..."
              />
            </div>

            <div className="form-group">
              <label>Описание вопроса</label>
              <textarea
                className="form-textarea"
                value={randomizerData.description}
                onChange={(e) => setRandomizerData(prev => ({...prev, description: e.target.value}))}
                placeholder="Введите описание вопроса..."
                rows={3}
              />
            </div>
          </>
        )}

        {/* 3. ВАРИАНТЫ ОТВЕТОВ */}
        {(question.type === 'single' || question.type === 'multiple') && (
          <div className="form-group">
            <label>3. Варианты ответов</label>
            {question.options?.map((opt: string, idx: number) => (
              <div key={idx} className="option-row">
                <input 
                  className="form-input"
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Вариант ${idx + 1}`}
                />
                {(question.options?.length || 0) > 2 && (
                  <button 
                    type="button" 
                    className="remove-option"
                    onClick={() => removeOption(idx)}
                  >✕</button>
                )}
              </div>
            ))}
            <button type="button" className="add-option-btn" onClick={addOption}>
              + Добавить вариант
            </button>
          </div>
        )}

        {/* 4. ТЕКСТ ВОПРОСА */}
        <div className="form-group">
          <label>{(question.type === 'single' || question.type === 'multiple') ? '4.' : '3.'} Текст вопроса</label>
          <textarea 
            className="form-textarea"
            value={question.text}
            onChange={(e) => setQuestion((prev: CreateTargetedQuestionRequest) => ({...prev, text: e.target.value}))}
            placeholder="Введите текст вопроса..."
            rows={3}
          />
        </div>

        {/* Баллы рефлексии */}
        <div className="form-group">
          <label>Баллы рефлексии</label>
          <input
            type="number"
            className="form-input"
            value={question.reflection_points || 1}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                setQuestion((prev: CreateTargetedQuestionRequest) => ({...prev, reflection_points: 1}));
              } else {
                const numValue = parseInt(value, 10);
                if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                  setQuestion((prev: CreateTargetedQuestionRequest) => ({...prev, reflection_points: numValue}));
                }
              }
            }}
            min="0"
            max="100"
            placeholder="1"
          />
          <small style={{fontSize: 12, opacity: 0.7, display: 'block', marginTop: 4}}>
            Количество баллов рефлексии за ответ на этот вопрос (по умолчанию 1)
          </small>
        </div>

        {/* ГРУППИРОВКА ВОПРОСОВ */}
        <div className="form-group">
          <label>Группа вопросов</label>
          <input
            type="text"
            className="form-input"
            value={question.group_name || ''}
            onChange={(e) => setQuestion((prev: CreateTargetedQuestionRequest) => ({...prev, group_name: e.target.value}))}
            placeholder="Например: Рефлексия, Обратная связь, День 1..."
          />
          <small style={{fontSize: 12, opacity: 0.7, display: 'block', marginTop: 4}}>
            Вопросы с одинаковым названием группы будут отображаться вместе
          </small>
        </div>

        <div style={{display: 'flex', gap: '12px'}}>
          <div className="form-group" style={{flex: 1}}>
            <label>Порядок группы</label>
            <input
              type="number"
              className="form-input"
              value={question.group_order ?? 0}
              onChange={(e) => {
                const value = e.target.value;
                setQuestion((prev: CreateTargetedQuestionRequest) => ({
                  ...prev, 
                  group_order: value === '' ? 0 : parseInt(value, 10) || 0
                }));
              }}
              min="0"
              placeholder="0"
            />
          </div>
          <div className="form-group" style={{flex: 1}}>
            <label>Порядок в группе</label>
            <input
              type="number"
              className="form-input"
              value={question.question_order ?? 0}
              onChange={(e) => {
                const value = e.target.value;
                setQuestion((prev: CreateTargetedQuestionRequest) => ({
                  ...prev, 
                  question_order: value === '' ? 0 : parseInt(value, 10) || 0
                }));
              }}
              min="0"
              placeholder="0"
            />
          </div>
        </div>

        {/* ПУБЛИКАЦИЯ И УВЕДОМЛЕНИЕ */}
        {!editingQuestion && (
          <div className="form-group">
            <label className="checkbox-item" style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
              <input
                type="checkbox"
                checked={publishOnCreate}
                onChange={(e) => setPublishOnCreate(e.target.checked)}
              />
              <span>🚀 Сразу опубликовать вопрос</span>
            </label>
            <small style={{fontSize: 12, opacity: 0.7, display: 'block', marginTop: 4}}>
              Если не отмечено, вопрос будет сохранен как черновик
            </small>
          </div>
        )}

        {!editingQuestion && publishOnCreate && (
          <div className="form-group">
            <label className="checkbox-item" style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
              />
              <span>📬 Отправить уведомление пользователям</span>
            </label>
          </div>
        )}

        <button type="submit" className="save-btn" disabled={loading}>
          {loading 
            ? (editingQuestion ? 'Обновление...' : 'Создание...') 
            : (editingQuestion 
                ? '✓ Сохранить изменения' 
                : (publishOnCreate ? '🚀 Создать и опубликовать' : '💾 Сохранить как черновик')
              )
          }
        </button>
      </form>
    </div>
  );
};
