import React, { useEffect, useState } from 'react';
import { User, Direction, AssignmentSubmission } from '../../types';
import { adminApi } from '../../services/adminApi';
import { useTelegram } from '../../hooks/useTelegram';
import { buildApiEndpoint } from '../../utils/apiUrl';
import './AdminScreens.css';

interface TargetedAnswerWithQuestion {
  id: string;
  answer_data: any;
  created_at: string;
  question?: {
    id: string;
    text: string;
    type: string;
  };
}

interface EventNote {
  id: string;
  note_text: string;
  event_id: string;
  created_at: string;
  updated_at: string;
  event?: {
    id: string;
    title: string;
    event_date?: string;
  };
}

interface UserWithDetails extends User {
  answers: any[];
  targetedAnswers?: TargetedAnswerWithQuestion[];
  submissions?: AssignmentSubmission[];
  eventNotes?: EventNote[];
}

interface AdminUserDetailsScreenProps {
  userId: string;
  onBack: () => void;
}

export const AdminUserDetailsScreen: React.FC<AdminUserDetailsScreenProps> = ({ userId, onBack }) => {
  const { initData, showAlert } = useTelegram();
  const [user, setUser] = useState<UserWithDetails | null>(null);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDirection, setSelectedDirection] = useState('');
  
  // Фильтры и поиск
  const [answerTypeFilter, setAnswerTypeFilter] = useState<'all' | 'events' | 'diagnostics' | 'questions' | 'assignments' | 'notes'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadDetails = async () => {
    if (!initData) return;
    try {
      const [userData, directionsResponse] = await Promise.all([
        adminApi.getUserDetails(userId, initData),
        fetch(buildApiEndpoint('/directions')).then(r => r.json())
      ]);
      setUser(userData as UserWithDetails);
      setDirections(directionsResponse.directions || []);
      setSelectedDirection(userData.direction || '');
    } catch (error) {
      console.error('Error loading user details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [userId, initData]);


  const handleSaveDirection = async () => {
    if (!initData) return;
    try {
      await adminApi.setUserDirection(userId, selectedDirection, initData);
      showAlert('Направление сохранено');
      loadDetails();
    } catch (error) {
      console.error('Error saving direction:', error);
      showAlert('Ошибка сохранения');
    }
  };

  const formatAnswer = (data: any) => {
    if (Array.isArray(data)) return data.join(', ');
    return String(data);
  };

  // Фильтрация и поиск ответов
  const filterAnswers = (answers: any[], type: 'events' | 'diagnostics') => {
    if (answerTypeFilter === 'all' || answerTypeFilter === type) {
      if (!searchQuery) return answers;
      const query = searchQuery.toLowerCase();
      return answers.filter((answer: any) => {
        const answerText = formatAnswer(answer.answer_data).toLowerCase();
        const questionText = (answer.question?.text || answer.questions?.text || '').toLowerCase();
        const eventTitle = (answer.event?.title || answer.events?.title || '').toLowerCase();
        return answerText.includes(query) || questionText.includes(query) || eventTitle.includes(query);
      });
    }
    return [];
  };

  const filterTargetedAnswers = (answers: TargetedAnswerWithQuestion[]) => {
    if (answerTypeFilter === 'all' || answerTypeFilter === 'questions') {
      if (!searchQuery) return answers;
      const query = searchQuery.toLowerCase();
      return answers.filter((answer) => {
        const answerText = formatAnswer(answer.answer_data).toLowerCase();
        const questionText = (answer.question?.text || '').toLowerCase();
        return answerText.includes(query) || questionText.includes(query);
      });
    }
    return [];
  };

  const filterSubmissions = (submissions: AssignmentSubmission[]) => {
    if (answerTypeFilter === 'all' || answerTypeFilter === 'assignments') {
      if (!searchQuery) return submissions;
      const query = searchQuery.toLowerCase();
      return submissions.filter((sub) => {
        const content = (sub.content || '').toLowerCase();
        return content.includes(query);
      });
    }
    return [];
  };

  // Пагинация
  const paginate = <T,>(items: T[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const getTotalPages = (items: any[]) => Math.ceil(items.length / itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="status-badge published">✓ Принято</span>;
      case 'rejected': return <span className="status-badge completed">✗ Отклонено</span>;
      case 'pending': return <span className="status-badge draft">⏳ На проверке</span>;
      default: return <span className="status-badge">{status}</span>;
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!user) return <div className="error">Пользователь не найден</div>;

  // Получаем все ответы
  const allAnswers = user.answers || [];
  const allDiagnosticAnswers = allAnswers.filter((a: any) => a.events?.type === 'diagnostic');
  const allEventAnswers = allAnswers.filter((a: any) => a.events?.type !== 'diagnostic');
  const allTargetedAnswers = user.targetedAnswers || [];
  const allSubmissions = user.submissions || [];
  const allEventNotes = user.eventNotes || [];

  // Применяем фильтры
  const diagnosticAnswers = filterAnswers(allDiagnosticAnswers, 'diagnostics');
  const eventAnswers = filterAnswers(allEventAnswers, 'events');
  const targetedAnswers = filterTargetedAnswers(allTargetedAnswers);
  const submissions = filterSubmissions(allSubmissions);

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Профиль</h3>
      </div>

      {/* Основная информация */}
      <div className="admin-card" style={{marginBottom: 20}}>
        <h3>{user.first_name} {user.last_name}</h3>
        <p>ID: {user.telegram_id}</p>
        <p>@{user.telegram_username || 'нет username'}</p>
        <p>Статус: <strong>{user.status}</strong></p>
        <p>Баллы: <strong>{user.total_points || 0}</strong></p>
        
        <div className="form-group" style={{marginTop: 16}}>
          <label>Направление</label>
          <div style={{display: 'flex', gap: 8}}>
            <select 
              className="form-select"
              value={selectedDirection}
              onChange={(e) => setSelectedDirection(e.target.value)}
              style={{flex: 1}}
            >
              <option value="">— Не выбрано —</option>
              {directions.map(d => (
                <option key={d.id} value={d.slug}>{d.name}</option>
              ))}
            </select>
            <button 
              className="save-btn" 
              style={{marginTop: 0, padding: '0 20px'}} 
              onClick={handleSaveDirection}
            >
              OK
            </button>
          </div>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className="settings-section" style={{marginBottom: 24}}>
        <h4 style={{marginBottom: 12}}>Фильтры и поиск</h4>
        <div className="form-group">
          <label>Тип ответов:</label>
          <select
            value={answerTypeFilter}
            onChange={(e) => {
              setAnswerTypeFilter(e.target.value as 'all' | 'events' | 'diagnostics' | 'questions' | 'assignments' | 'notes');
              setCurrentPage(1);
            }}
          >
            <option value="all">Все</option>
            <option value="events">Программа обучения</option>
            <option value="diagnostics">Диагностики</option>
            <option value="questions">Вопросы</option>
            <option value="assignments">Задания</option>
            <option value="notes">Заметки</option>
          </select>
        </div>
        <div className="form-group">
          <label>Поиск:</label>
          <input
            type="text"
            placeholder="Поиск по тексту ответа..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Выполненные задания */}
      {(() => {
        const paginated = paginate(submissions);
        const totalPages = getTotalPages(submissions);
        
        return (
          <>
            <h3 style={{marginBottom: 12}}>📋 Задания ({submissions.length})</h3>
            <div className="admin-list" style={{marginBottom: 24}}>
              {paginated.length > 0 ? (
                paginated.map((sub: any) => (
                  <div key={sub.id} className="admin-item-card block">
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                      <span style={{fontWeight: 600}}>{sub.assignment?.title || 'Задание'}</span>
                      {getStatusBadge(sub.status)}
                    </div>
                    <p className="answer-box">{sub.content}</p>
                    {sub.admin_comment && (
                      <p style={{fontSize: 12, marginTop: 8, opacity: 0.7}}>
                        💬 {sub.admin_comment}
                      </p>
                    )}
                    {sub.status === 'approved' && sub.assignment?.reward && (
                      <p style={{fontSize: 12, marginTop: 4, color: '#34c759'}}>
                        ⭐ +{sub.assignment.reward}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="no-data">Нет выполненных заданий</p>
              )}
            </div>
            {totalPages > 1 && (
              <div style={{display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: 24}}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="create-btn"
                  style={{padding: '8px 16px', fontSize: '14px'}}
                >
                  ←
                </button>
                <span style={{padding: '8px 16px', display: 'flex', alignItems: 'center'}}>
                  Страница {currentPage} из {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="create-btn"
                  style={{padding: '8px 16px', fontSize: '14px'}}
                >
                  →
                </button>
              </div>
            )}
          </>
        );
      })()}

      {/* Ответы на персональные вопросы */}
      {(() => {
        const paginated = paginate(targetedAnswers);
        const totalPages = getTotalPages(targetedAnswers);
        
        return (
          <>
            <h3 style={{marginBottom: 12}}>❓ Персональные вопросы ({targetedAnswers.length})</h3>
            <div className="admin-list" style={{marginBottom: 24}}>
              {paginated.length > 0 ? (
                paginated.map((answer: TargetedAnswerWithQuestion) => (
                  <div key={answer.id} className="admin-item-card block" style={{background: 'rgba(255, 149, 0, 0.1)'}}>
                    <h4 style={{marginBottom: 8}}>{answer.question?.text || 'Вопрос'}</h4>
                    <p className="answer-box">{formatAnswer(answer.answer_data)}</p>
                    <p style={{fontSize: 11, opacity: 0.6, marginTop: 8}}>
                      {new Date(answer.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="no-data">Нет ответов</p>
              )}
            </div>
            {totalPages > 1 && (
              <div style={{display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: 24}}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="create-btn"
                  style={{padding: '8px 16px', fontSize: '14px'}}
                >
                  ←
                </button>
                <span style={{padding: '8px 16px', display: 'flex', alignItems: 'center'}}>
                  Страница {currentPage} из {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="create-btn"
                  style={{padding: '8px 16px', fontSize: '14px'}}
                >
                  →
                </button>
              </div>
            )}
          </>
        );
      })()}

      {/* Ответы на диагностику */}
      {(() => {
        const filtered = filterAnswers(diagnosticAnswers, 'diagnostics');
        const paginated = paginate(filtered);
        const totalPages = getTotalPages(filtered);
        
        return (
          <>
            <h3 style={{marginBottom: 12}}>🩺 Диагностика ({filtered.length})</h3>
            <div className="admin-list" style={{marginBottom: 24}}>
              {paginated.length > 0 ? (
                paginated.map((answer: any) => (
                  <div key={answer.id} className="admin-item-card block" style={{background: 'rgba(52, 199, 89, 0.1)'}}>
                    <p style={{fontSize: 12, opacity: 0.7, marginBottom: 4}}>
                      {answer.events?.title}
                    </p>
                    <h4 style={{marginBottom: 8}}>{answer.questions?.text}</h4>
                    <p className="answer-box">{formatAnswer(answer.answer_data)}</p>
                  </div>
                ))
              ) : (
                <p className="no-data">Диагностика не пройдена</p>
              )}
            </div>
            {totalPages > 1 && (
              <div style={{display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: 24}}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="create-btn"
                  style={{padding: '8px 16px', fontSize: '14px'}}
                >
                  ←
                </button>
                <span style={{padding: '8px 16px', display: 'flex', alignItems: 'center'}}>
                  Страница {currentPage} из {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="create-btn"
                  style={{padding: '8px 16px', fontSize: '14px'}}
                >
                  →
                </button>
              </div>
            )}
          </>
        );
      })()}

      {/* Заметки по мероприятиям */}
      {(() => {
        const filteredNotes = answerTypeFilter === 'all' || answerTypeFilter === 'notes' 
          ? (searchQuery ? allEventNotes.filter((note: EventNote) => 
              note.note_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
              note.event?.title?.toLowerCase().includes(searchQuery.toLowerCase())
            ) : allEventNotes)
          : [];
        const paginated = paginate(filteredNotes);
        const totalPages = getTotalPages(filteredNotes);
        
        return (
          <>
            <h3 style={{marginBottom: 12}}>📝 Заметки по программам ({filteredNotes.length})</h3>
            <div className="admin-list" style={{marginBottom: 24}}>
              {paginated.length > 0 ? (
                paginated.map((note: EventNote) => (
                  <div key={note.id} className="admin-item-card block">
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                      <span style={{fontWeight: 600}}>{note.event?.title || 'Программа'}</span>
                      {note.event?.event_date && (
                        <span style={{fontSize: 12, opacity: 0.6}}>
                          {new Date(note.event.event_date).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                    <p className="answer-box">{note.note_text}</p>
                    <p style={{fontSize: 11, marginTop: 8, opacity: 0.6}}>
                      Обновлено: {new Date(note.updated_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                ))
              ) : filteredNotes.length === 0 ? (
                <p className="no-data">Нет заметок</p>
              ) : null}
            </div>
            {totalPages > 1 && (
              <div style={{display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24}}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  ←
                </button>
                <span>Страница {currentPage} из {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  →
                </button>
              </div>
            )}
          </>
        );
      })()}

      {/* Ответы на мероприятия */}
      {(() => {
        const filtered = filterAnswers(eventAnswers, 'events');
        const paginated = paginate(filtered);
        const totalPages = getTotalPages(filtered);
        
        return (
          <>
            <h3 style={{marginBottom: 12}}>📅 Программа обучения ({filtered.length})</h3>
            <div className="admin-list" style={{marginBottom: 24}}>
              {paginated.length > 0 ? (
                paginated.map((answer: any) => (
                  <div key={answer.id} className="admin-item-card block">
                    <p style={{fontSize: 12, opacity: 0.7, marginBottom: 4}}>
                      {new Date(answer.created_at).toLocaleDateString()} • {answer.events?.title}
                    </p>
                    <h4 style={{marginBottom: 8}}>{answer.questions?.text}</h4>
                    <p className="answer-box">{formatAnswer(answer.answer_data)}</p>
                  </div>
                ))
              ) : (
                <p className="no-data">Нет ответов</p>
              )}
            </div>
            {totalPages > 1 && (
              <div style={{display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: 24}}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="create-btn"
                  style={{padding: '8px 16px', fontSize: '14px'}}
                >
                  ←
                </button>
                <span style={{padding: '8px 16px', display: 'flex', alignItems: 'center'}}>
                  Страница {currentPage} из {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="create-btn"
                  style={{padding: '8px 16px', fontSize: '14px'}}
                >
                  →
                </button>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
};
