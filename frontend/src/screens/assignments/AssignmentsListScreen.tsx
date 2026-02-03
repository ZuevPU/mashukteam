import React, { useEffect, useState } from 'react';
import { Assignment, AssignmentSubmission, RandomizerQuestion, RandomizerDistribution } from '../../types';
import { assignmentApi, RandomizerForUserResponse } from '../../services/assignmentApi';
import { randomizerApi } from '../../services/randomizerApi';
import { RandomizerCard } from '../../components/questions/RandomizerCard';
import { AssignmentRandomizerCard } from '../../components/assignments/AssignmentRandomizerCard';
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
  const [randomizers, setRandomizers] = useState<Array<{ randomizer: { id: string; question_id?: string; status: string }; isParticipant: boolean; distribution?: any }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!initData) return;
      try {
        const [assignmentsData, submissionsData, randomizersData] = await Promise.all([
          assignmentApi.getMyAssignments(initData),
          assignmentApi.getMySubmissions(initData),
          randomizerApi.getMyRandomizers(initData).catch(() => [])
        ]);
        setAssignments(assignmentsData);
        setSubmissions(submissionsData);
        setRandomizers(randomizersData);
      } catch (error) {
        console.error('Error loading assignments:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [initData]);

  if (loading) return <div className="loading">Загрузка...</div>;

  // Разделяем на выполненные, невыполненные и random_number
  const submittedIds = new Set(submissions.map(s => s.assignment_id));
  
  // Обычные задания (не random_number)
  const regularAssignments = assignments.filter(a => a.answer_format !== 'random_number');
  const available = regularAssignments.filter(a => !submittedIds.has(a.id));
  const completed = regularAssignments.filter(a => submittedIds.has(a.id));
  
  // Задания типа random_number
  const randomNumberAssignments = assignments.filter(a => a.answer_format === 'random_number');
  
  // Рандомайзеры из вопросов (устаревший способ, для обратной совместимости)
  // Фильтруем только те, у которых есть question_id (старые), но НЕТ assignment_id (новые)
  const legacyRandomizers = randomizers.filter(r => 
    r.randomizer.question_id && !(r.randomizer as any).assignment_id
  );
  const openRandomizers = legacyRandomizers.filter(r => r.randomizer.status === 'open');
  const distributedRandomizers = legacyRandomizers.filter(r => r.randomizer.status === 'distributed');

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
                  <span className="reward-badge">⭐ {a.reward}</span>
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

      {/* Случайные числа из заданий (новый способ) */}
      {randomNumberAssignments.length > 0 && (
        <>
          <h4 className="section-title">Случайные числа ({randomNumberAssignments.length})</h4>
          <div className="assignments-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {randomNumberAssignments.map((a) => (
              <AssignmentRandomizerCard key={a.id} assignment={a} />
            ))}
          </div>
        </>
      )}

      {/* Старые рандомайзеры из вопросов (для обратной совместимости) */}
      {legacyRandomizers.length > 0 && (
        <>
          <h4 className="section-title">Архивные распределения</h4>
          <div className="assignments-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {openRandomizers.map((r) => (
              <div key={r.randomizer.id} className="assignment-card" style={{ padding: 0, overflow: 'hidden' }}>
                <RandomizerCard questionId={r.randomizer.question_id || ''} randomizerId={r.randomizer.id} />
              </div>
            ))}
            {distributedRandomizers.map((r) => (
              <div key={r.randomizer.id} className="assignment-card completed" style={{ padding: 0, overflow: 'hidden' }}>
                <RandomizerCard questionId={r.randomizer.question_id || ''} randomizerId={r.randomizer.id} />
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

      {assignments.length === 0 && legacyRandomizers.length === 0 && (
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
    case 'photo_upload': return '📷';
    case 'random_number': return '🎲';
    default: return '📝';
  }
}

function getFormatLabel(format: string) {
  switch (format) {
    case 'text': return 'Текст';
    case 'number': return 'Число';
    case 'link': return 'Ссылка';
    case 'photo_upload': return 'Загрузка фото';
    case 'random_number': return 'Случайное число';
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
