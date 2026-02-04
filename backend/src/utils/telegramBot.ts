import { UserService } from '../services/supabase';
import { UserPreferencesService, UserPreferences } from '../services/userPreferencesService';
import { NotificationService } from '../services/notificationService';
import { logger } from './logger';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MINI_APP_URL = 't.me/mashukteam_bot/mashuk_team';

/**
 * Формирование ссылки на мини-апп с параметрами
 */
function buildAppLink(type: 'event' | 'question' | 'assignment' | 'diagnostic', id: string): string {
  return `https://${MINI_APP_URL}?start=${type}_${id}`;
}

/**
 * Проверка, нужно ли отправлять уведомление пользователю
 */
async function shouldSendNotification(
  userId: string,
  notificationType: 'events' | 'questions' | 'assignments' | 'diagnostics'
): Promise<boolean> {
  try {
    const preferences = await UserPreferencesService.getUserPreferences(userId);
    
    // Если все уведомления отключены
    if (!preferences.notifications_enabled) {
      return false;
    }
    
    // Проверяем конкретный тип уведомления
    switch (notificationType) {
      case 'events':
        return preferences.notification_events;
      case 'questions':
        return preferences.notification_questions;
      case 'assignments':
        return preferences.notification_assignments;
      case 'diagnostics':
        return preferences.notification_diagnostics;
      default:
        return true;
    }
  } catch (error) {
    logger.error('Error checking notification preferences', error instanceof Error ? error : new Error(String(error)));
    // В случае ошибки отправляем уведомление (fail-safe)
    return true;
  }
}

/**
 * Массовая загрузка настроек пользователей
 */
async function getUserPreferencesBatch(userIds: string[]): Promise<Map<string, UserPreferences>> {
  const preferencesMap = new Map<string, UserPreferences>();
  
  // Загружаем настройки батчами по 100 пользователей
  const batchSize = 100;
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const preferencesPromises = batch.map(userId => 
      UserPreferencesService.getUserPreferences(userId).catch(() => null)
    );
    const preferences = await Promise.all(preferencesPromises);
    
    preferences.forEach((pref, index) => {
      if (pref) {
        preferencesMap.set(batch[index], pref);
      }
    });
  }
  
  return preferencesMap;
}

/**
 * Отправка сообщения пользователю через Telegram Bot API
 */
