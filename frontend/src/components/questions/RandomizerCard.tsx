import React, { useState, useEffect } from 'react';
import { RandomizerQuestion, RandomizerDistribution } from '../../types';
import { randomizerApi } from '../../services/randomizerApi';
import { useTelegram } from '../../hooks/useTelegram';
import './RandomizerCard.css';

interface RandomizerCardProps {
  questionId: string;
  randomizerId: string;
}

export const RandomizerCard: React.FC<RandomizerCardProps> = ({ questionId, randomizerId }) => {
  const { initData, showAlert } = useTelegram();
  const [loading, setLoading] = useState(true);
  const [randomizer, setRandomizer] = useState<RandomizerQuestion | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [distribution, setDistribution] = useState<RandomizerDistribution | null>(null);
  const [participating, setParticipating] = useState(false);

  useEffect(() => {
    loadRandomizer();
  }, [randomizerId, initData]);

  const loadRandomizer = async () => {
    if (!initData) return;
    setLoading(true);
    try {
      const data = await randomizerApi.getRandomizer(initData, randomizerId);
      setRandomizer(data.randomizer);
      setIsParticipant(data.isParticipant);
      setDistribution(data.distribution || null);
    } catch (error: any) {
      console.error('Error loading randomizer:', error);
      showAlert('Ошибка загрузки случайного числа');
    } finally {
      setLoading(false);
    }
  };

  const handleParticipate = async () => {
    if (!initData || !randomizerId) return;
    setParticipating(true);
    try {
      await randomizerApi.participate(initData, randomizerId);
      showAlert('Вы участвуете в распределении!');
      loadRandomizer();
    } catch (error: any) {
      console.error('Error participating:', error);
      showAlert(error.message || 'Ошибка участия');
    } finally {
      setParticipating(false);
    }
  };

  if (loading) {
    return <div className="randomizer-card loading">Загрузка...</div>;
  }

  if (!randomizer) {
    return null;
  }

  return (
    <div className="randomizer-card">
      <div className="randomizer-header">
        <h3 className="randomizer-topic">{randomizer.topic}</h3>
        <span className={`randomizer-status randomizer-status-${randomizer.status}`}>
          {randomizer.status === 'open' ? 'Открыт' : randomizer.status === 'distributed' ? 'Распределен' : 'Закрыт'}
        </span>
      </div>

      {randomizer.description && (
        <p className="randomizer-description">{randomizer.description}</p>
      )}

      <div className="randomizer-info">
        <div className="randomizer-info-item">
          <span className="randomizer-info-label">Столов:</span>
          <span className="randomizer-info-value">{randomizer.tables_count}</span>
        </div>
        <div className="randomizer-info-item">
          <span className="randomizer-info-label">Участников на стол:</span>
          <span className="randomizer-info-value">{randomizer.participants_per_table}</span>
        </div>
      </div>

      {randomizer.status === 'distributed' && distribution && (
        <div className="randomizer-result">
          <div className="randomizer-result-badge">
            <span className="randomizer-result-icon">🎲</span>
            <div>
              <div className="randomizer-result-label">Ваш стол</div>
              <div className="randomizer-result-table">№{distribution.table_number}</div>
            </div>
          </div>
        </div>
      )}

      {randomizer.status === 'open' && !isParticipant && (
        <button
          className="randomizer-participate-btn"
          onClick={handleParticipate}
          disabled={participating}
        >
          {participating ? 'Участвую...' : 'Участвую'}
        </button>
      )}

      {randomizer.status === 'open' && isParticipant && (
        <div className="randomizer-participant-status">
          <span className="randomizer-participant-icon">✅</span>
          <span>Вы участвуете. Ожидайте распределения.</span>
        </div>
      )}
    </div>
  );
};
