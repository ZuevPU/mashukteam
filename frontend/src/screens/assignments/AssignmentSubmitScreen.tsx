import React, { useState } from 'react';
import { Assignment } from '../../types';
import { assignmentApi } from '../../services/assignmentApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AssignmentsScreen.css';

interface AssignmentSubmitScreenProps {
  assignment: Assignment;
  onBack: () => void;
  onSuccess: () => void;
}

export const AssignmentSubmitScreen: React.FC<AssignmentSubmitScreenProps> = ({ 
  assignment, onBack, onSuccess 
}) => {
  const { initData, showAlert } = useTelegram();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!initData) return;
    
    if (!content.trim()) {
      showAlert('Введите ответ');
      return;
    }

    // Validate format
    if (assignment.answer_format === 'number' && isNaN(Number(content))) {
      showAlert('Введите число');
      return;
    }
    if (assignment.answer_format === 'link' && !content.startsWith('http')) {
      showAlert('Введите корректную ссылку (начинается с http)');
      return;
    }

    setLoading(true);
    try {
      await assignmentApi.submitAssignment(assignment.id, content, initData);
      showAlert('Ответ отправлен на проверку!');
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting:', error);
      showAlert(error.message || 'Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="assignments-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Выполнить задание</h3>
      </div>

      <div className="assignment-detail">
        <div className="reward-badge large">⭐ {assignment.reward} звездочек</div>
        
        <h2>{assignment.title}</h2>
        
        {assignment.description && (
          <p className="description full">{assignment.description}</p>
        )}

        <div className="input-section">
          <label>
            {assignment.answer_format === 'text' && 'Ваш ответ:'}
            {assignment.answer_format === 'number' && 'Введите число:'}
            {assignment.answer_format === 'link' && 'Вставьте ссылку:'}
          </label>
          
          {assignment.answer_format === 'text' ? (
            <textarea 
              className="input-text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Напишите ваш ответ..."
              rows={5}
            />
          ) : (
            <input 
              type={assignment.answer_format === 'number' ? 'number' : 'url'}
              className="input-field"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={assignment.answer_format === 'number' ? '0' : 'https://...'}
            />
          )}
        </div>

        <button 
          className="submit-button"
          onClick={handleSubmit}
          disabled={loading || !content.trim()}
        >
          {loading ? 'Отправка...' : 'Отправить на проверку'}
        </button>
      </div>
    </div>
  );
};
