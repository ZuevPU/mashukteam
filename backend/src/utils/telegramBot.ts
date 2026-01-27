import { UserService } from '../services/supabase';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Отправка сообщения пользователю через Telegram Bot API
 */
export async function sendMessageToUser(telegramId: number, text: string) {
  if (!BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN не установлен, уведомление не отправлено');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramId,
        text: text,
        parse_mode: 'HTML'
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
    
    // Отправляем сообщения пачками или последовательно, чтобы не превысить лимиты (упрощенно)
    for (const user of users) {
      await sendMessageToUser(user.telegram_id, text);
      // Небольшая задержка, чтобы не спамить API слишком быстро
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`Broadcast completed for ${users.length} users`);
  } catch (error) {
    console.error('Broadcast error:', error);
  }
}
