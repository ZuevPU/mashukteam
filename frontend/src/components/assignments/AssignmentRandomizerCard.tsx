import React, { useEffect, useState } from 'react';
import { Assignment, RandomizerQuestion, RandomizerDistribution } from '../../types';
import { assignmentApi, RandomizerForUserResponse } from '../../services/assignmentApi';
import { useTelegram } from '../../hooks/useTelegram';
import './AssignmentRandomizerCard.css';

interface AssignmentRandomizerCardProps {
  assignment: Assignment;
}

export const AssignmentRandomizerCard: React.FC<AssignmentRandomizerCardProps> = ({ assignment }) => {
  const { initData, showAlert } = useTelegram();
  const [loading, setLoading] = useState(true);
  const [participating, setParticipating] = useState(false);
  const [randomizerData, setRandomizerData] = useState<RandomizerForUserResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRandomizer = async () => {
      if (!initData) return;
      try {
        const data = await assignmentApi.getRandomizerByAssignment(assignment.id, initData);
        setRandomizerData(data);
      } catch (err) {
        console.error('Error loading randomizer:', err);
        setError('Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    };
    loadRandomizer();
  }, [assignment.id, initData]);

  const handleParticipate = async () => {
    if (!initData || !randomizerData) return;
    setParticipating(true);
    try {
      await assignmentApi.participateInRandomNumber(assignment.id, initData);
      showAlert('Вы зарегистрированы на участие!');
      // Обновляем данные
      const data = await assignmentApi.getRandomizerByAssignment(assignment.id, initData);
      setRandomizerData(data);
    } catch (err: any) {
      console.error('Error participating:', err);
      showAlert(err.message || 'Ошибка регистрации');
    } finally {
      setParticipating(false);
    }
  };

  if (loading) {
    return (
      <div className="assignment-randomizer-card">
        <div className="loading-state">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="assignment-randomizer-card error">
        <p>{error}</p>
      </div>
    );
  }

  const randomizer = randomizerData?.randomizer;
  const isParticipant = randomizerData?.isParticipant || false;
  const distribution = randomizerData?.distribution;
  const participantsCount = randomizerData?.participantsCount || 0;

  const isSimpleMode = randomizer?.randomizer_mode === 'simple';
  const isDistributed = randomizer?.status === 'distributed';

  return (
    <div className={`assignment-randomizer-card ${isDistributed ? 'distributed' : ''}`}>
      <div className="card-header">
        <span className="reward-badge">⭐ {assignment.reward}</span>
        <span className={`status-badge ${randomizer?.status}`}>
          {randomizer?.status === 'open' && '🟢 Открыто'}
          {randomizer?.status === 'closed' && '🟡 Закрыто'}
          {randomizer?.status === 'distributed' && '✅ Завершено'}
        </span>
      </div>

      <h4 className="card-title">{assignment.title}</h4>
      {assignment.description && (
        <p className="card-description">{assignment.description}</p>
      )}

      <div className="card-info">
        {isSimpleMode ? (
          <span className="info-item">
            🔢 Диапазон: {randomizer?.number_min} - {randomizer?.number_max}
          </span>
        ) : (
          <>
            <span className="info-item">🪑 Столов: {randomizer?.tables_count}</span>
            <span className="info-item">👥 На стол: {randomizer?.participants_per_table}</span>
          </>
        )}
        <span className="info-item">📝 Участников: {participantsCount}</span>
      </div>

      {/* Показываем результат, если распределение завершено */}
      {isDistributed && distribution && (
        <div className="result-block">
          {isSimpleMode ? (
            <>
              <span className="result-label">Ваше число:</span>
              <span className="result-value">{distribution.random_number}</span>
            </>
          ) : (
            <>
              <span className="result-label">Ваш стол:</span>
              <span className="result-value">{distribution.table_number}</span>
            </>
          )}
        </div>
      )}

      {/* Показываем кнопку участия, если открыто и не участвует */}
      {randomizer?.status === 'open' && !isParticipant && (
        <button 
          className="participate-btn" 
          onClick={handleParticipate}
          disabled={participating}
        >
          {participating ? 'Регистрация...' : '🎲 Участвовать'}
        </button>
      )}

      {/* Показываем статус участия */}
      {isParticipant && !isDistributed && (
        <div className="participation-status">
          ✅ Вы зарегистрированы. Ожидайте результатов.
        </div>
      )}
    </div>
  );
};
