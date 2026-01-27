import { useTelegram } from '../hooks/useTelegram';
import './WelcomeScreen.css';

interface WelcomeScreenProps {
  onStartRegistration: () => void;
}

/**
 * Экран приветствия для новых пользователей
 */
export function WelcomeScreen({ onStartRegistration }: WelcomeScreenProps) {
  useTelegram();

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1 className="welcome-title">Добро пожаловать! 👋</h1>
        <p className="welcome-text">
          Мы рады видеть вас в нашей программе.
          Давайте начнём с небольшой регистрации.
        </p>
        <button
          className="welcome-button"
          onClick={onStartRegistration}
        >
          Начать регистрацию
        </button>
      </div>
    </div>
  );
}
