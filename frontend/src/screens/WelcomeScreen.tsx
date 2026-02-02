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
        <h1 className="welcome-title">Привет! 👋</h1>
        <div className="welcome-text">
          <p>Я - твой дружелюбный сосед по программе «Команда «Машука».</p>
          <p>Я рядом на протяжении всей программы и помогаю:</p>
          <ul className="welcome-list">
            <li>сориентироваться в событиях дня,</li>
            <li>вовремя остановиться и зафиксировать мысли,</li>
            <li>выполнить небольшие задания по ходу работы,</li>
            <li>собрать твой личный путь участия и рефлексии.</li>
          </ul>
          <p>Моя задача - быть рядом, чтобы важное не потерялось в общем потоке событий.</p>
        </div>
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
