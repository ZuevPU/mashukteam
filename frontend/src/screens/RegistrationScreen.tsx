import { useState, useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { registerUser } from '../services/api';
import './RegistrationScreen.css';

interface RegistrationScreenProps {
  onComplete: () => void;
}

type RegistrationStep = 1 | 2 | 3;

/**
 * Экран регистрации с пошаговым заполнением
 */
export function RegistrationScreen({ onComplete }: RegistrationScreenProps) {
  const { webApp, initData } = useTelegram();
  const [step, setStep] = useState<RegistrationStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Данные регистрации
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [motivation, setMotivation] = useState('');

  // Получение имени из Telegram при загрузке
  useEffect(() => {
    if (webApp?.initDataUnsafe?.user?.first_name && !firstName) {
      setFirstName(webApp.initDataUnsafe.user.first_name);
    }
  }, [webApp, firstName]);

  const handleNext = () => {
    if (step === 1) {
      if (!firstName.trim()) {
        setError('Пожалуйста, введите имя');
        return;
      }
      setStep(2);
      setError(null);
    } else if (step === 2) {
      if (!lastName.trim()) {
        setError('Пожалуйста, введите фамилию');
        return;
      }
      setStep(3);
      setError(null);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as RegistrationStep);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!motivation.trim() || motivation.length < 10) {
      setError('Мотивация должна содержать минимум 10 символов');
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
        motivation: motivation.trim(),
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
        {/* Прогресс-бар */}
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Шаг 1: Имя */}
        {step === 1 && (
          <div className="registration-step">
            <h2 className="step-title">Шаг 1: Ваше имя</h2>
            <p className="step-description">
              Мы уже подставили ваше имя из Telegram. Вы можете изменить его, если нужно.
            </p>
            <input
              type="text"
              className="registration-input"
              placeholder="Имя"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoFocus
            />
            {error && <div className="error-message">{error}</div>}
            <div className="step-buttons">
              <button
                className="step-button step-button-primary"
                onClick={handleNext}
              >
                Далее
              </button>
            </div>
          </div>
        )}

        {/* Шаг 2: ФИО */}
        {step === 2 && (
          <div className="registration-step">
            <h2 className="step-title">Шаг 2: Полное имя</h2>
            <p className="step-description">
              Пожалуйста, введите ваше полное имя.
            </p>
            <input
              type="text"
              className="registration-input"
              placeholder="Фамилия *"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoFocus
            />
            <input
              type="text"
              className="registration-input"
              placeholder="Имя *"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              type="text"
              className="registration-input"
              placeholder="Отчество (необязательно)"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
            />
            {error && <div className="error-message">{error}</div>}
            <div className="step-buttons">
              <button
                className="step-button step-button-secondary"
                onClick={handleBack}
              >
                Назад
              </button>
              <button
                className="step-button step-button-primary"
                onClick={handleNext}
              >
                Далее
              </button>
            </div>
          </div>
        )}

        {/* Шаг 3: Мотивация */}
        {step === 3 && (
          <div className="registration-step">
            <h2 className="step-title">Шаг 3: Мотивация</h2>
            <p className="step-description">
              Расскажите, почему вы хотите участвовать в программе?
            </p>
            <textarea
              className="registration-textarea"
              placeholder="Ваша мотивация (минимум 10 символов)"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              rows={6}
              autoFocus
            />
            <div className="character-count">
              {motivation.length} / минимум 10 символов
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="step-buttons">
              <button
                className="step-button step-button-secondary"
                onClick={handleBack}
                disabled={loading}
              >
                Назад
              </button>
              <button
                className="step-button step-button-primary"
                onClick={handleSubmit}
                disabled={loading || motivation.length < 10}
              >
                {loading ? 'Отправка...' : 'Завершить регистрацию'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
