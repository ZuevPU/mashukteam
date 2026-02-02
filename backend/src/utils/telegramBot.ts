import { UserService } from '../services/supabase';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MINI_APP_URL = 't.me/mashukteam_bot/mashuk_team';

/**
 * Отправка сообщения пользователю через Telegram Bot API
 */
export async function sendMessageToUser(telegramId: number, text: string, includeAppLink: boolean = true) {
  if (!BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN не установлен, уведомление не отправлено');
    return;
  }

  // Добавляем ссылку на мини-апп
  const messageText = includeAppLink 
    ? `${text}\n\n👉 <a href="https://${MINI_APP_URL}">Открыть приложение</a>`
    : text;

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
      console.error(`Failed to send message to ${telegramId}:`, await response.text());
    }
  } catch (error) {
    console.error('Error sending telegram message:', error);
  }
}

/**
 * Рассылка уведомления всем пользователям
 */
export async function broadcastMessage(text: string) {
  try {
    const users = await UserService.getAllUsers();
    
    for (const user of users) {
      await sendMessageToUser(user.telegram_id, text, true);
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
export async function notifyNewAssignment(title: string, reward: number) {
  const text = `📋 <b>Новое задание!</b>\n\n${title}\n\n🎁 Награда: ${reward} баллов`;
  await broadcastMessage(text);
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
  questionText: string
) {
  const text = `❓ <b>Новый персональный вопрос</b>\n\n${questionText}`;
  await sendMessageToUser(telegramId, text, true);
}

/**
 * Рассылка уведомления о новом персональном вопросе выбранным пользователям
 */
export async function notifyTargetedQuestionToUsers(
  userIds: string[],
  questionText: string
) {
  try {
    const users = await UserService.getAllUsers();
    const targetUsers = users.filter(u => userIds.includes(u.id));
    
    for (const user of targetUsers) {
      await notifyNewTargetedQuestion(user.telegram_id, questionText);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`Targeted question notifications sent to ${targetUsers.length} users`);
  } catch (error) {
    console.error('Error sending targeted question notifications:', error);
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
