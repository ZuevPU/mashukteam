import { useState, useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { registerUser } from '../services/api';
import './RegistrationScreen.css';

interface RegistrationScreenProps {
  onComplete: () => void;
}

/**
 * Экран регистрации - простая форма с ФИО
 */
export function RegistrationScreen({ onComplete }: RegistrationScreenProps) {
  const { webApp, initData } = useTelegram();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Данные регистрации
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');

  // Получение имени из Telegram при загрузке
  useEffect(() => {
    if (webApp?.initDataUnsafe?.user?.first_name && !firstName) {
      setFirstName(webApp.initDataUnsafe.user.first_name);
    }
  }, [webApp, firstName]);

  const handleSubmit = async () => {
    // Валидация
    if (!firstName.trim()) {
      setError('Пожалуйста, введите имя');
      return;
    }

    if (!lastName.trim()) {
      setError('Пожалуйста, введите фамилию');
      return;
    }

    if (!initData) {
      setError('Ошибка: не удалось получить данные Telegram');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await registerUser(initData, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        middle_name: middleName.trim() || undefined,
      });

      // Регистрация успешна
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Ошибка при регистрации. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-screen">
      <div className="registration-container">
        <div className="registration-step">
          <h2 className="step-title">Регистрация</h2>
          <p className="step-description">
            Пожалуйста, введите ваше полное имя
          </p>
          
          <input
            type="text"
            className="registration-input"
            placeholder="Фамилия *"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoFocus
            disabled={loading}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && lastName.trim() && firstName.trim()) {
                handleSubmit();
              }
            }}
          />
          
          <input
            type="text"
            className="registration-input"
            placeholder="Имя *"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={loading}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && lastName.trim() && firstName.trim()) {
                handleSubmit();
              }
            }}
          />
          
          <input
            type="text"
            className="registration-input"
            placeholder="Отчество (необязательно)"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
            disabled={loading}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && lastName.trim() && firstName.trim()) {
                handleSubmit();
              }
            }}
          />
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="step-buttons">
            <button
              className="step-button step-button-primary"
              onClick={handleSubmit}
              disabled={loading || !firstName.trim() || !lastName.trim()}
            >
              {loading ? 'Отправка...' : 'Завершить регистрацию'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
