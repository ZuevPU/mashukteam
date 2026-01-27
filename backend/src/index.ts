// Загрузка переменных окружения ДО всех импортов
import './config/env';

import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS настройки - разрешаем запросы с любого origin для Telegram Mini Apps
// В production можно ограничить конкретными доменами
const corsOptions = {
  origin: true, // Разрешаем все origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400, // 24 часа для preflight кеша
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Явная обработка OPTIONS запросов (preflight)
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting для всех API запросов
app.use('/api', apiRateLimiter);

// Логирование запросов
import { logger } from './utils/logger';

// Игнорируем запросы к статическим файлам (favicon, robots.txt и т.д.)
app.use((req, res, next) => {
  // Игнорируем запросы к статическим файлам
  if (
    req.path.startsWith('/favicon') ||
    req.path.startsWith('/robots.txt') ||
    req.path.startsWith('/.well-known') ||
    req.path.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/i)
  ) {
    return res.status(204).end(); // No Content
  }
  
  // Логируем только не-OPTIONS запросы
  if (req.method !== 'OPTIONS') {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
  next();
});

// API маршруты
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Обработка 404
app.use(notFoundHandler);

// Централизованная обработка ошибок
app.use(errorHandler);

// Экспорт для Vercel serverless
export default app;

// Запуск сервера только в development
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Backend сервер запущен на порту ${PORT}`);
    console.log(`📡 API доступен по адресу: http://localhost:${PORT}/api`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  });
}