export async function sendMessageToUser(
  telegramId: number, 
  text: string, 
  includeAppLink: boolean = true,
  deepLink?: string,
  userId?: string,
  notificationType?: 'event' | 'question' | 'assignment' | 'diagnostic' | 'achievement' | 'randomizer' | 'assignment_result',
  notificationTitle?: string
) {
  if (!BOT_TOKEN) {
    logger.warn('TELEGRAM_BOT_TOKEN не установлен, уведомление не отправлено');
    return false;
  }

  // Добавляем ссылку на мини-апп
  let messageText = text;
  if (includeAppLink) {
    const link = deepLink || `https://${MINI_APP_URL}`;
    messageText = `${text}\n\n👉 <a href="${link}">Открыть в приложении</a>`;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramId,
        text: messageText,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      }),
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        const errorText = await response.text();
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        // Если не удалось распарсить JSON, используем текст ошибки
        errorData = { description: 'Unknown error' };
      }
      
      const errorCode = response.status;
      const errorDescription = errorData.description || errorData.error_code || 'Unknown error';
      
      // Обработка специфичных ошибок Telegram API
      if (errorCode === 403) {
        logger.warn('User blocked the bot', { telegramId, errorDescription });
        return false; // Пользователь заблокировал бота
      } else if (errorCode === 400) {
        logger.warn('Invalid chat_id or request', { telegramId, errorDescription });
        return false; // Невалидный chat_id
      } else if (errorCode === 429) {
        logger.warn('Rate limit exceeded', { telegramId });
        // Можно добавить retry logic здесь
        return false;
      }
      
      logger.error('Telegram send message error', new Error(`Failed to send message to ${telegramId}: ${errorDescription}`));
      return false;
    }
    
    logger.debug('Telegram message sent successfully', { telegramId });
    
    // Сохраняем уведомление в БД, если передан userId
    if (userId && notificationType && notificationTitle) {
      try {
        await NotificationService.createNotification(
          userId,
          notificationType,
          notificationTitle,
          text,
          deepLink
        );
      } catch (notifError) {
        logger.error('Error saving notification to DB', notifError instanceof Error ? notifError : new Error(String(notifError)));
        // Не прерываем выполнение, если ошибка сохранения уведомления
      }
    }
    
    return true;
  } catch (error) {
    logger.error('Error sending telegram message', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Параллельная отправка уведомлений с ограничением concurrency
 */
async function sendNotificationsBatch(
  notifications: Array<{ telegramId: number; text: string; deepLink?: string; userId?: string; notificationType?: string; notificationTitle?: string }>,
  concurrency: number = 10
): Promise<{ success: number; failed: number }> {
  const results = { success: 0, failed: 0 };
  
  for (let i = 0; i < notifications.length; i += concurrency) {
    const batch = notifications.slice(i, i + concurrency);
    const promises = batch.map(notif => 
      sendMessageToUser(notif.telegramId, notif.text, true, notif.deepLink, notif.userId, notif.notificationType as any, notif.notificationTitle)
        .then((success) => { 
          if (success) {
            results.success++; 
          } else {
            results.failed++;
          }
        })
        .catch(() => { results.failed++; })
    );
    
    await Promise.all(promises);
    // Небольшая задержка между батчами для избежания rate limiting
    if (i + concurrency < notifications.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Рассылка уведомления всем пользователям
 */
export async function broadcastMessage(
  text: string, 
  deepLink?: string,
  notificationType?: 'events' | 'questions' | 'assignments' | 'diagnostics'
) {
  const startTime = Date.now();
  
  logger.info('broadcastMessage started', { notificationType, textLength: text.length, deepLink });
  
  if (!BOT_TOKEN) {
    logger.warn('TELEGRAM_BOT_TOKEN не установлен, broadcast не отправлен');
    return;
  }
  
  try {
    const users = await UserService.getAllUsers();
    logger.info('Users fetched for broadcast', { totalUsers: users.length });
    
    // Если указан тип уведомления, фильтруем пользователей
    if (notificationType) {
      const userIds = users.map(u => u.id);
      const preferencesMap = await getUserPreferencesBatch(userIds);
      
      const filteredUsers = users.filter(user => {
        const prefs = preferencesMap.get(user.id);
        if (!prefs) return true; // Если настроек нет, отправляем (дефолт)
        
        if (!prefs.notifications_enabled) return false;
        
        switch (notificationType) {
          case 'events':
            return prefs.notification_events;
          case 'questions':
            return prefs.notification_questions;
          case 'assignments':
            return prefs.notification_assignments;
          case 'diagnostics':
            return prefs.notification_diagnostics;
          default:
            return true;
        }
      });
      
      // Подготавливаем уведомления для батч-отправки
      const notifications = filteredUsers.map(user => ({
        telegramId: user.telegram_id,
        text,
        deepLink
      }));
      
      // Отправляем батчами
      const results = await sendNotificationsBatch(notifications);
      const duration = Date.now() - startTime;
      
      logger.info('Broadcast completed', { 
        totalUsers: users.length, 
        notifiedUsers: filteredUsers.length,
        skippedUsers: users.length - filteredUsers.length,
        success: results.success,
        failed: results.failed,
        notificationType,
        duration: `${duration}ms`
      });
    } else {
      // Если тип не указан, отправляем всем (для обратной совместимости)
      const notifications = users.map(user => ({
        telegramId: user.telegram_id,
        text,
        deepLink
      }));
      
      const results = await sendNotificationsBatch(notifications);
      const duration = Date.now() - startTime;
      
      logger.info('Broadcast completed', { 
        usersCount: users.length,
        success: results.success,
        failed: results.failed,
        duration: `${duration}ms`
      });
    }
  } catch (error) {
    logger.error('Broadcast error', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Отправка уведомления о новом задании
 */
export async function notifyNewAssignment(title: string, reward: number, assignmentId: string) {
  logger.info('notifyNewAssignment called', { title, reward, assignmentId });
  const text = `📋 <b>Новое задание!</b>\n\n${title}\n\n⭐ Награда: ${reward} звёздочек`;
  const deepLink = buildAppLink('assignment', assignmentId);
  await broadcastMessage(text, deepLink, 'assignments');
}

/**
 * Отправка уведомления о результате проверки задания
 */
export async function notifyAssignmentResult(
  userId: string,
  telegramId: number, 
  assignmentTitle: string, 
  approved: boolean,
  reward: number,
  comment?: string
) {
  // Проверяем настройки пользователя
  const shouldSend = await shouldSendNotification(userId, 'assignments');
  if (!shouldSend) {
    logger.debug('Notification skipped due to user preferences', { userId, notificationType: 'assignments' });
    return;
  }
  
  let text: string;
  
  if (approved) {
    text = `✅ <b>Задание принято!</b>\n\n"${assignmentTitle}"\n\n🎁 +${reward} баллов`;
  } else {
    text = `❌ <b>Задание отклонено</b>\n\n"${assignmentTitle}"`;
  }
  
  if (comment) {
    text += `\n\n💬 Комментарий: ${comment}`;
  }
  
  await sendMessageToUser(telegramId, text, true);
}

/**
 * Отправка уведомления о разблокировке достижения
 */
export async function notifyAchievementUnlocked(
  userId: string,
  telegramId: number,
  achievementName: string,
  achievementId: string
): Promise<boolean> {
  // Проверяем настройки пользователя (достижения можно считать как общие уведомления)
  const shouldSend = await shouldSendNotification(userId, 'questions'); // Используем questions как общий тип
  if (!shouldSend) {
    logger.debug('Achievement notification skipped due to user preferences', { userId });
    return false;
  }
  
  const text = `🏆 <b>Новое достижение!</b>\n\n${achievementName}\n\nПоздравляем!`;
  const deepLink = buildAppLink('question', achievementId); // Используем question как тип для deep link
  
  return await sendMessageToUser(
    telegramId, 
    text, 
    true, 
    deepLink, 
    userId, 
    'achievement',
    'Новое достижение'
  );
}

/**
 * Отправка уведомления о распределении по столам в рандомайзере
 */
export async function notifyRandomizerDistribution(
  userId: string,
  telegramId: number,
  randomizerTopic: string,
  tableNumber: number
): Promise<boolean> {
  // Проверяем настройки пользователя
  const shouldSend = await shouldSendNotification(userId, 'questions');
  if (!shouldSend) {
    logger.debug('Randomizer notification skipped due to user preferences', { userId });
    return false;
  }
  
  const text = `🎲 <b>Подведены итоги распределения!</b>\n\nТема: ${randomizerTopic}\n\nВаш стол: <b>№${tableNumber}</b>\n\nУдачи!`;
  
  return await sendMessageToUser(
    telegramId, 
    text, 
    true, 
    undefined, 
    userId, 
    'randomizer',
    'Распределение по столам'
  );
}

/**
 * Отправка уведомления о новом персональном вопросе
 */
export async function notifyNewTargetedQuestion(
  telegramId: number,
  questionText: string,
  questionId: string
) {
  const text = `❓ <b>Анонс нового вопроса</b>\n\n${questionText}`;
  const deepLink = buildAppLink('question', questionId);
  await sendMessageToUser(telegramId, text, true, deepLink);
}

/**
 * Рассылка уведомления о новом персональном вопросе выбранным пользователям
 */
export async function notifyTargetedQuestionToUsers(
  userIds: string[],
  questionText: string,
  questionId: string
) {
  try {
    const users = await UserService.getAllUsers();
    const targetUsers = users.filter(u => userIds.includes(u.id));
    
    // Фильтруем пользователей по настройкам уведомлений
    const notifications: Array<{ telegramId: number; text: string; deepLink?: string; userId?: string; notificationType?: string; notificationTitle?: string }> = [];
    
    for (const user of targetUsers) {
      const shouldSend = await shouldSendNotification(user.id, 'questions');
      if (shouldSend) {
        const text = `❓ <b>Анонс нового вопроса</b>\n\n${questionText}`;
        const deepLink = buildAppLink('question', questionId);
        notifications.push({
          telegramId: user.telegram_id,
          text,
          deepLink,
          userId: user.id,
          notificationType: 'question',
          notificationTitle: 'Анонс нового вопроса'
        });
      }
    }
    
    // Отправляем батчами
    const results = await sendNotificationsBatch(notifications);
    
    logger.info('Targeted question notifications sent', { 
      totalUsers: targetUsers.length,
      notifiedUsers: notifications.length,
      skippedUsers: targetUsers.length - notifications.length,
      success: results.success,
      failed: results.failed
    });
  } catch (error) {
    logger.error('Error sending targeted question notifications', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Уведомление о назначении направления
 */
export async function notifyDirectionAssigned(
  telegramId: number,
  directionName: string
) {
  const text = `🎯 <b>Вам назначено направление</b>\n\n${directionName}`;
  await sendMessageToUser(telegramId, text, true);
}

/**
 * Отправка уведомления о новом мероприятии
 */
export async function notifyNewEvent(
  eventTitle: string,
  eventId: string
) {
  const text = `📅 <b>Анонс новой программы обучения</b>\n\n${eventTitle}`;
  const deepLink = buildAppLink('event', eventId);
  await broadcastMessage(text, deepLink, 'events');
}

/**
 * Отправка уведомления о новой диагностике
 */
export async function notifyNewDiagnostic(
  diagnosticTitle: string,
  diagnosticId: string
) {
  const text = `🩺 <b>Анонс новой диагностики</b>\n\n${diagnosticTitle}`;
  const deepLink = buildAppLink('diagnostic', diagnosticId);
  await broadcastMessage(text, deepLink, 'diagnostics');
}

/**
 * Отправка сообщения с фото пользователю через Telegram Bot API
 */
export async function sendPhotoToUser(
  telegramId: number,
  photoUrl: string,
  caption?: string,
  includeAppLink: boolean = true
): Promise<boolean> {
  if (!BOT_TOKEN) {
    logger.warn('TELEGRAM_BOT_TOKEN не установлен, фото не отправлено');
    return false;
  }

  // Добавляем ссылку на мини-апп
  let captionText = caption || '';
  if (includeAppLink) {
    const link = `https://${MINI_APP_URL}`;
    captionText = captionText ? `${captionText}\n\n👉 <a href="${link}">Открыть в приложении</a>` : `👉 <a href="${link}">Открыть в приложении</a>`;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramId,
        photo: photoUrl,
        caption: captionText,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        const errorText = await response.text();
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        errorData = { description: 'Unknown error' };
      }
      
      const errorCode = response.status;
      const errorDescription = errorData.description || 'Unknown error';
      
      if (errorCode === 403) {
        logger.warn('User blocked the bot', { telegramId, errorDescription });
        return false;
      } else if (errorCode === 400) {
        logger.warn('Invalid chat_id or photo URL', { telegramId, errorDescription });
        return false;
      } else if (errorCode === 429) {
        logger.warn('Rate limit exceeded', { telegramId });
        return false;
      }
      
      logger.error('Telegram send photo error', new Error(`Failed to send photo to ${telegramId}: ${errorDescription}`));
      return false;
    }
    
    logger.debug('Telegram photo sent successfully', { telegramId });
    return true;
  } catch (error) {
    logger.error('Error sending telegram photo', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Отправка рассылки с фото пользователям
 */
export async function sendBroadcastToUsers(
  users: Array<{ telegram_id: number; id: string; direction?: string }>,
  message: string,
  imageUrl?: string,
  concurrency: number = 10
): Promise<{ success: number; failed: number }> {
  const results = { success: 0, failed: 0 };
  
  for (let i = 0; i < users.length; i += concurrency) {
    const batch = users.slice(i, i + concurrency);
    
    const promises = batch.map(async (user) => {
      try {
        let success: boolean;
        
        if (imageUrl) {
          // Отправляем фото с текстом
          success = await sendPhotoToUser(user.telegram_id, imageUrl, message, true);
        } else {
          // Отправляем только текст
          success = await sendMessageToUser(user.telegram_id, message, true);
        }
        
        if (success) {
          results.success++;
        } else {
          results.failed++;
        }
      } catch (error) {
        results.failed++;
        logger.error('Error in broadcast batch', error instanceof Error ? error : new Error(String(error)));
      }
    });
    
    await Promise.all(promises);
    
    // Небольшая задержка между батчами для избежания rate limiting
    if (i + concurrency < users.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  logger.info('Broadcast to users completed', { 
    total: users.length, 
    success: results.success, 
    failed: results.failed 
  });
  
  return results;
}

/**
 * Отправка документа (файла) пользователю через Telegram Bot API
 */
export async function sendDocumentToUser(
  telegramId: number,
  fileBuffer: Buffer,
  filename: string,
  caption?: string
): Promise<boolean> {
  if (!BOT_TOKEN) {
    logger.warn('TELEGRAM_BOT_TOKEN не установлен, документ не отправлен');
    return false;
  }

  try {
    // Создаём FormData для отправки файла
    const formData = new FormData();
    formData.append('chat_id', telegramId.toString());
    
    // Создаём Blob из Buffer для отправки файла
    const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    formData.append('document', blob, filename);
    
    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
    }

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        const errorText = await response.text();
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        errorData = { description: 'Unknown error' };
      }
      
      const errorCode = response.status;
      const errorDescription = errorData.description || 'Unknown error';
      
      if (errorCode === 403) {
        logger.warn('User blocked the bot', { telegramId, errorDescription });
        return false;
      } else if (errorCode === 400) {
        logger.warn('Invalid chat_id or document', { telegramId, errorDescription });
        return false;
      } else if (errorCode === 429) {
        logger.warn('Rate limit exceeded', { telegramId });
        return false;
      }
      
      logger.error('Telegram send document error', new Error(`Failed to send document to ${telegramId}: ${errorDescription}`));
      return false;
    }
    
    logger.debug('Telegram document sent successfully', { telegramId, filename });
    return true;
  } catch (error) {
    logger.error('Error sending telegram document', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}
