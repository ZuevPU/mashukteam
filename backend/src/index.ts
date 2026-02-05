// Загрузка переменных окружения ДО всех импортов
import './config/env';

import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';
import { cacheService } from './services/cacheService';
import { queueService } from './services/queueService';
import { initSentry, sentryRequestHandler, sentryErrorHandler } from './utils/sentry';

// Инициализация Sentry (должна быть до создания app)
initSentry();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS настройки - разрешаем запросы с любого origin для Telegram Mini Apps
// В production можно ограничить конкретными доменами
const corsOptions = {
  origin: true, // Разрешаем все origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Telegram-Init-Data', 'x-init-data'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400, // 24 часа для preflight кеша
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Явная обработка OPTIONS запросов (preflight) - ДО других middleware
// Это критично для CORS preflight запросов
app.options('*', (req, res) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Telegram-Init-Data, x-init-data');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

app.use(cors(corsOptions));

// Sentry request handler - должен быть первым middleware после CORS
app.use(sentryRequestHandler);

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
  
  // Логируем только не-OPTIONS запросы и только в development
  if (req.method !== 'OPTIONS' && process.env.NODE_ENV === 'development') {
    logger.debug(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
  next();
});

// API маршруты
app.use('/api', routes);

// Health check с информацией о кэше и очередях
app.get('/health', async (req, res) => {
  const cacheStats = await cacheService.getStats();
  const queueStats = await queueService.getStats();
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    cache: cacheStats ? { 
      available: true, 
      keys: cacheStats.keys,
      memory: cacheStats.memory 
    } : { available: false },
    queues: queueService.isAvailable() ? queueStats : { available: false }
  });
});

// Обработка 404
app.use(notFoundHandler);

// Sentry error handler - должен быть перед другими error handlers
app.use(sentryErrorHandler);

// Централизованная обработка ошибок
app.use(errorHandler);

// Экспорт для Vercel serverless
export default app;

// Запуск сервера только в development
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  // Инициализация сервисов перед запуском сервера
  Promise.all([
    cacheService.connect(),
    queueService.initialize()
  ]).then(async () => {
    // Запускаем воркеры очередей (не в Vercel, т.к. serverless)
    await queueService.startWorkers();
    
    app.listen(PORT, () => {
      // Логи запуска сервера всегда показываем
      console.log(`🚀 Backend сервер запущен на порту ${PORT}`);
      console.log(`📡 API доступен по адресу: http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`📦 Кэширование: ${cacheService.isAvailable() ? 'включено' : 'отключено'}`);
      console.log(`📋 Очереди задач: ${queueService.isAvailable() ? 'включены' : 'отключены'}`);
    });
  });
} else {
  // Для Vercel - инициализация при старте (без воркеров)
  Promise.all([
    cacheService.connect(),
    queueService.initialize()
  ]).catch(() => {});
}
