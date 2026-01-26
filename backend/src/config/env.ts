// Загрузка переменных окружения - этот файл должен импортироваться первым
import dotenv from 'dotenv';

// Загружаем .env файл из корня backend директории (где запускается процесс)
dotenv.config();

// Экспортируем переменные для удобства
export const env = {
  PORT: process.env.PORT || '3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
