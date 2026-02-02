import { supabase } from './supabase';
import { logger } from '../utils/logger';
// Используем динамический импорт для xlsx
let XLSX: any;
try {
  XLSX = require('xlsx');
} catch (e) {
  logger.error('xlsx library not installed. Run: npm install xlsx', e instanceof Error ? e : new Error(String(e)));
  throw new Error('xlsx library is required for export functionality');
}

export class ExportService {
  /**
   * Экспорт всех ответов в Excel файл
   */
  static async exportAnswersToExcel(): Promise<Buffer> {
    try {
      // 1. Получаем ответы на мероприятия
      const { data: eventAnswers, error: eventAnswersError } = await supabase
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
          event:events(title, type, group_name)
        `)
        .order('created_at', { ascending: false });

      if (eventAnswersError) {
        logger.error('Error fetching event answers', eventAnswersError instanceof Error ? eventAnswersError : new Error(String(eventAnswersError)));
        throw new Error(`Ошибка получения ответов на мероприятия: ${eventAnswersError.message}`);
      }

      // 2. Получаем ответы на персональные вопросы
      const { data: targetedAnswers, error: targetedAnswersError } = await supabase
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

      if (targetedAnswersError) {
        logger.error('Error fetching targeted answers', targetedAnswersError instanceof Error ? targetedAnswersError : new Error(String(targetedAnswersError)));
        throw new Error(`Ошибка получения ответов на персональные вопросы: ${targetedAnswersError.message}`);
      }

      // 3. Получаем выполненные задания
      const { data: submissions, error: submissionsError } = await supabase
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

      if (submissionsError) {
        logger.error('Error fetching submissions', submissionsError instanceof Error ? submissionsError : new Error(String(submissionsError)));
        throw new Error(`Ошибка получения выполненных заданий: ${submissionsError.message}`);
      }

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
        'Группа': answer.event?.group_name || '',
        'Текст вопроса': answer.question?.text || '',
        'Тип вопроса': answer.question?.type || '',
        'Ответ': this.formatAnswerData(answer.answer_data),
        'Дата ответа': answer.created_at ? new Date(answer.created_at).toLocaleString('ru-RU') : ''
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
        'Дата отправки': sub.created_at ? new Date(sub.created_at).toLocaleString('ru-RU') : '',
        'Дата обновления': sub.updated_at ? new Date(sub.updated_at).toLocaleString('ru-RU') : ''
      }));

      const submissionsSheet = XLSX.utils.json_to_sheet(submissionsData);
      XLSX.utils.book_append_sheet(workbook, submissionsSheet, 'Задания');

      // Генерация буфера Excel файла
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return excelBuffer;
    } catch (error) {
      logger.error('Error in exportAnswersToExcel', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Форматирование данных ответа для отображения в Excel
   */
  private static formatAnswerData(answerData: any): string {
    if (answerData === null || answerData === undefined) {
      return '';
    }
    
    if (Array.isArray(answerData)) {
      // Форматируем массив: если элементы простые - через запятую, иначе JSON
      if (answerData.length === 0) return '';
      if (answerData.every(item => typeof item === 'string' || typeof item === 'number')) {
        return answerData.join(', ');
      }
      return JSON.stringify(answerData, null, 2);
    }
    
    if (typeof answerData === 'object') {
      // Форматируем объект с отступами для читаемости
      try {
        return JSON.stringify(answerData, null, 2);
      } catch {
        return String(answerData);
      }
    }
    
    if (typeof answerData === 'number') {
      return answerData.toString();
    }
    
    if (typeof answerData === 'boolean') {
      return answerData ? 'Да' : 'Нет';
    }
    
    return String(answerData);
  }

  /**
   * Форматирование даты для Excel
   */
  private static formatDate(date: string | Date | null | undefined): string {
    if (!date) return '';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(date);
    }
  }

  /**
   * Форматирование даты без времени
   */
  private static formatDateOnly(date: string | Date | null | undefined): string {
    if (!date) return '';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return String(date);
    }
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

  /**
   * Экспорт мероприятий в Excel файл
   */
  static async exportEvents(): Promise<Buffer> {
    // Получаем все мероприятия
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .order('group_order', { ascending: true })
      .order('event_order', { ascending: true })
      .order('created_at', { ascending: false });

    // Получаем детальную информацию о количестве вопросов и участников
    const eventsData = await Promise.all((events || []).map(async (event: any) => {
      // Подсчет вопросов
      const { count: questionsCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id);

      // Подсчет уникальных участников
      const { data: uniqueUsers } = await supabase
        .from('answers')
        .select('user_id')
        .eq('event_id', event.id);

      const participantsCount = uniqueUsers ? new Set(uniqueUsers.map((a: any) => a.user_id)).size : 0;

      return {
        'ID': event.id,
        'Название': event.title || '',
        'Спикер': event.speaker || '',
        'Описание': event.description || '',
        'Аудитория': event.audience || '',
        'Дата проведения': event.event_date ? new Date(event.event_date).toLocaleDateString('ru-RU') : '',
        'Время проведения': event.event_time || '',
        'Тип': event.type === 'diagnostic' ? 'Диагностика' : 'Мероприятие',
        'Статус': this.getEventStatusLabel(event.status),
        'Группа': event.group_name || '',
        'Порядок группы': event.group_order || 0,
        'Порядок в группе': event.event_order || 0,
        'Количество вопросов': questionsCount || 0,
        'Количество участников': participantsCount,
        'Дата создания': this.formatDate(event.created_at),
        'Дата обновления': this.formatDate(event.updated_at)
      };
    }));

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(eventsData);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Мероприятия');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return excelBuffer;
  }

  /**
   * Получение читаемого названия статуса мероприятия
   */
  private static getEventStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'draft': 'Черновик',
      'published': 'Опубликовано',
      'completed': 'Завершено'
    };
    return labels[status] || status;
  }

  /**
   * Экспорт диагностик с результатами по каждому участнику
   */
  static async exportDiagnosticsWithResults(): Promise<Buffer> {
    // Получаем все диагностики
    const { data: diagnostics } = await supabase
      .from('events')
      .select('*')
      .eq('type', 'diagnostic')
      .order('group_order', { ascending: true })
      .order('event_order', { ascending: true });

    const workbook = XLSX.utils.book_new();

    // Для каждой диагностики создаем отдельный лист
    for (const diagnostic of diagnostics || []) {
      // Получаем вопросы диагностики
      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .eq('event_id', diagnostic.id)
        .order('order_index', { ascending: true });

      // Получаем всех участников, которые ответили на диагностику
      const { data: answers } = await supabase
        .from('answers')
        .select(`
          *,
          user:users(id, first_name, last_name, telegram_username),
          question:questions(text, type, options)
        `)
        .eq('event_id', diagnostic.id)
        .order('created_at', { ascending: false });

      // Группируем ответы по пользователям
      const userAnswersMap = new Map<string, any[]>();
      (answers || []).forEach((answer: any) => {
        const userId = answer.user_id;
        if (!userAnswersMap.has(userId)) {
          userAnswersMap.set(userId, []);
        }
        userAnswersMap.get(userId)!.push(answer);
      });

      // Формируем данные для экспорта
      const diagnosticData: any[] = [];

      // Заголовок диагностики
      diagnosticData.push({
        'Поле': 'Название диагностики',
        'Значение': diagnostic.title || ''
      });
      diagnosticData.push({
        'Поле': 'Описание',
        'Значение': diagnostic.description || ''
      });
      diagnosticData.push({
        'Поле': 'Дата проведения',
        'Значение': diagnostic.event_date ? new Date(diagnostic.event_date).toLocaleDateString('ru-RU') : ''
      });
      diagnosticData.push({
        'Поле': 'Группа',
        'Значение': diagnostic.group_name || ''
      });
      diagnosticData.push({ 'Поле': '', 'Значение': '' });

      // Для каждого участника создаем блок с его ответами
      userAnswersMap.forEach((userAnswers, userId) => {
        const user = userAnswers[0]?.user;
        if (!user) return;

        diagnosticData.push({
          'Поле': 'Участник',
          'Значение': `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.telegram_username || userId
        });
        diagnosticData.push({
          'Поле': 'Username',
          'Значение': user.telegram_username || ''
        });
        diagnosticData.push({ 'Поле': '', 'Значение': '' });

