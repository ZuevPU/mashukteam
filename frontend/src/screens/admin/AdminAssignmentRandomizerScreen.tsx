import React, { useEffect, useState } from 'react';
import { RandomizerDistribution } from '../../types';
import { adminApi } from '../../services/adminApi';
import { RandomizerParticipantsResponse } from '../../services/assignmentApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css';

interface AdminAssignmentRandomizerScreenProps {
  assignmentId: string;
  onBack: () => void;
}

type ViewMode = 'participants' | 'preview';

export const AdminAssignmentRandomizerScreen: React.FC<AdminAssignmentRandomizerScreenProps> = ({ 
  assignmentId, onBack 
}) => {
  const { initData, showAlert } = useTelegram();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('participants');
  const [participantsData, setParticipantsData] = useState<RandomizerParticipantsResponse | null>(null);
  const [distributions, setDistributions] = useState<RandomizerDistribution[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadData = async () => {
    if (!initData) return;
    setLoading(true);
    try {
      const data = await adminApi.getRandomizerParticipants(assignmentId, initData);
      setParticipantsData(data);

      // Если уже есть распределение, загружаем его
      if (data.randomizer?.status === 'distributed' || distributions.length > 0) {
        const previewData = await adminApi.getRandomizerPreview(assignmentId, initData);
        setDistributions(previewData.distributions);
      }
    } catch (error) {
      console.error('Error loading randomizer data:', error);
      showAlert('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [assignmentId, initData]);

  const handleGeneratePreview = async () => {
    if (!initData) return;
    setGenerating(true);
    try {
      const result = await adminApi.previewRandomizerDistribution(assignmentId, initData);
      setDistributions(result);
      setViewMode('preview');
      showAlert('Распределение сгенерировано! Проверьте и опубликуйте результаты.');
    } catch (error: any) {
      console.error('Error generating preview:', error);
      showAlert(error.message || 'Ошибка генерации');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!initData) return;
    
    const confirmMessage = `Подвести итоги?\n\nУчастники получат уведомления с номером стола. Звёздочки будут начислены.`;
    
    if (!confirm(confirmMessage)) return;
    
    setPublishing(true);
    try {
      const result = await adminApi.publishRandomizerDistribution(assignmentId, initData);
      showAlert(`Итоги подведены! Участникам отправлены уведомления. Начислено звёздочек: ${result.awardedCount}`);
      await loadData();
    } catch (error: any) {
      console.error('Error publishing:', error);
      showAlert(error.message || 'Ошибка публикации');
    } finally {
      setPublishing(false);
    }
  };

  const handleUpdateTable = async (userId: string, newTable: number) => {
    if (!initData) return;
    try {
      await adminApi.updateRandomizerDistribution(assignmentId, userId, newTable, initData);
      // Обновляем локально
      setDistributions(prev => 
        prev.map(d => d.user_id === userId ? { ...d, table_number: newTable } : d)
      );
    } catch (error: any) {
      showAlert(error.message || 'Ошибка обновления');
    }
  };

  if (loading && !participantsData) {
    return (
      <div className="admin-screen">
        <div className="header">
          <button onClick={onBack} className="back-button">← Назад</button>
          <h3>Случайное число</h3>
        </div>
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  const randomizer = participantsData?.randomizer;
  const participants = participantsData?.participants || [];
  const isSimpleMode = randomizer?.randomizer_mode === 'simple';
  const isDistributed = randomizer?.status === 'distributed';

  // Группировка по столам
  const byTables = distributions.reduce((acc, d) => {
    const key = d.table_number;
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {} as Record<number, RandomizerDistribution[]>);

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Случайное число</h3>
      </div>

      {/* Статистика */}
      <div className="stats-row" style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="stat-item" style={{ flex: 1, minWidth: 100, background: 'var(--tg-theme-secondary-bg-color)', padding: '12px', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{participantsData?.participantsCount || 0}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Участников</div>
        </div>
        {!isSimpleMode && (
          <>
            <div className="stat-item" style={{ flex: 1, minWidth: 100, background: 'var(--tg-theme-secondary-bg-color)', padding: '12px', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{randomizer?.tables_count || 0}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Столов</div>
            </div>
            <div className="stat-item" style={{ flex: 1, minWidth: 100, background: 'var(--tg-theme-secondary-bg-color)', padding: '12px', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{randomizer?.participants_per_table || 0}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>На стол</div>
            </div>
          </>
        )}
        {isSimpleMode && (
          <div className="stat-item" style={{ flex: 1, minWidth: 100, background: 'var(--tg-theme-secondary-bg-color)', padding: '12px', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{randomizer?.number_min}-{randomizer?.number_max}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Диапазон</div>
          </div>
        )}
        <div className="stat-item" style={{ flex: 1, minWidth: 100, background: isDistributed ? '#e8f5e9' : '#fff3e0', padding: '12px', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24 }}>{isDistributed ? '✅' : '🟡'}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{isDistributed ? 'Завершено' : 'Открыто'}</div>
        </div>
      </div>

      {/* Переключатель режима */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button 
          className={`tab-btn ${viewMode === 'participants' ? 'active' : ''}`}
          onClick={() => setViewMode('participants')}
          style={{ flex: 1, padding: 10, border: 'none', borderRadius: 8, background: viewMode === 'participants' ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)', color: viewMode === 'participants' ? '#fff' : 'inherit', cursor: 'pointer' }}
        >
          👥 Участники
        </button>
        <button 
          className={`tab-btn ${viewMode === 'preview' ? 'active' : ''}`}
          onClick={() => setViewMode('preview')}
          style={{ flex: 1, padding: 10, border: 'none', borderRadius: 8, background: viewMode === 'preview' ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)', color: viewMode === 'preview' ? '#fff' : 'inherit', cursor: 'pointer' }}
        >
          {isSimpleMode ? '🔢 Числа' : '🪑 Столы'}
        </button>
      </div>

      {/* Список участников */}
      {viewMode === 'participants' && (
        <div className="admin-list">
          {participants.length === 0 ? (
            <p className="no-data">Нет участников</p>
          ) : (
            participants.map((p) => (
              <div key={p.id} className="admin-item-card" style={{ padding: '12px' }}>
                <div className="item-info">
                  <h4 style={{ margin: 0 }}>
                    {p.user?.last_name} {p.user?.first_name} {p.user?.middle_name || ''}
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.7 }}>
                    @{p.user?.telegram_username || 'N/A'} • {new Date(p.participated_at).toLocaleString('ru-RU')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Предпросмотр/результаты */}
      {viewMode === 'preview' && (
        <div className="admin-list">
          {distributions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <p className="no-data">Распределение ещё не сгенерировано</p>
              {!isDistributed && participants.length > 0 && (
                <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>
                  Нажмите кнопку ниже, чтобы случайно распределить {participants.length} участников по столам
                </p>
              )}
            </div>
          ) : isSimpleMode ? (
            // Простой режим: список с числами
            distributions.map((d) => (
              <div key={d.id} className="admin-item-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0 }}>{d.user?.last_name} {d.user?.first_name}</h4>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--tg-theme-link-color)' }}>
                  {d.random_number}
                </div>
              </div>
            ))
          ) : (
            // Режим столов: группировка
            Object.entries(byTables)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([tableNum, tableDistributions]) => (
                <div key={tableNum} style={{ marginBottom: 16 }}>
                  <h4 style={{ margin: '0 0 8px', padding: '8px', background: 'var(--tg-theme-secondary-bg-color)', borderRadius: 8 }}>
                    🪑 Стол {tableNum} ({tableDistributions.length})
                  </h4>
                  {tableDistributions.map((d) => (
                    <div key={d.id} className="admin-item-card" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{d.user?.last_name} {d.user?.first_name}</span>
                      {!isDistributed && (
                        <select
                          value={d.table_number}
                          onChange={(e) => handleUpdateTable(d.user_id, Number(e.target.value))}
                          style={{ padding: '4px 8px', borderRadius: 4 }}
                        >
                          {Array.from({ length: randomizer?.tables_count || 20 }, (_, i) => i + 1).map(n => (
                            <option key={n} value={n}>Стол {n}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              ))
          )}
        </div>
      )}

      {/* Кнопки действий - показываем если есть участники и не завершено */}
      {!isDistributed && participants.length > 0 && (
        <div style={{ position: 'sticky', bottom: 0, padding: '16px', background: 'var(--tg-theme-bg-color)', borderTop: '1px solid var(--tg-theme-secondary-bg-color)' }}>
          {distributions.length === 0 ? (
            // Нет распределения - показываем кнопку генерации
            <button 
              className="create-btn" 
              onClick={handleGeneratePreview}
              disabled={generating}
              style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            >
              {generating ? '⏳ Генерация...' : '🎲 Сгенерировать распределение'}
            </button>
          ) : (
            // Есть распределение - показываем кнопки управления
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button 
                className="create-btn" 
                onClick={handlePublish}
                disabled={publishing}
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  fontSize: '16px',
                  background: '#28a745'
                }}
              >
                {publishing ? '⏳ Публикация...' : '✅ Подвести итоги и уведомить участников'}
              </button>
              <button 
                className="create-btn" 
                onClick={handleGeneratePreview}
                disabled={generating}
                style={{ width: '100%', background: '#666', fontSize: '14px' }}
              >
                {generating ? '⏳ Генерация...' : '🔄 Перегенерировать распределение'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Предупреждение если нет участников */}
      {!isDistributed && participants.length === 0 && (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          background: '#fff3cd', 
          borderRadius: '8px',
          marginTop: '16px'
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>
            ⚠️ Нет участников для распределения. Дождитесь, пока пользователи нажмут кнопку "Участвую".
          </p>
        </div>
      )}

      {/* Результаты если уже завершено */}
      {isDistributed && (
        <div style={{ 
          padding: '16px', 
          textAlign: 'center', 
          background: '#d4edda', 
          borderRadius: '8px',
          marginTop: '16px'
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#155724' }}>
            ✅ Распределение завершено. Участники получили уведомления с результатами.
          </p>
        </div>
      )}
    </div>
  );
};
