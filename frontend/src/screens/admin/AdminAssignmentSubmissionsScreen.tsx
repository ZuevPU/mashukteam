import React, { useEffect, useState } from 'react';
import { AssignmentSubmission } from '../../types';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css';

// Компонент для отображения загруженного изображения
const SubmissionImage: React.FC<{ fileUrl: string; userName: string }> = ({ fileUrl, userName }) => {
  const [imageError, setImageError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const handleDownload = async () => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Извлекаем расширение из URL или используем jpg по умолчанию
      const extension = fileUrl.split('.').pop()?.split('?')[0] || 'jpg';
      a.download = `${userName.replace(/\s+/g, '_')}_submission.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: открыть в новой вкладке
      window.open(fileUrl, '_blank');
    }
  };

  if (imageError) {
    return (
      <div style={{ 
        marginTop: 12, 
        padding: '12px', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#666' }}>
          📎 Прикреплен файл
        </p>
        <button
          onClick={handleDownload}
          style={{
            background: '#007bff',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          📥 Скачать файл
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ 
        marginTop: 12, 
        padding: '12px', 
        background: '#f8f9fa', 
        borderRadius: '8px' 
      }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#666' }}>
          📷 Загруженное фото:
        </p>
        <img 
          src={fileUrl} 
          alt="Загруженное фото"
          onClick={() => setFullscreen(true)}
          onError={() => setImageError(true)}
          style={{
            maxWidth: '100%',
            maxHeight: '300px',
            borderRadius: '8px',
            cursor: 'pointer',
            objectFit: 'contain',
            background: '#fff',
            border: '1px solid #ddd'
          }}
        />
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button
            onClick={() => setFullscreen(true)}
            style={{
              flex: 1,
              background: '#6c757d',
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            🔍 Увеличить
          </button>
          <button
            onClick={handleDownload}
            style={{
              flex: 1,
              background: '#28a745',
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            📥 Скачать
          </button>
        </div>
      </div>

      {/* Полноэкранный просмотр */}
      {fullscreen && (
        <div 
          onClick={() => setFullscreen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            cursor: 'zoom-out'
          }}
        >
          <img 
            src={fileUrl} 
            alt="Полноэкранный просмотр"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
          />
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              background: '#28a745',
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            📥 Скачать фото
          </button>
          <button
            onClick={() => setFullscreen(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ✕ Закрыть
          </button>
        </div>
      )}
    </>
  );
};

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
            {pending.map((sub) => {
              const userName = `${(sub as any).user?.first_name || ''} ${(sub as any).user?.last_name || ''}`.trim();
              return (
              <div key={sub.id} className="admin-item-card block">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                  <strong>{userName || 'Пользователь'}</strong>
                  <span style={{fontSize: 12, opacity: 0.6}}>
                    {new Date(sub.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                {/* Текстовый контент (если есть) */}
                {sub.content && <p className="answer-box">{sub.content}</p>}
                
                {/* Загруженное изображение (если есть) */}
                {sub.file_url && (
                  <SubmissionImage fileUrl={sub.file_url} userName={userName || 'user'} />
                )}
                
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
            );
            })}
          </div>
        </>
      )}

      {reviewed.length > 0 && (
        <>
          <h4 style={{marginBottom: 12}}>Проверено ({reviewed.length})</h4>
          <div className="admin-list">
            {reviewed.map((sub) => {
              const userName = `${(sub as any).user?.first_name || ''} ${(sub as any).user?.last_name || ''}`.trim();
              return (
              <div key={sub.id} className="admin-item-card block">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                  <strong>{userName || 'Пользователь'}</strong>
                  <span className={`status-badge ${sub.status === 'approved' ? 'published' : 'completed'}`}>
                    {sub.status === 'approved' ? 'Принято' : 'Отклонено'}
                  </span>
                </div>
                
                {/* Текстовый контент (если есть) */}
                {sub.content && <p className="answer-box">{sub.content}</p>}
                
                {/* Загруженное изображение (если есть) */}
                {sub.file_url && (
                  <SubmissionImage fileUrl={sub.file_url} userName={userName || 'user'} />
                )}
                
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
            );
            })}
          </div>
        </>
      )}

      {submissions.length === 0 && (
        <p className="no-data">Пока нет ответов</p>
      )}
    </div>
  );
};