        // Добавляем ответы на вопросы
        (questions || []).forEach((question: any) => {
          const answer = userAnswers.find((a: any) => a.question_id === question.id);
          diagnosticData.push({
            'Поле': `Вопрос: ${question.text}`,
            'Значение': answer ? this.formatAnswerData(answer.answer_data) : 'Нет ответа'
          });
        });

        diagnosticData.push({ 'Поле': '', 'Значение': '' });
        diagnosticData.push({ 'Поле': '---', 'Значение': '---' });
        diagnosticData.push({ 'Поле': '', 'Значение': '' });
      });

      // Создаем лист для диагностики (ограничиваем длину названия листа)
      const sheetName = (diagnostic.title || `Диагностика ${diagnostic.id}`).substring(0, 31);
      const sheet = XLSX.utils.json_to_sheet(diagnosticData);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    }

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return excelBuffer;
  }

  /**
   * Экспорт заданий с результатами выполнения по каждому участнику
   */
  static async exportAssignmentsWithResults(): Promise<Buffer> {
    // Получаем все задания
    const { data: assignments } = await supabase
      .from('assignments')
      .select('*')
      .order('created_at', { ascending: false });

    const workbook = XLSX.utils.book_new();

    // Для каждого задания создаем отдельный лист
    for (const assignment of assignments || []) {
      // Получаем все отправки для этого задания
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          user:users(id, first_name, last_name, telegram_username, telegram_id)
        `)
        .eq('assignment_id', assignment.id)
        .order('created_at', { ascending: false });

      // Формируем данные для экспорта
      const assignmentData: any[] = [];

      // Информация о задании
      assignmentData.push({
        'Поле': 'Название задания',
        'Значение': assignment.title || ''
      });
      assignmentData.push({
        'Поле': 'Описание',
        'Значение': assignment.description || ''
      });
      assignmentData.push({
        'Поле': 'Формат ответа',
        'Значение': assignment.answer_format || 'text'
      });
      assignmentData.push({
        'Поле': 'Награда (баллы)',
        'Значение': assignment.reward || 0
      });
      assignmentData.push({
        'Поле': 'Целевая аудитория',
        'Значение': this.getTargetTypeLabel(assignment.target_type)
      });
      assignmentData.push({
        'Поле': 'Статус',
        'Значение': assignment.status === 'published' ? 'Опубликовано' : 'Черновик'
      });
      assignmentData.push({
        'Поле': 'Дата создания',
        'Значение': new Date(assignment.created_at).toLocaleString('ru-RU')
      });
      assignmentData.push({ 'Поле': '', 'Значение': '' });
      assignmentData.push({
        'Поле': '--- РЕЗУЛЬТАТЫ ВЫПОЛНЕНИЯ ---',
        'Значение': ''
      });
      assignmentData.push({ 'Поле': '', 'Значение': '' });

      // Данные по каждому участнику
      const resultsData = (submissions || []).map((sub: any) => {
        const user = sub.user;
        return {
          'ID отправки': sub.id,
          'ID пользователя': sub.user_id,
          'Имя': user?.first_name || '',
          'Фамилия': user?.last_name || '',
          'Username': user?.telegram_username || '',
          'Telegram ID': user?.telegram_id || '',
          'Содержание ответа': sub.content || '',
          'Статус': this.getStatusLabel(sub.status),
          'Комментарий админа': sub.admin_comment || '',
          'Дата отправки': new Date(sub.created_at).toLocaleString('ru-RU'),
          'Дата обновления': new Date(sub.updated_at).toLocaleString('ru-RU')
        };
      });

      // Объединяем информацию о задании и результаты
      const sheetData = [
        ...assignmentData.map(item => ({
          'Поле': item['Поле'],
          'Значение': item['Значение'],
          'ID отправки': '',
          'ID пользователя': '',
          'Имя': '',
          'Фамилия': '',
          'Username': '',
          'Telegram ID': '',
          'Содержание ответа': '',
          'Статус': '',
          'Комментарий админа': '',
          'Дата отправки': '',
          'Дата обновления': ''
        })),
        ...resultsData
      ];

      // Создаем лист для задания
      const sheetName = (assignment.title || `Задание ${assignment.id}`).substring(0, 31);
      const sheet = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    }

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return excelBuffer;
  }

  /**
   * Получение читаемого названия типа целевой аудитории
   */
  private static getTargetTypeLabel(targetType: string): string {
    const labels: Record<string, string> = {
      'all': 'Все пользователи',
      'user_type': 'По типу пользователя',
      'individual': 'Персонально'
    };
    return labels[targetType] || targetType;
  }

  /**
   * Экспорт вопросов (мероприятия + персональные) с ответами участников
   */
  static async exportQuestionsWithAnswers(): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // 1. Вопросы к мероприятиям
    const { data: eventQuestions } = await supabase
      .from('questions')
      .select(`
        *,
        event:events(title, type, group_name)
      `)
      .order('created_at', { ascending: false });

    const eventQuestionsData = await Promise.all((eventQuestions || []).map(async (question: any) => {
      // Получаем все ответы на этот вопрос
      const { data: answers } = await supabase
        .from('answers')
        .select(`
          *,
          user:users(id, first_name, last_name, telegram_username)
        `)
        .eq('question_id', question.id)
        .order('created_at', { ascending: false });

      const answersText = (answers || []).map((a: any) => {
        const userName = `${a.user?.first_name || ''} ${a.user?.last_name || ''}`.trim() || a.user?.telegram_username || a.user_id;
        return `${userName}: ${this.formatAnswerData(a.answer_data)}`;
      }).join('; ');

      return {
        'ID вопроса': question.id,
        'Тип вопроса': 'Мероприятие',
        'Текст вопроса': question.text || '',
        'Тип ответа': question.type || '',
        'Варианты ответов': Array.isArray(question.options) ? question.options.join(', ') : '',
        'Лимит символов': question.char_limit || '',
        'Мероприятие': question.event?.title || '',
        'Тип мероприятия': question.event?.type === 'diagnostic' ? 'Диагностика' : 'Мероприятие',
        'Группа': question.event?.group_name || '',
        'Количество ответов': answers?.length || 0,
        'Ответы участников': answersText,
        'Дата создания': new Date(question.created_at).toLocaleString('ru-RU')
      };
    }));

    const eventQuestionsSheet = XLSX.utils.json_to_sheet(eventQuestionsData);
    XLSX.utils.book_append_sheet(workbook, eventQuestionsSheet, 'Вопросы мероприятий');

    // 2. Персональные вопросы
    const { data: targetedQuestions } = await supabase
      .from('targeted_questions')
      .select('*')
      .order('created_at', { ascending: false });

    const targetedQuestionsData = await Promise.all((targetedQuestions || []).map(async (question: any) => {
      // Получаем все ответы на этот вопрос
      const { data: answers } = await supabase
        .from('targeted_answers')
        .select(`
          *,
          user:users(id, first_name, last_name, telegram_username)
        `)
        .eq('question_id', question.id)
        .order('created_at', { ascending: false });

      const answersText = (answers || []).map((a: any) => {
        const userName = `${a.user?.first_name || ''} ${a.user?.last_name || ''}`.trim() || a.user?.telegram_username || a.user_id;
        return `${userName}: ${this.formatAnswerData(a.answer_data)}`;
      }).join('; ');

      return {
        'ID вопроса': question.id,
        'Тип вопроса': 'Персональный',
        'Текст вопроса': question.text || '',
        'Тип ответа': question.type || '',
        'Варианты ответов': Array.isArray(question.options) ? question.options.join(', ') : '',
        'Лимит символов': question.char_limit || '',
        'Целевая аудитория': this.getTargetAudienceLabel(question.target_audience),
        'Целевые значения': Array.isArray(question.target_values) ? question.target_values.join(', ') : '',
        'Статус': question.status === 'published' ? 'Опубликовано' : question.status === 'draft' ? 'Черновик' : 'Архив',
        'Количество ответов': answers?.length || 0,
        'Ответы участников': answersText,
        'Дата создания': new Date(question.created_at).toLocaleString('ru-RU')
      };
    }));

    const targetedQuestionsSheet = XLSX.utils.json_to_sheet(targetedQuestionsData);
    XLSX.utils.book_append_sheet(workbook, targetedQuestionsSheet, 'Персональные вопросы');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return excelBuffer;
  }

  /**
   * Получение читаемого названия целевой аудитории
   */
  private static getTargetAudienceLabel(audience: string): string {
    const labels: Record<string, string> = {
      'all': 'Все',
      'by_type': 'По типу',
      'individual': 'Персонально'
    };
    return labels[audience] || audience;
  }

  /**
   * Форматирование ответов на диагностики для экспорта
   */
  private static formatDiagnosticAnswers(answers: any[]): string {
    if (!answers || answers.length === 0) return '';
    
    // Фильтруем только диагностики
    const diagnosticAnswers = answers.filter((a: any) => a.event?.type === 'diagnostic');
    if (diagnosticAnswers.length === 0) return '';
    
    return diagnosticAnswers.map((answer: any) => {
      const event = answer.event;
      const question = answer.question;
      const formattedAnswer = this.formatAnswerData(answer.answer_data);
      const dateStr = this.formatDate(answer.created_at);
      
      return `Диагностика: ${event?.title || 'Неизвестно'}\n` +
             `Группа: ${event?.group_name || ''}\n` +
             `Вопрос: ${question?.text || ''}\n` +
             `Тип вопроса: ${question?.type || ''}\n` +
             `Ответ: ${formattedAnswer}\n` +
             `Дата: ${dateStr}`;
    }).join('\n\n---\n\n');
  }

  /**
   * Форматирование ответов на мероприятия для экспорта
   */
  private static formatEventAnswers(answers: any[]): string {
    if (!answers || answers.length === 0) return '';
    
    // Фильтруем только мероприятия (не диагностики)
    const eventAnswers = answers.filter((a: any) => a.event?.type === 'event');
    if (eventAnswers.length === 0) return '';
    
    return eventAnswers.map((answer: any) => {
      const event = answer.event;
      const question = answer.question;
      const formattedAnswer = this.formatAnswerData(answer.answer_data);
      const dateStr = this.formatDate(answer.created_at);
      
      return `Мероприятие: ${event?.title || 'Неизвестно'}\n` +
             `Группа: ${event?.group_name || ''}\n` +
             `Вопрос: ${question?.text || ''}\n` +
             `Тип вопроса: ${question?.type || ''}\n` +
             `Ответ: ${formattedAnswer}\n` +
             `Дата: ${dateStr}`;
    }).join('\n\n---\n\n');
  }

  /**
   * Форматирование ответов на персональные вопросы для экспорта
   */
  private static formatTargetedAnswers(answers: any[]): string {
    if (!answers || answers.length === 0) return '';
    
    return answers.map((answer: any) => {
      const question = answer.question;
      const formattedAnswer = this.formatAnswerData(answer.answer_data);
      const dateStr = this.formatDate(answer.created_at);
      
      return `Вопрос: ${question?.text || ''}\n` +
             `Тип вопроса: ${question?.type || ''}\n` +
             `Ответ: ${formattedAnswer}\n` +
             `Дата: ${dateStr}`;
    }).join('\n\n---\n\n');
  }

  /**
   * Форматирование ответов на задания для экспорта
   */
  private static formatAssignmentAnswers(submissions: any[]): string {
    if (!submissions || submissions.length === 0) return '';
    
    return submissions.map((sub: any) => {
      const assignment = sub.assignment;
      const statusLabel = this.getStatusLabel(sub.status);
      const dateStr = this.formatDate(sub.created_at);
      const updatedStr = sub.updated_at ? this.formatDate(sub.updated_at) : '';
      
      let result = `Задание: ${assignment?.title || 'Неизвестно'}\n` +
                   `Формат ответа: ${assignment?.answer_format || ''}\n` +
                   `Ответ: ${sub.content || ''}\n` +
                   `Статус: ${statusLabel}\n` +
                   `Награда: ${assignment?.reward || 0} баллов\n`;
      
      if (sub.admin_comment) {
        result += `Комментарий админа: ${sub.admin_comment}\n`;
      }
      
      result += `Дата отправки: ${dateStr}`;
      
      if (updatedStr && updatedStr !== dateStr) {
        result += `\nДата обновления: ${updatedStr}`;
      }
      
      return result;
    }).join('\n\n---\n\n');
  }

  /**
   * Экспорт пользователей с полной информацией
   */
  static async exportUsersFull(): Promise<Buffer> {
    // Получаем всех пользователей
    const { data: users } = await supabase
      .from('users')
      .select(`
        *,
        direction:directions(name, slug)
      `)
      .order('created_at', { ascending: false });

    if (!users || users.length === 0) {
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(workbook, sheet, 'Пользователи');
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    const userIds = users.map(u => u.id);

    // Оптимизация: получаем все данные одним батчем для всех пользователей
    const [
      allAchievements,
      allUserLevels,
      allEventAnswers,
      allSubmissions,
      allTargetedAnswers,
      allPointsTransactions,
      allReflectionHistory
    ] = await Promise.all([
      // Достижения всех пользователей
      supabase
        .from('user_achievements')
        .select('user_id, achievement:achievements(name)')
        .in('user_id', userIds),
      // Уровни всех пользователей
      supabase
        .from('user_levels')
        .select('user_id, level, experience_points')
        .in('user_id', userIds),
      // Ответы на мероприятия/диагностики с детальной информацией
      supabase
        .from('answers')
        .select(`
          user_id,
          event_id,
          question_id,
          answer_data,
          created_at,
          question:questions(text, type, order_index),
          event:events(title, type, group_name)
        `)
        .in('user_id', userIds)
        .order('created_at', { ascending: false }),
      // Выполненные задания с детальной информацией
      supabase
        .from('assignment_submissions')
        .select(`
          user_id,
          assignment_id,
          content,
          status,
          admin_comment,
          created_at,
          updated_at,
          assignment:assignments(title, answer_format, reward)
        `)
        .in('user_id', userIds)
        .order('created_at', { ascending: false }),
      // Ответы на персональные вопросы с детальной информацией
      supabase
        .from('targeted_answers')
        .select(`
          user_id,
          question_id,
          answer_data,
          created_at,
          question:targeted_questions(text, type)
        `)
        .in('user_id', userIds)
        .order('created_at', { ascending: false }),
      // Транзакции баллов (для последних 5)
      supabase
        .from('points_transactions')
        .select('user_id, points, reason, created_at')
        .in('user_id', userIds)
        .order('created_at', { ascending: false }),
      // История рефлексии (для последних 10)
      supabase
        .from('reflection_actions')
        .select('user_id, action_type, points_awarded, created_at')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
    ]);

    // Группируем данные по user_id для быстрого доступа
    const achievementsMap = new Map<string, string[]>();
    (allAchievements.data || []).forEach((a: any) => {
      const userId = a.user_id;
      if (!achievementsMap.has(userId)) {
        achievementsMap.set(userId, []);
      }
      if (a.achievement?.name) {
        achievementsMap.get(userId)!.push(a.achievement.name);
      }
    });

    const levelsMap = new Map<string, { level: number; experience_points: number }>();
    (allUserLevels.data || []).forEach((ul: any) => {
      levelsMap.set(ul.user_id, { level: ul.level, experience_points: ul.experience_points });
    });

    // Группируем детальные ответы на мероприятия/диагностики по пользователям
    const eventAnswersMap = new Map<string, any[]>();
    const answersCountMap = new Map<string, number>();
    (allEventAnswers.data || []).forEach((a: any) => {
      const userId = a.user_id;
      if (!eventAnswersMap.has(userId)) {
        eventAnswersMap.set(userId, []);
      }
      eventAnswersMap.get(userId)!.push(a);
      answersCountMap.set(userId, (answersCountMap.get(userId) || 0) + 1);
    });

    // Группируем детальные ответы на задания по пользователям
    const submissionsDetailsMap = new Map<string, any[]>();
    const submissionsStatsMap = new Map<string, { approved: number; pending: number; rejected: number; total: number }>();
    (allSubmissions.data || []).forEach((s: any) => {
      const userId = s.user_id;
      if (!submissionsDetailsMap.has(userId)) {
        submissionsDetailsMap.set(userId, []);
        submissionsStatsMap.set(userId, { approved: 0, pending: 0, rejected: 0, total: 0 });
      }
      submissionsDetailsMap.get(userId)!.push(s);
      const stats = submissionsStatsMap.get(userId)!;
      stats.total++;
      if (s.status === 'approved') stats.approved++;
      else if (s.status === 'pending') stats.pending++;
      else if (s.status === 'rejected') stats.rejected++;
    });

    // Группируем детальные ответы на персональные вопросы по пользователям
    const targetedAnswersDetailsMap = new Map<string, any[]>();
    const targetedAnswersCountMap = new Map<string, number>();
    (allTargetedAnswers.data || []).forEach((a: any) => {
      const userId = a.user_id;
      if (!targetedAnswersDetailsMap.has(userId)) {
        targetedAnswersDetailsMap.set(userId, []);
      }
      targetedAnswersDetailsMap.get(userId)!.push(a);
      targetedAnswersCountMap.set(userId, (targetedAnswersCountMap.get(userId) || 0) + 1);
    });

    // Группируем транзакции и рефлексию по пользователям (берем только последние)
    const pointsMap = new Map<string, any[]>();
    (allPointsTransactions.data || []).forEach((p: any) => {
      const userId = p.user_id;
      if (!pointsMap.has(userId)) {
        pointsMap.set(userId, []);
      }
      const userPoints = pointsMap.get(userId)!;
      if (userPoints.length < 5) {
        userPoints.push(p);
      }
    });

    const reflectionMap = new Map<string, any[]>();
    (allReflectionHistory.data || []).forEach((r: any) => {
      const userId = r.user_id;
      if (!reflectionMap.has(userId)) {
        reflectionMap.set(userId, []);
      }
      const userReflection = reflectionMap.get(userId)!;
      if (userReflection.length < 10) {
        userReflection.push(r);
      }
    });

    // Формируем данные для экспорта
    const usersData = users.map((user: any) => {
      const userId = user.id;
      const achievementsList = (achievementsMap.get(userId) || []).join(', ');
      const userLevel = levelsMap.get(userId);
      const eventsCount = answersCountMap.get(userId) || 0;
      const submissionStats = submissionsStatsMap.get(userId) || { approved: 0, pending: 0, rejected: 0, total: 0 };
      const targetedAnswersCount = targetedAnswersCountMap.get(userId) || 0;
      
      // Получаем детальные ответы пользователя
      const userEventAnswers = eventAnswersMap.get(userId) || [];
      const userTargetedAnswers = targetedAnswersDetailsMap.get(userId) || [];
      const userSubmissions = submissionsDetailsMap.get(userId) || [];
      
      // Форматируем детальные ответы
      const diagnosticAnswersText = this.formatDiagnosticAnswers(userEventAnswers);
      const eventAnswersText = this.formatEventAnswers(userEventAnswers);
      const targetedAnswersText = this.formatTargetedAnswers(userTargetedAnswers);
      const assignmentAnswersText = this.formatAssignmentAnswers(userSubmissions);
      const recentPoints = pointsMap.get(userId) || [];
      const reflectionHistory = reflectionMap.get(userId) || [];

      const recentPointsText = recentPoints.map((p: any) => 
        `${new Date(p.created_at).toLocaleDateString('ru-RU')}: ${p.points} (${p.reason || ''})`
      ).join('; ');

      const reflectionHistoryText = reflectionHistory.map((r: any) => 
        `${new Date(r.created_at).toLocaleDateString('ru-RU')}: ${r.action_type} (+${r.points_awarded})`
      ).join('; ');

      return {
        'ID': user.id,
        'Telegram ID': user.telegram_id || '',
        'Имя': user.first_name || '',
        'Фамилия': user.last_name || '',
        'Отчество': user.middle_name || '',
        'Username': user.telegram_username || '',
        'Мотивация': user.motivation || '',
        'Статус': user.status === 'registered' ? 'Зарегистрирован' : 'Новый',
        'Тип пользователя': user.user_type || '',
        'Направление': user.direction?.name || '',
        'Дата регистрации': new Date(user.created_at).toLocaleString('ru-RU'),
        'Дата выбора направления': user.direction_selected_at ? new Date(user.direction_selected_at).toLocaleString('ru-RU') : '',
        'Общие баллы': user.total_points || 0,
        'Баллы рефлексии': user.reflection_points || 0,
        'Уровень рефлексии': user.reflection_level || 1,
        'Уровень (геймификация)': userLevel?.level || user.current_level || 1,
        'Опыт': userLevel?.experience_points || 0,
        'Достижения': achievementsList,
        'Участие в мероприятиях': eventsCount,
        'Выполнено заданий': submissionStats.total,
        'Заданий принято': submissionStats.approved,
        'Заданий на проверке': submissionStats.pending,
        'Заданий отклонено': submissionStats.rejected,
        'Ответов на вопросы': targetedAnswersCount,
        'Последние транзакции баллов': recentPointsText,
        'История рефлексии': reflectionHistoryText,
        'Администратор': user.is_admin === 1 ? 'Да' : 'Нет',
        'Дата обновления': new Date(user.updated_at).toLocaleString('ru-RU'),
        'Ответы на диагностики': diagnosticAnswersText,
        'Ответы на мероприятия': eventAnswersText,
        'Ответы на персональные вопросы': targetedAnswersText,
        'Ответы на задания': assignmentAnswersText
      };
    });

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(usersData);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Пользователи');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return excelBuffer;
  }

  /**
   * Полный экспорт всех таблиц базы данных
   */
  static async exportAllTables(): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // 1. Пользователи
    const { data: users } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (users && users.length > 0) {
      const usersSheet = XLSX.utils.json_to_sheet(users.map((u: any) => ({
        ...u,
        created_at: u.created_at ? new Date(u.created_at).toLocaleString('ru-RU') : '',
        updated_at: u.updated_at ? new Date(u.updated_at).toLocaleString('ru-RU') : '',
        direction_selected_at: u.direction_selected_at ? new Date(u.direction_selected_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, usersSheet, 'Пользователи');
    }

    // 2. Мероприятия
    const { data: events } = await supabase.from('events').select('*').order('created_at', { ascending: false });
    if (events && events.length > 0) {
      const eventsSheet = XLSX.utils.json_to_sheet(events.map((e: any) => ({
        ...e,
        created_at: e.created_at ? new Date(e.created_at).toLocaleString('ru-RU') : '',
        updated_at: e.updated_at ? new Date(e.updated_at).toLocaleString('ru-RU') : '',
        event_date: e.event_date ? new Date(e.event_date).toLocaleDateString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, eventsSheet, 'Мероприятия');
    }

    // 3. Вопросы к мероприятиям
    const { data: questions } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
    if (questions && questions.length > 0) {
      const questionsSheet = XLSX.utils.json_to_sheet(questions.map((q: any) => ({
        ...q,
        created_at: q.created_at ? new Date(q.created_at).toLocaleString('ru-RU') : '',
        options: Array.isArray(q.options) ? q.options.join(', ') : JSON.stringify(q.options)
      })));
      XLSX.utils.book_append_sheet(workbook, questionsSheet, 'Вопросы мероприятий');
    }

    // 4. Ответы на вопросы
    const { data: answers } = await supabase.from('answers').select('*').order('created_at', { ascending: false });
    if (answers && answers.length > 0) {
      const answersSheet = XLSX.utils.json_to_sheet(answers.map((a: any) => ({
        ...a,
        created_at: a.created_at ? new Date(a.created_at).toLocaleString('ru-RU') : '',
        answer_data: this.formatAnswerData(a.answer_data)
      })));
      XLSX.utils.book_append_sheet(workbook, answersSheet, 'Ответы на вопросы');
    }

    // 5. Персональные вопросы
    const { data: targetedQuestions } = await supabase.from('targeted_questions').select('*').order('created_at', { ascending: false });
    if (targetedQuestions && targetedQuestions.length > 0) {
      const targetedQuestionsSheet = XLSX.utils.json_to_sheet(targetedQuestions.map((q: any) => ({
        ...q,
        created_at: q.created_at ? new Date(q.created_at).toLocaleString('ru-RU') : '',
        options: Array.isArray(q.options) ? q.options.join(', ') : JSON.stringify(q.options),
        target_values: Array.isArray(q.target_values) ? q.target_values.join(', ') : JSON.stringify(q.target_values)
      })));
      XLSX.utils.book_append_sheet(workbook, targetedQuestionsSheet, 'Персональные вопросы');
    }

    // 6. Ответы на персональные вопросы
    const { data: targetedAnswers } = await supabase.from('targeted_answers').select('*').order('created_at', { ascending: false });
    if (targetedAnswers && targetedAnswers.length > 0) {
      const targetedAnswersSheet = XLSX.utils.json_to_sheet(targetedAnswers.map((a: any) => ({
        ...a,
        created_at: a.created_at ? new Date(a.created_at).toLocaleString('ru-RU') : '',
        answer_data: this.formatAnswerData(a.answer_data)
      })));
      XLSX.utils.book_append_sheet(workbook, targetedAnswersSheet, 'Ответы персональные');
    }

    // 7. Задания
    const { data: assignments } = await supabase.from('assignments').select('*').order('created_at', { ascending: false });
    if (assignments && assignments.length > 0) {
      const assignmentsSheet = XLSX.utils.json_to_sheet(assignments.map((a: any) => ({
        ...a,
        created_at: a.created_at ? new Date(a.created_at).toLocaleString('ru-RU') : '',
        target_values: Array.isArray(a.target_values) ? a.target_values.join(', ') : a.target_values
      })));
      XLSX.utils.book_append_sheet(workbook, assignmentsSheet, 'Задания');
    }

    // 8. Выполненные задания
    const { data: submissions } = await supabase.from('assignment_submissions').select('*').order('created_at', { ascending: false });
    if (submissions && submissions.length > 0) {
      const submissionsSheet = XLSX.utils.json_to_sheet(submissions.map((s: any) => ({
        ...s,
        created_at: s.created_at ? new Date(s.created_at).toLocaleString('ru-RU') : '',
        updated_at: s.updated_at ? new Date(s.updated_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, submissionsSheet, 'Выполненные задания');
    }

    // 9. Баллы пользователей
    const { data: userPoints } = await supabase.from('user_points').select('*').order('created_at', { ascending: false });
    if (userPoints && userPoints.length > 0) {
      const userPointsSheet = XLSX.utils.json_to_sheet(userPoints.map((p: any) => ({
        ...p,
        created_at: p.created_at ? new Date(p.created_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, userPointsSheet, 'Баллы пользователей');
    }

    // 10. Достижения
    const { data: achievements } = await supabase.from('achievements').select('*').order('created_at', { ascending: false });
    if (achievements && achievements.length > 0) {
      const achievementsSheet = XLSX.utils.json_to_sheet(achievements.map((a: any) => ({
        ...a,
        created_at: a.created_at ? new Date(a.created_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, achievementsSheet, 'Достижения');
    }

    // 11. Достижения пользователей
    const { data: userAchievements } = await supabase.from('user_achievements').select('*').order('unlocked_at', { ascending: false });
    if (userAchievements && userAchievements.length > 0) {
      const userAchievementsSheet = XLSX.utils.json_to_sheet(userAchievements.map((ua: any) => ({
        ...ua,
        unlocked_at: ua.unlocked_at ? new Date(ua.unlocked_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, userAchievementsSheet, 'Достижения пользователей');
    }

    // 12. Уровни пользователей
    const { data: userLevels } = await supabase.from('user_levels').select('*').order('updated_at', { ascending: false });
    if (userLevels && userLevels.length > 0) {
      const userLevelsSheet = XLSX.utils.json_to_sheet(userLevels.map((ul: any) => ({
        ...ul,
        updated_at: ul.updated_at ? new Date(ul.updated_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, userLevelsSheet, 'Уровни пользователей');
    }

    // 13. Действия рефлексии
    const { data: reflectionActions } = await supabase.from('reflection_actions').select('*').order('created_at', { ascending: false });
    if (reflectionActions && reflectionActions.length > 0) {
      const reflectionActionsSheet = XLSX.utils.json_to_sheet(reflectionActions.map((ra: any) => ({
        ...ra,
        created_at: ra.created_at ? new Date(ra.created_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, reflectionActionsSheet, 'Действия рефлексии');
    }

    // 14. Направления
    const { data: directions } = await supabase.from('directions').select('*').order('created_at', { ascending: false });
    if (directions && directions.length > 0) {
      const directionsSheet = XLSX.utils.json_to_sheet(directions.map((d: any) => ({
        ...d,
        created_at: d.created_at ? new Date(d.created_at).toLocaleString('ru-RU') : '',
        updated_at: d.updated_at ? new Date(d.updated_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, directionsSheet, 'Направления');
    }

    // 15. Типы пользователей
    const { data: userTypes } = await supabase.from('user_types').select('*').order('created_at', { ascending: false });
    if (userTypes && userTypes.length > 0) {
      const userTypesSheet = XLSX.utils.json_to_sheet(userTypes.map((ut: any) => ({
        ...ut,
        created_at: ut.created_at ? new Date(ut.created_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, userTypesSheet, 'Типы пользователей');
    }

    // 16. Транзакции баллов
    const { data: pointsTransactions } = await supabase.from('points_transactions').select('*').order('created_at', { ascending: false });
    if (pointsTransactions && pointsTransactions.length > 0) {
      const pointsTransactionsSheet = XLSX.utils.json_to_sheet(pointsTransactions.map((pt: any) => ({
        ...pt,
        created_at: pt.created_at ? new Date(pt.created_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, pointsTransactionsSheet, 'Транзакции баллов');
    }

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return excelBuffer;
  }
}
