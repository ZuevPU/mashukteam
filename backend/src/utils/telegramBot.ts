import { UserService } from '../services/supabase';
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
 * Отправка сообщения пользователю через Telegram Bot API
 */
export async function sendMessageToUser(
  telegramId: number, 
  text: string, 
  includeAppLink: boolean = true,
  deepLink?: string
) {
  if (!BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN не установлен, уведомление не отправлено');
    return;
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
      const errorText = await response.text();
      logger.error(new Error(`Failed to send message to ${telegramId}: ${errorText}`), 'Telegram send message error');
    }
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), 'Error sending telegram message');
  }
}

/**
 * Рассылка уведомления всем пользователям
 */
export async function broadcastMessage(text: string, deepLink?: string) {
  try {
    const users = await UserService.getAllUsers();
    
    for (const user of users) {
      await sendMessageToUser(user.telegram_id, text, true, deepLink);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`Broadcast completed for ${users.length} users`);
  } catch (error) {
    console.error('Broadcast error:', error);
  }
}

/**
 * Отправка уведомления о новом задании
 */
export async function notifyNewAssignment(title: string, reward: number, assignmentId: string) {
  const text = `📋 <b>Анонс нового задания</b>\n\n${title}\n\n🎁 Награда: ${reward} баллов`;
  const deepLink = buildAppLink('assignment', assignmentId);
  await broadcastMessage(text, deepLink);
}

/**
 * Отправка уведомления о результате проверки задания
 */
export async function notifyAssignmentResult(
  telegramId: number, 
  assignmentTitle: string, 
  approved: boolean,
  reward: number,
  comment?: string
) {
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
    
    for (const user of targetUsers) {
      await notifyNewTargetedQuestion(user.telegram_id, questionText, questionId);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    logger.info('Targeted question notifications sent', { usersCount: targetUsers.length });
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), 'Error sending targeted question notifications');
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
  const text = `📅 <b>Анонс нового мероприятия</b>\n\n${eventTitle}`;
  const deepLink = buildAppLink('event', eventId);
  await broadcastMessage(text, deepLink);
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
  await broadcastMessage(text, deepLink);
}
