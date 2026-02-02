import React, { useState, useEffect } from 'react';
import { Direction } from '../types';
import { useTelegram } from '../hooks/useTelegram';
import { buildApiEndpoint } from '../utils/apiUrl';
import './DirectionSelectionScreen.css';

interface DirectionSelectionScreenProps {
  onSelect: (directionId: string) => void;
  onSkip?: () => void;
}

export const DirectionSelectionScreen: React.FC<DirectionSelectionScreenProps> = ({ 
  onSelect, 
  onSkip 
}) => {
  const { initData, showAlert } = useTelegram();
  const [directions, setDirections] = useState<Direction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const loadDirections = async () => {
      try {
        const response = await fetch(buildApiEndpoint('/directions'));
        if (response.ok) {
          const data = await response.json();
          if (data.directions) {
            setDirections(data.directions);
          }
        }
      } catch (error) {
        console.error('Error loading directions:', error);
        showAlert('Ошибка загрузки направлений');
      } finally {
        setLoading(false);
      }
    };
    loadDirections();
  }, []);

  const handleSelect = async () => {
    if (!selectedId || !initData) return;

    try {
      const response = await fetch(buildApiEndpoint('/user/direction'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, direction_id: selectedId })
      });

      if (response.ok) {
        onSelect(selectedId);
      } else {
        showAlert('Ошибка сохранения направления');
      }
    } catch (error) {
      console.error('Error setting direction:', error);
      showAlert('Ошибка сохранения направления');
    }
  };

  if (loading) {
    return (
      <div className="direction-selection-screen">
        <div className="loading">Загрузка направлений...</div>
      </div>
    );
  }

  return (
    <div className="direction-selection-screen">
      <div className="direction-header">
        <h2>Выберите направление</h2>
        <p className="direction-subtitle">
          Выберите направление, которое вам интересно. Вы сможете изменить его позже.
        </p>
      </div>

      <div className="directions-list">
        {directions.map((direction) => (
          <div
            key={direction.id}
            className={`direction-card ${selectedId === direction.id ? 'selected' : ''}`}
            onClick={() => setSelectedId(direction.id)}
          >
            <div className="direction-radio">
              <input
                type="radio"
                name="direction"
                checked={selectedId === direction.id}
                onChange={() => setSelectedId(direction.id)}
              />
            </div>
            <div className="direction-content">
              <h3>{direction.name}</h3>
              {direction.description && (
                <p className="direction-description">{direction.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="direction-actions">
        <button
          className="direction-select-btn"
          onClick={handleSelect}
          disabled={!selectedId}
        >
          Выбрать
        </button>
        {onSkip && (
          <button className="direction-skip-btn" onClick={onSkip}>
            Пропустить
          </button>
        )}
      </div>
    </div>
  );
};
