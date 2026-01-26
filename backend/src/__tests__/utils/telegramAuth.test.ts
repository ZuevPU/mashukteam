/**
 * Тесты для валидации Telegram initData
 * 
 * Для запуска тестов установите jest и @types/jest:
 * npm install --save-dev jest @types/jest ts-jest
 * 
 * И настройте jest.config.js
 */

import { parseInitData, validateInitData, validateInitDataHash } from '../../utils/telegramAuth';

describe('telegramAuth', () => {
  describe('parseInitData', () => {
    it('должен корректно парсить валидный initData', () => {
      const initData = 'user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Test%22%7D&auth_date=1234567890&hash=test_hash';
      const parsed = parseInitData(initData);
      
      expect(parsed).not.toBeNull();
      expect(parsed?.telegram_id).toBe(123456789);
      expect(parsed?.first_name).toBe('Test');
    });

    it('должен возвращать null для невалидного initData', () => {
      const initData = 'invalid_data';
      const parsed = parseInitData(initData);
      
      expect(parsed).toBeNull();
    });
  });

  describe('validateInitData', () => {
    it('должен проверять наличие обязательных полей', () => {
      const initData = 'user=%7B%22id%22%3A123456789%7D&auth_date=1234567890';
      const isValid = validateInitData(initData);
      
      expect(isValid).toBe(false);
    });

    it('должен проверять срок действия auth_date', () => {
      const oldDate = Math.floor((Date.now() - 25 * 60 * 60 * 1000) / 1000);
      const initData = `user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Test%22%7D&auth_date=${oldDate}&hash=test_hash`;
      const isValid = validateInitData(initData);
      
      expect(isValid).toBe(false);
    });
  });
});
