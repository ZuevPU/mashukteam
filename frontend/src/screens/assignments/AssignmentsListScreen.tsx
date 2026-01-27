import React, { useEffect, useState } from 'react';
import { Assignment, AssignmentSubmission } from '../../types';
import { assignmentApi } from '../../services/assignmentApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AssignmentsScreen.css';

interface AssignmentsListScreenProps {
  onBack: () => void;
  onSelect: (assignment: Assignment) => void;
}

export const AssignmentsListScreen: React.FC<AssignmentsListScreenProps> = ({ onBack, onSelect }) => {
  const { initData } = useTelegram();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!initData) return;
      try {
        const [assignmentsData, submissionsData] = await Promise.all([
          assignmentApi.getMyAssignments(initData),
          assignmentApi.getMySubmissions(initData)
        ]);
        setAssignments(assignmentsData);
        setSubmissions(submissionsData);
      } catch (error) {
        console.error('Error loading assignments:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [initData]);

  if (loading) return <div className="loading">Загрузка...</div>;

  // Разделяем на выполненные и невыполненные
  const submittedIds = new Set(submissions.map(s => s.assignment_id));
  const available = assignments.filter(a => !submittedIds.has(a.id));
  const completed = assignments.filter(a => submittedIds.has(a.id));

  return (
    <div className="assignments-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Задания</h3>
      </div>

      {available.length > 0 && (
        <>
          <h4 className="section-title">Доступные ({available.length})</h4>
          <div className="assignments-list">
            {available.map((a) => (
              <div key={a.id} className="assignment-card" onClick={() => onSelect(a)}>
                <div className="assignment-header">
                  <span className="reward-badge">+{a.reward} баллов</span>
                </div>
                <h4>{a.title}</h4>
                {a.description && <p className="description">{a.description.slice(0, 100)}...</p>}
                <div className="assignment-footer">
                  <span className="format">{getFormatIcon(a.answer_format)} {getFormatLabel(a.answer_format)}</span>
                  <span className="action">Выполнить →</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {completed.length > 0 && (
        <>
          <h4 className="section-title">Выполнено ({completed.length})</h4>
          <div className="assignments-list">
            {completed.map((a) => {
              const sub = submissions.find(s => s.assignment_id === a.id);
              return (
                <div key={a.id} className="assignment-card completed">
                  <div className="assignment-header">
                    <span className={`status-badge ${sub?.status}`}>
                      {getStatusLabel(sub?.status || 'pending')}
                    </span>
                  </div>
                  <h4>{a.title}</h4>
                  <p className="submitted-answer">Ваш ответ: {sub?.content?.slice(0, 50)}...</p>
                  {sub?.admin_comment && (
                    <p className="admin-comment">Комментарий: {sub.admin_comment}</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {assignments.length === 0 && (
        <p className="no-data">Нет доступных заданий</p>
      )}
    </div>
  );
};

function getFormatIcon(format: string) {
  switch (format) {
    case 'text': return '📝';
    case 'number': return '🔢';
    case 'link': return '🔗';
    default: return '📝';
  }
}

function getFormatLabel(format: string) {
  switch (format) {
    case 'text': return 'Текст';
    case 'number': return 'Число';
    case 'link': return 'Ссылка';
    default: return format;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pending': return 'На проверке';
    case 'approved': return 'Принято';
    case 'rejected': return 'Отклонено';
    default: return status;
  }
}
