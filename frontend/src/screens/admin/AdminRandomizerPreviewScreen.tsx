import React, { useEffect, useState } from 'react';
import { RandomizerDistribution, RandomizerQuestion } from '../../types';
import { randomizerApi } from '../../services/randomizerApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AdminScreens.css';

interface AdminRandomizerPreviewScreenProps {
  randomizerId: string;
  randomizer: RandomizerQuestion;
  onBack: () => void;
  onPublished: () => void;
}

export const AdminRandomizerPreviewScreen: React.FC<AdminRandomizerPreviewScreenProps> = ({
  randomizerId,
  randomizer,
  onBack,
  onPublished,
}) => {
  const { initData, showAlert } = useTelegram();
  const [distributions, setDistributions] = useState<RandomizerDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newTableNumber, setNewTableNumber] = useState<number>(1);

  useEffect(() => {
    loadPreview();
  }, [randomizerId, initData]);

  const loadPreview = async () => {
    if (!initData) return;
    try {
      setLoading(true);
      
      // Если распределение уже опубликовано, загружаем финальное распределение
      if (randomizer.status === 'distributed') {
        const finalDistributions = await randomizerApi.getDistributions(initData, randomizerId);
        setDistributions(finalDistributions as any);
      } else {
        // Пытаемся загрузить предпросмотр
        try {
          const previewData = await randomizerApi.getPreview(initData, randomizerId);
          setDistributions(previewData as any);
        } catch (error) {
          // Если предпросмотра нет, создаем его
          const createdPreview = await randomizerApi.createPreview(initData, randomizerId);
          setDistributions(createdPreview as any);
        }
      }
    } catch (error: any) {
      console.error('Error loading preview:', error);
      showAlert(error.message || 'Ошибка загрузки предпросмотра');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveParticipant = async (userId: string, currentTable: number) => {
    if (!initData) return;
    if (newTableNumber < 1 || newTableNumber > randomizer.tables_count) {
      showAlert(`Номер стола должен быть от 1 до ${randomizer.tables_count}`);
      return;
    }

    try {
      await randomizerApi.updateDistribution(initData, randomizerId, userId, newTableNumber);
      showAlert('Участник перемещен');
      setEditingUserId(null);
      loadPreview();
    } catch (error: any) {
      console.error('Error moving participant:', error);
      showAlert(error.message || 'Ошибка перемещения участника');
    }
  };

  const handlePublish = async () => {
    if (!initData) return;
    if (!confirm('Опубликовать распределение? Участникам будут отправлены уведомления.')) {
      return;
    }

    try {
      setPublishing(true);
      await randomizerApi.publishDistribution(initData, randomizerId);
      showAlert('Распределение опубликовано!');
      onPublished();
    } catch (error: any) {
      console.error('Error publishing:', error);
      showAlert(error.message || 'Ошибка публикации');
    } finally {
      setPublishing(false);
    }
  };

  // Группируем участников по столам
  const participantsByTable: Record<number, RandomizerDistribution[]> = {};
  distributions.forEach(dist => {
    if (!participantsByTable[dist.table_number]) {
      participantsByTable[dist.table_number] = [];
    }
    participantsByTable[dist.table_number].push(dist);
  });

  // Статистика
  const totalParticipants = distributions.length;
  const tablesWithParticipants = Object.keys(participantsByTable).length;
  const averagePerTable = totalParticipants > 0 ? Math.round((totalParticipants / tablesWithParticipants) * 10) / 10 : 0;

  if (loading) return <div className="loading">Загрузка предпросмотра...</div>;

  return (
    <div className="admin-screen">
      <div className="header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>Предпросмотр распределения</h3>
      </div>

      <div style={{ marginBottom: 16, padding: 12, background: '#F8F8F7', borderRadius: 8 }}>
        <h4 style={{ marginBottom: 8 }}>{randomizer.topic}</h4>
        {randomizer.description && (
          <p style={{ fontSize: 14, marginBottom: 8, opacity: 0.8 }}>{randomizer.description}</p>
        )}
        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          <span><strong>Участников:</strong> {totalParticipants}</span>
          <span><strong>Столов:</strong> {randomizer.tables_count}</span>
          <span><strong>На стол:</strong> {randomizer.participants_per_table}</span>
          <span><strong>Заполнено столов:</strong> {tablesWithParticipants}</span>
          <span><strong>Среднее на стол:</strong> {averagePerTable}</span>
        </div>
      </div>

      {/* Таблица распределения */}
      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#3E529B', color: '#FFFFFF' }}>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Стол</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Участники</th>
              <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>Количество</th>
              <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: randomizer.tables_count }, (_, i) => i + 1).map(tableNum => {
              const participants = participantsByTable[tableNum] || [];
              const isFull = participants.length >= randomizer.participants_per_table;
              const isEmpty = participants.length === 0;
              
              return (
                <tr 
                  key={tableNum}
                  style={{
                    background: isEmpty ? '#f5f5f5' : isFull ? '#e8f5e9' : '#fff3cd',
                  }}
                >
                  <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                    Стол {tableNum}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    {participants.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {participants.map(dist => {
                          const userName = dist.user
                            ? `${dist.user.last_name || ''} ${dist.user.first_name || ''} ${dist.user.middle_name || ''}`.trim() || dist.user.telegram_username || 'Неизвестно'
                            : 'Загрузка...';
                          
                          return (
                            <div key={dist.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span>{userName}</span>
                              {editingUserId === dist.user_id ? (
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                  <select
                                    value={newTableNumber}
                                    onChange={(e) => setNewTableNumber(Number(e.target.value))}
                                    style={{ fontSize: 12, padding: 2 }}
                                  >
                                    {Array.from({ length: randomizer.tables_count }, (_, i) => i + 1).map(num => (
                                      <option key={num} value={num}>Стол {num}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleMoveParticipant(dist.user_id, dist.table_number)}
                                    style={{ fontSize: 11, padding: '2px 6px' }}
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => setEditingUserId(null)}
                                    style={{ fontSize: 11, padding: '2px 6px' }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingUserId(dist.user_id);
                                    setNewTableNumber(dist.table_number);
                                  }}
                                  style={{ fontSize: 11, padding: '2px 6px', background: '#3E529B', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                  title="Переместить участника"
                                >
                                  Переместить
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ opacity: 0.5 }}>Нет участников</span>
                    )}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <span style={{
                      fontWeight: 'bold',
                      color: isFull ? '#28a745' : isEmpty ? '#999' : '#ffc107'
                    }}>
                      {participants.length} / {randomizer.participants_per_table}
                    </span>
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                    {isEmpty ? (
                      <span style={{ opacity: 0.5 }}>Пусто</span>
                    ) : isFull ? (
                      <span style={{ color: '#28a745' }}>✓ Полон</span>
                    ) : (
                      <span style={{ color: '#ffc107' }}>⚠ Неполон</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {randomizer.status !== 'distributed' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            className="create-btn"
            onClick={handlePublish}
            disabled={publishing || distributions.length === 0}
            style={{ flex: 1 }}
          >
            {publishing ? 'Публикация...' : 'Опубликовать распределение'}
          </button>
          <button
            className="back-button"
            onClick={loadPreview}
            style={{ flex: 1 }}
          >
            Обновить предпросмотр
          </button>
        </div>
      )}
      {randomizer.status === 'distributed' && (
        <div style={{ marginTop: 16, padding: 12, background: '#e8f5e9', borderRadius: 8, textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#28a745', fontWeight: 'bold' }}>
            ✓ Распределение опубликовано
          </p>
        </div>
      )}
    </div>
  );
};
