/**
 * Throttling механизм для проверки запланированного контента
 * Предотвращает слишком частые проверки (не чаще раза в минуту)
 */

const THROTTLE_INTERVAL_MS = 60 * 1000; // 1 минута

let lastCheckTimestamp: number = 0;

export class SchedulerThrottle {
  /**
   * Проверяет, нужно ли выполнить проверку запланированного контента
   * @returns true если прошло достаточно времени с последней проверки
   */
  static shouldCheck(): boolean {
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckTimestamp;
    
    return timeSinceLastCheck >= THROTTLE_INTERVAL_MS;
  }

  /**
   * Отмечает, что проверка была выполнена
   */
  static markChecked(): void {
    lastCheckTimestamp = Date.now();
  }

  /**
   * Получает время до следующей возможной проверки (в миллисекундах)
   */
  static getTimeUntilNextCheck(): number {
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckTimestamp;
    return Math.max(0, THROTTLE_INTERVAL_MS - timeSinceLastCheck);
  }
}
