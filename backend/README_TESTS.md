# Тестирование

## Установка зависимостей для тестирования

```bash
cd backend
npm install --save-dev jest @types/jest ts-jest @types/node
```

## Настройка Jest

Создайте файл `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
};
```

## Запуск тестов

```bash
npm test
```

## Покрытие кода

```bash
npm test -- --coverage
```

## Примеры тестов

Базовые тесты находятся в `src/__tests__/`. 

Для полноценного тестирования рекомендуется добавить:
- Unit-тесты для всех сервисов (PointsService, AchievementService, LevelService)
- Интеграционные тесты для API эндпоинтов
- Тесты валидации данных
- Тесты обработки ошибок
