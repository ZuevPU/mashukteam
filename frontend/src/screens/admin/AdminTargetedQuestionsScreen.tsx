import React, { useState } from 'react';
import './AdminScreens.css';

interface AdminTargetedQuestionsScreenProps {
  onBack: () => void;
  onCreateQuestion: () => void;
  onViewQuestions: () => void;
  onReviewAnswers: () => void;
}

export const AdminTargetedQuestionsScreen: React.FC<AdminTargetedQuestionsScreenProps> = ({ 
  onBack, onCreateQuestion, onViewQuestions, onReviewAnswers 
}) => {
  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Персональные вопросы</h3>
      </div>

      <div className="admin-list">
        <div className="admin-item-card" onClick={onViewQuestions} style={{cursor: 'pointer'}}>
          <div className="item-info">
            <h4>📋 Список вопросов</h4>
            <p>Просмотр созданных вопросов</p>
          </div>
          <span>→</span>
        </div>

        <div className="admin-item-card" onClick={onCreateQuestion} style={{cursor: 'pointer'}}>
          <div className="item-info">
            <h4>➕ Создать вопрос</h4>
            <p>Новый персональный вопрос</p>
          </div>
          <span>→</span>
        </div>

        <div className="admin-item-card" onClick={onReviewAnswers} style={{cursor: 'pointer'}}>
          <div className="item-info">
            <h4>📝 Проверить ответы</h4>
            <p>Просмотр ответов пользователей</p>
          </div>
          <span>→</span>
        </div>
      </div>
    </div>
  );
};
