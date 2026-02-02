import React, { useEffect, useState } from 'react';
import { AssignmentSubmission } from '../../types';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css';

interface AdminAssignmentSubmissionsScreenProps {
  assignmentId: string;
  onBack: () => void;
}

export const AdminAssignmentSubmissionsScreen: React.FC<AdminAssignmentSubmissionsScreenProps> = ({ 
  assignmentId, onBack 
}) => {
  const { initData, showAlert } = useTelegram();
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [moderating, setModerating] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const loadSubmissions = async () => {
    if (!initData) return;
    try {
      const data = await adminApi.getAssignmentSubmissions(assignmentId, initData);
      setSubmissions(data);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [assignmentId, initData]);

  const handleModerate = async (submissionId: string, status: 'approved' | 'rejected') => {
    if (!initData) return;
    try {
      await adminApi.moderateSubmission(submissionId, status, comment || undefined, initData);
      showAlert(status === 'approved' ? 'Принято!' : 'Отклонено');
      setModerating(null);
      setComment('');
      loadSubmissions();
    } catch (error) {
      console.error('Error moderating:', error);
      showAlert('Ошибка');
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  const pending = submissions.filter(s => s.status === 'pending');
  const reviewed = submissions.filter(s => s.status !== 'pending');

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Ответы ({submissions.length})</h3>
      </div>

      {pending.length > 0 && (
        <>
          <h4 style={{marginBottom: 12}}>На проверке ({pending.length})</h4>
          <div className="admin-list" style={{marginBottom: 24}}>
            {pending.map((sub) => (
              <div key={sub.id} className="admin-item-card block">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                  <strong>{(sub as any).user?.first_name} {(sub as any).user?.last_name}</strong>
                  <span style={{fontSize: 12, opacity: 0.6}}>
                    {new Date(sub.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="answer-box">{sub.content}</p>
                {(sub as any).assignment?.reward && (
                  <div style={{marginTop: 8, padding: '8px 12px', background: '#fff3cd', borderRadius: '6px', fontSize: '13px'}}>
                    ⭐ За выполнение: <strong>{(sub as any).assignment.reward} звездочек</strong>
                  </div>
                )}
                
                {moderating === sub.id ? (
                  <div style={{marginTop: 12}}>
                    <textarea 
                      className="form-textarea"
                      placeholder="Комментарий (необязательно)"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      style={{minHeight: 60, marginBottom: 8}}
                    />
                    <div style={{display: 'flex', gap: 8}}>
                      <button 
                        className="save-btn" 
                        style={{flex: 1, marginTop: 0, background: '#28a745'}}
                        onClick={() => handleModerate(sub.id, 'approved')}
                      >
                        ✓ Принять {((sub as any).assignment?.reward) ? `(+⭐ ${(sub as any).assignment.reward})` : ''}
                      </button>
                      <button 
                        className="save-btn" 
                        style={{flex: 1, marginTop: 0, background: '#dc3545'}}
                        onClick={() => handleModerate(sub.id, 'rejected')}
                      >
                        ✕ Отклонить
                      </button>
                    </div>
                    <button 
                      style={{marginTop: 8, background: 'none', border: 'none', color: '#666', cursor: 'pointer'}}
                      onClick={() => { setModerating(null); setComment(''); }}
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <button 
                    className="save-btn" 
                    style={{marginTop: 12}}
                    onClick={() => setModerating(sub.id)}
                  >
                    Проверить
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {reviewed.length > 0 && (
        <>
          <h4 style={{marginBottom: 12}}>Проверено ({reviewed.length})</h4>
          <div className="admin-list">
            {reviewed.map((sub) => (
              <div key={sub.id} className="admin-item-card block">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                  <strong>{(sub as any).user?.first_name} {(sub as any).user?.last_name}</strong>
                  <span className={`status-badge ${sub.status === 'approved' ? 'published' : 'completed'}`}>
                    {sub.status === 'approved' ? 'Принято' : 'Отклонено'}
                  </span>
                </div>
                <p className="answer-box">{sub.content}</p>
                {sub.status === 'approved' && (sub as any).assignment?.reward && (
                  <div style={{marginTop: 8, padding: '8px 12px', background: '#d4edda', borderRadius: '6px', fontSize: '13px'}}>
                    ⭐ Начислено: <strong>{(sub as any).assignment.reward} звездочек</strong>
                  </div>
                )}
                {sub.admin_comment && (
                  <p style={{fontSize: 12, opacity: 0.7, marginTop: 8}}>
                    Комментарий: {sub.admin_comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {submissions.length === 0 && (
        <p className="no-data">Пока нет ответов</p>
      )}
    </div>
  );
};
