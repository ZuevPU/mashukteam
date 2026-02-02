import React, { useState, useEffect } from 'react';
import { Direction } from '../types';
import { useTelegram } from '../hooks/useTelegram';
import { buildApiEndpoint } from '../utils/apiUrl';
import './DirectionSelectionScreen.css';

interface DirectionSelectionScreenProps {
  onSelect: (directionSlug: string) => void;
  onSkip?: () => void;
}

export const DirectionSelectionScreen: React.FC<DirectionSelectionScreenProps> = ({ 
  onSelect, 
  onSkip 
}) => {
  const { initData, showAlert } = useTelegram();
  const [directions, setDirections] = useState<Direction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

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
    if (!selectedSlug || !initData) {
      showAlert('Не выбрано направление или отсутствуют данные авторизации');
      return;
    }

    try {
      console.log('[DirectionSelection] Sending direction selection:', { selectedSlug, hasInitData: !!initData });
      
      const response = await fetch(buildApiEndpoint('/user/direction'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, direction: selectedSlug })
      });

      console.log('[DirectionSelection] Response status:', response.status, response.statusText);

      let data;
      try {
        data = await response.json();
        console.log('[DirectionSelection] Response data:', data);
      } catch (parseError) {
        console.error('[DirectionSelection] Error parsing response:', parseError);
        const text = await response.text();
        console.error('[DirectionSelection] Response text:', text);
        showAlert('Ошибка обработки ответа сервера');
        return;
      }

      // Проверяем успешный ответ: статус 200-299 И success: true в теле
      if (response.ok && (response.status >= 200 && response.status < 300)) {
        if (data.success === true || data.success === undefined) {
          // Успешное сохранение - даже если success не указан явно, но статус OK
          console.log('[DirectionSelection] Direction saved successfully');
          onSelect(selectedSlug);
          return;
        }
      }

      // Ошибка от сервера
      const errorMessage = data.error || data.message || 'Ошибка сохранения направления';
      console.error('[DirectionSelection] Server error:', errorMessage, { status: response.status, data });
      showAlert(errorMessage);
    } catch (error: any) {
      console.error('[DirectionSelection] Network error:', error);
      showAlert(`Ошибка сохранения направления: ${error.message || 'Проверьте подключение к интернету'}`);
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
            className={`direction-card ${selectedSlug === direction.slug ? 'selected' : ''}`}
            onClick={() => setSelectedSlug(direction.slug)}
          >
            <div className="direction-radio">
              <input
                type="radio"
                name="direction"
                checked={selectedSlug === direction.slug}
                onChange={() => setSelectedSlug(direction.slug)}
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
          disabled={!selectedSlug}
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
