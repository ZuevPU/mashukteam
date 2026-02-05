import { useState, useEffect } from 'react';
import { useTelegram } from './hooks/useTelegram';
import { verifyAuth } from './services/api';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { RegistrationScreen } from './screens/RegistrationScreen';
import { BentoMenuScreen } from './screens/BentoMenuScreen';
import { PWAPrompt } from './components/pwa/PWAPrompt';
import './App.css';

type AppScreen = 'loading' | 'welcome' | 'registration' | 'bento';

/**
 * Главный компонент приложения
 * Управляет навигацией между экранами на основе статуса пользователя
 */
function App() {
  const { initData, isReady } = useTelegram();
  const [screen, setScreen] = useState<AppScreen>('loading');
  const [, setUserStatus] = useState<'new' | 'registered' | null>(null);

  // Проверка статуса пользователя при загрузке
  useEffect(() => {
    if (!isReady) return;

    const checkUserStatus = async () => {
      if (!initData) {
        console.warn('initData не доступен. Режим разработки.');
        // В режиме разработки переходим на welcome
        setScreen('welcome');
        return;
      }

      try {
        // Проверяем аутентификацию и получаем статус пользователя
        const response = await verifyAuth(initData);
        
        if (response.success && response.user) {
          // Нормализуем статус: если не 'registered', считаем 'new'
          const status = (response.user.status === 'registered' ? 'registered' : 'new') as 'new' | 'registered';
          setUserStatus(status);

          console.log('User status:', status, 'user:', response.user);

          if (status === 'registered') {
            // Пользователь уже зарегистрирован - показываем меню
            setScreen('bento');
          } else {
            // Новый пользователь или статус не 'registered' - показываем приветствие
            setScreen('welcome');
          }
        } else {
          console.warn('verifyAuth returned unsuccessful response:', response);
          setScreen('welcome');
        }
      } catch (error) {
        console.error('Ошибка при проверке статуса пользователя:', error);
        // В случае ошибки показываем welcome экран
        setScreen('welcome');
      }
    };

    checkUserStatus();
  }, [isReady, initData]);

  const handleStartRegistration = () => {
    setScreen('registration');
  };

  const handleRegistrationComplete = () => {
    setUserStatus('registered');
    setScreen('bento');
  };

  // Экран загрузки
  if (screen === 'loading') {
    return (
      <div className="app-loading">
        <div className="loading-spinner">⏳</div>
        <p>Загрузка...</p>
      </div>
    );
  }

  // Рендер соответствующего экрана
  return (
    <div className="app">
      {screen === 'welcome' && (
        <WelcomeScreen onStartRegistration={handleStartRegistration} />
      )}
      {screen === 'registration' && (
        <RegistrationScreen onComplete={handleRegistrationComplete} />
      )}
      {screen === 'bento' && <BentoMenuScreen />}
      
      {/* PWA промпты */}
      <PWAPrompt />
    </div>
  );
}

export default App;
