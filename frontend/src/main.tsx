import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Инициализация Telegram WebApp SDK
if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
