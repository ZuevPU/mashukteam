import { supabase } from './supabase';
// Используем динамический импорт для xlsx
let XLSX: any;
try {
  XLSX = require('xlsx');
} catch (e) {
  console.error('xlsx library not installed. Run: npm install xlsx');
  throw new Error('xlsx library is required for export functionality');
}

export class ExportService {
  /**
   * Экспорт всех ответов в Excel файл
   */
  static async exportAnswersToExcel(): Promise<Buffer> {
    // 1. Получаем ответы на мероприятия
    const { data: eventAnswers } = await supabase
      .from('answers')
      .select(`
        id,
        user_id,
        event_id,
        question_id,
        answer_data,
        created_at,
        user:users(id, first_name, last_name, telegram_username),
        question:questions(text, type),
        event:events(title, type)
      `)
      .order('created_at', { ascending: false });

    // 2. Получаем ответы на персональные вопросы
    const { data: targetedAnswers } = await supabase
      .from('targeted_answers')
      .select(`
        id,
        user_id,
        question_id,
        answer_data,
        created_at,
        user:users(id, first_name, last_name, telegram_username),
        question:targeted_questions(text, type)
      `)
      .order('created_at', { ascending: false });

    // 3. Получаем выполненные задания
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select(`
        id,
        user_id,
        assignment_id,
        content,
        status,
        admin_comment,
        created_at,
        updated_at,
        user:users(id, first_name, last_name, telegram_username),
        assignment:assignments(title, reward)
      `)
      .order('created_at', { ascending: false });

    // Подготовка данных для Excel
    const workbook = XLSX.utils.book_new();

    // Лист 1: Ответы на мероприятия
    const eventAnswersData = (eventAnswers || []).map((answer: any) => ({
      'ID ответа': answer.id,
      'ID пользователя': answer.user_id,
      'Имя': answer.user?.first_name || '',
      'Фамилия': answer.user?.last_name || '',
      'Username': answer.user?.telegram_username || '',
      'Название мероприятия': answer.event?.title || '',
      'Тип мероприятия': answer.event?.type === 'diagnostic' ? 'Диагностика' : 'Мероприятие',
      'Текст вопроса': answer.question?.text || '',
      'Тип вопроса': answer.question?.type || '',
      'Ответ': this.formatAnswerData(answer.answer_data),
      'Дата ответа': new Date(answer.created_at).toLocaleString('ru-RU')
    }));

    const eventAnswersSheet = XLSX.utils.json_to_sheet(eventAnswersData);
    XLSX.utils.book_append_sheet(workbook, eventAnswersSheet, 'Мероприятия');

    // Лист 2: Ответы на персональные вопросы
    const targetedAnswersData = (targetedAnswers || []).map((answer: any) => ({
      'ID ответа': answer.id,
      'ID пользователя': answer.user_id,
      'Имя': answer.user?.first_name || '',
      'Фамилия': answer.user?.last_name || '',
      'Username': answer.user?.telegram_username || '',
      'Текст вопроса': answer.question?.text || '',
      'Тип вопроса': answer.question?.type || '',
      'Ответ': this.formatAnswerData(answer.answer_data),
      'Дата ответа': new Date(answer.created_at).toLocaleString('ru-RU')
    }));

    const targetedAnswersSheet = XLSX.utils.json_to_sheet(targetedAnswersData);
    XLSX.utils.book_append_sheet(workbook, targetedAnswersSheet, 'Персональные вопросы');

    // Лист 3: Выполненные задания
    const submissionsData = (submissions || []).map((sub: any) => ({
      'ID ответа': sub.id,
      'ID пользователя': sub.user_id,
      'Имя': sub.user?.first_name || '',
      'Фамилия': sub.user?.last_name || '',
      'Username': sub.user?.telegram_username || '',
      'Название задания': sub.assignment?.title || '',
      'Содержание ответа': sub.content || '',
      'Статус': this.getStatusLabel(sub.status),
      'Комментарий админа': sub.admin_comment || '',
      'Награда': sub.assignment?.reward || 0,
      'Дата отправки': new Date(sub.created_at).toLocaleString('ru-RU'),
      'Дата обновления': new Date(sub.updated_at).toLocaleString('ru-RU')
    }));

    const submissionsSheet = XLSX.utils.json_to_sheet(submissionsData);
    XLSX.utils.book_append_sheet(workbook, submissionsSheet, 'Задания');

    // Генерация буфера Excel файла
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return excelBuffer;
  }

  /**
   * Форматирование данных ответа для отображения в Excel
   */
  private static formatAnswerData(answerData: any): string {
    if (Array.isArray(answerData)) {
      return answerData.join(', ');
    }
    if (typeof answerData === 'object' && answerData !== null) {
      return JSON.stringify(answerData);
    }
    return String(answerData || '');
  }

  /**
   * Получение читаемого названия статуса
   */
  private static getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': 'На проверке',
      'approved': 'Принято',
      'rejected': 'Отклонено'
    };
    return labels[status] || status;
  }
}
