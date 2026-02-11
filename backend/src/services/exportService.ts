import { supabase } from './supabase';
import { logger } from '../utils/logger';
import { ExportFilters } from '../types';
// Используем динамический импорт для xlsx
let XLSX: any;
try {
  XLSX = require('xlsx');
} catch (e) {
  logger.error('xlsx library not installed. Run: npm install xlsx', e instanceof Error ? e : new Error(String(e)));
  throw new Error('xlsx library is required for export functionality');
}

export class ExportService {
  private static readonly EXPORT_CHUNK_SIZE = 1000;

  /**
   * Загрузка всех строк с пагинацией (обходит лимит 1000 строк Supabase)
   */
  private static async fetchAllRows<T = any>(
    buildQuery: (rangeFrom: number, rangeTo: number) => any
  ): Promise<T[]> {
    const all: T[] = [];
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await buildQuery(offset, offset + this.EXPORT_CHUNK_SIZE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...data);
      hasMore = data.length === this.EXPORT_CHUNK_SIZE;
      offset += this.EXPORT_CHUNK_SIZE;
    }
    return all;
  }

  /**
   * Экспорт всех ответов в Excel файл
   */
  static async exportAnswersToExcel(): Promise<Buffer> {
    try {
      // 1. Получаем ответы на мероприятия (все строки, с пагинацией)
      let eventAnswers: any[];
      try {
        eventAnswers = await this.fetchAllRows<any>((from, to) =>
          supabase
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
            .order('created_at', { ascending: false })
            .range(from, to)
        );
      } catch (e: any) {
        logger.error('Error fetching event answers', e instanceof Error ? e : new Error(String(e)));
        throw new Error(`Ошибка получения ответов на мероприятия: ${e?.message || e}`);
      }

      // 2. Получаем ответы на персональные вопросы (все строки, с пагинацией)
      let targetedAnswers: any[];
      try {
        targetedAnswers = await this.fetchAllRows<any>((from, to) =>
          supabase
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
            .order('created_at', { ascending: false })
            .range(from, to)
        );
      } catch (e: any) {
        logger.error('Error fetching targeted answers', e instanceof Error ? e : new Error(String(e)));
        throw new Error(`Ошибка получения ответов на персональные вопросы: ${e?.message || e}`);
      }

      // 3. Получаем выполненные задания (все строки, с пагинацией)
      let submissions: any[];
      try {
        submissions = await this.fetchAllRows<any>((from, to) =>
          supabase
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
            .order('created_at', { ascending: false })
            .range(from, to)
        );
      } catch (e: any) {
        logger.error('Error fetching submissions', e instanceof Error ? e : new Error(String(e)));
        throw new Error(`Ошибка получения выполненных заданий: ${e?.message || e}`);
      }

      // Подготовка данных для Excel
      const workbook = XLSX.utils.book_new();

      // Лист 1: Ответы на мероприятия
      const eventAnswersData = eventAnswers.map((answer: any) => ({
        'ID ответа': answer.id,
        'ID пользователя': answer.user_id,
        'Имя': answer.user?.first_name || '',
        'Фамилия': answer.user?.last_name || '',
        'Username': answer.user?.telegram_username || '',
        'Название программы': answer.event?.title || '',
        'Тип программы': answer.event?.type === 'diagnostic' ? 'Диагностика' : 'Программа',
        'Группа': answer.event?.group_name || '',
        'Текст вопроса': answer.question?.text || '',
        'Тип вопроса': answer.question?.type || '',
        'Ответ': this.formatAnswerData(answer.answer_data),
        'Дата ответа': answer.created_at ? new Date(answer.created_at).toLocaleString('ru-RU') : ''
      }));

    const eventAnswersSheet = XLSX.utils.json_to_sheet(eventAnswersData);
    XLSX.utils.book_append_sheet(workbook, eventAnswersSheet, 'Программа обучения');

    // Лист 2: Ответы на персональные вопросы
    const targetedAnswersData = targetedAnswers.map((answer: any) => ({
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
      const submissionsData = submissions.map((sub: any) => ({
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
    // Получаем все мероприятия (с пагинацией)
    const events = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('events')
        .select('*')
        .order('group_order', { ascending: true })
        .order('event_order', { ascending: true })
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    // Получаем детальную информацию о количестве вопросов и участников
    const eventsData = await Promise.all(events.map(async (event: any) => {
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
    XLSX.utils.book_append_sheet(workbook, sheet, 'Программа обучения');

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
    // Получаем все диагностики (с пагинацией)
    const diagnostics = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('events')
        .select('*')
        .eq('type', 'diagnostic')
        .order('group_order', { ascending: true })
        .order('event_order', { ascending: true })
        .range(from, to)
    );

    const workbook = XLSX.utils.book_new();

    // Для каждой диагностики создаем отдельный лист
    for (const diagnostic of diagnostics) {
      // Получаем вопросы диагностики (с пагинацией)
      const questions = await this.fetchAllRows<any>((from, to) =>
        supabase
          .from('questions')
          .select('*')
          .eq('event_id', diagnostic.id)
          .order('order_index', { ascending: true })
          .range(from, to)
      );

      // Получаем всех участников, которые ответили на диагностику (с пагинацией)
      const answers = await this.fetchAllRows<any>((from, to) =>
        supabase
          .from('answers')
          .select(`
            *,
            user:users(id, first_name, last_name, telegram_username),
            question:questions(text, type, options)
          `)
          .eq('event_id', diagnostic.id)
          .order('created_at', { ascending: false })
          .range(from, to)
      );

      // Группируем ответы по пользователям
      const userAnswersMap = new Map<string, any[]>();
      answers.forEach((answer: any) => {
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
        questions.forEach((question: any) => {
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
  static async exportAssignmentsWithResults(filters?: ExportFilters): Promise<Buffer> {
    // Получаем все задания (с пагинацией)
    const assignments = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    const workbook = XLSX.utils.book_new();

    // Для каждого задания создаем отдельный лист
    for (const assignment of assignments) {
      // Получаем отправки для этого задания с фильтрацией по датам (с пагинацией)
      const submissions = await this.fetchAllRows<any>((from, to) => {
        let query = supabase
          .from('assignment_submissions')
          .select(`
            *,
            user:users(id, first_name, last_name, telegram_username, telegram_id)
          `)
          .eq('assignment_id', assignment.id);

        if (filters?.dateFrom) {
          query = query.gte('created_at', filters.dateFrom);
        }
        if (filters?.dateTo) {
          const dateToEnd = new Date(filters.dateTo);
          dateToEnd.setHours(23, 59, 59, 999);
          query = query.lte('created_at', dateToEnd.toISOString());
        }

        return query.order('created_at', { ascending: false }).range(from, to);
      });

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
        'Значение': this.formatDate(assignment.created_at)
      });
      assignmentData.push({ 'Поле': '', 'Значение': '' });
      assignmentData.push({
        'Поле': '--- РЕЗУЛЬТАТЫ ВЫПОЛНЕНИЯ ---',
        'Значение': ''
      });
      assignmentData.push({ 'Поле': '', 'Значение': '' });

      // Данные по каждому участнику
      const resultsData = submissions.map((sub: any) => {
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
          'Номер попытки': sub.attempt_number || '',
          'Дата отправки': this.formatDate(sub.created_at),
          'Дата обновления': this.formatDate(sub.updated_at)
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
          'Номер попытки': '',
          'Дата отправки': '',
          'Дата обновления': ''
        })),
        ...resultsData
      ];

      // Создаем лист для задания (очищаем имя от недопустимых символов)
      const rawName = assignment.title || `Задание ${assignment.id}`;
      const sheetName = rawName
        .replace(/[:\\\/\?\*\[\]]/g, '') // Удаляем недопустимые символы
        .substring(0, 31) || `Задание_${assignment.id.substring(0, 20)}`; // Если имя пустое, используем ID
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
      'direction': 'По направлению',
      'individual': 'Персонально'
    };
    return labels[targetType] || targetType;
  }

  /**
   * Экспорт вопросов (мероприятия + персональные) с ответами участников
   */
  static async exportQuestionsWithAnswers(): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // 1. Вопросы к мероприятиям (все строки, с пагинацией)
    const eventQuestions = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('questions')
        .select(`
          *,
          event:events(title, type, group_name)
        `)
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    const eventQuestionsData = await Promise.all(eventQuestions.map(async (question: any) => {
      // Получаем все ответы на этот вопрос (с пагинацией на случай > 1000 ответов)
      const answers = await this.fetchAllRows<any>((from, to) =>
        supabase
          .from('answers')
          .select(`
            *,
            user:users(id, first_name, last_name, telegram_username)
          `)
          .eq('question_id', question.id)
          .order('created_at', { ascending: false })
          .range(from, to)
      );

      const answersText = answers.map((a: any) => {
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
        'Количество ответов': answers.length,
        'Ответы участников': answersText,
        'Дата создания': new Date(question.created_at).toLocaleString('ru-RU')
      };
    }));

    const eventQuestionsSheet = XLSX.utils.json_to_sheet(eventQuestionsData);
    XLSX.utils.book_append_sheet(workbook, eventQuestionsSheet, 'Вопросы программ');

    // 2. Персональные вопросы (все строки, с пагинацией)
    const targetedQuestions = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('targeted_questions')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    const targetedQuestionsData = await Promise.all(targetedQuestions.map(async (question: any) => {
      // Получаем все ответы на этот вопрос (с пагинацией на случай > 1000 ответов)
      const answers = await this.fetchAllRows<any>((from, to) =>
        supabase
          .from('targeted_answers')
          .select(`
            *,
            user:users(id, first_name, last_name, telegram_username)
          `)
          .eq('question_id', question.id)
          .order('created_at', { ascending: false })
          .range(from, to)
      );

      const answersText = answers.map((a: any) => {
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
        'Количество ответов': answers.length,
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
      'by_direction': 'По направлению',
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
  static async exportUsersFull(filters?: ExportFilters): Promise<Buffer> {
    // users.direction — строка (slug), не FK; directions загружаем отдельно
    const { data: directionsList } = await supabase.from('directions').select('slug, name');
    const directionNameMap = new Map<string, string>(
      (directionsList || []).map((d: any) => [d.slug, d.name || ''])
    );

    // Получаем все данные пользователей (с пагинацией)
    const users = await this.fetchAllRows<any>((from, to) => {
      let query = supabase.from('users').select('*');

      if (filters?.direction) {
        query = query.eq('direction', filters.direction);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      return query.order('created_at', { ascending: false }).range(from, to);
    });

    if (users.length === 0) {
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(workbook, sheet, 'Пользователи');
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    const userIds = users.map(u => u.id);

    // Получаем все связанные данные с пагинацией
    const [
      allAchievements,
      allUserLevels,
      allEventAnswers,
      allSubmissions,
      allTargetedAnswers,
      allPointsTransactions,
      allReflectionHistory,
      allEventNotes
    ] = await Promise.all([
      this.fetchAllRows<any>((from, to) =>
        supabase
          .from('user_achievements')
          .select('user_id, achievement:achievements(name)')
          .in('user_id', userIds)
          .order('user_id')
          .range(from, to)
      ),
      this.fetchAllRows<any>((from, to) =>
        supabase
          .from('user_levels')
          .select('user_id, level, experience_points')
          .in('user_id', userIds)
          .order('user_id')
          .range(from, to)
      ),
      this.fetchAllRows<any>((from, to) => {
        let query = supabase
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
          .in('user_id', userIds);
        if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom);
        if (filters?.dateTo) query = query.lte('created_at', filters.dateTo);
        if (filters?.eventId) query = query.eq('event_id', filters.eventId);
        return query.order('created_at', { ascending: false }).range(from, to);
      }),
      this.fetchAllRows<any>((from, to) => {
        let query = supabase
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
          .in('user_id', userIds);
        if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom);
        if (filters?.dateTo) query = query.lte('created_at', filters.dateTo);
        return query.order('created_at', { ascending: false }).range(from, to);
      }),
      this.fetchAllRows<any>((from, to) => {
        let query = supabase
          .from('targeted_answers')
          .select(`
            user_id,
            question_id,
            answer_data,
            created_at,
            question:targeted_questions(text, type)
          `)
          .in('user_id', userIds);
        if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom);
        if (filters?.dateTo) query = query.lte('created_at', filters.dateTo);
        return query.order('created_at', { ascending: false }).range(from, to);
      }),
      this.fetchAllRows<any>((from, to) =>
        supabase
          .from('points_transactions')
          .select('user_id, points, reason, created_at')
          .in('user_id', userIds)
          .order('created_at', { ascending: false })
          .range(from, to)
      ),
      this.fetchAllRows<any>((from, to) =>
        supabase
          .from('reflection_actions')
          .select('user_id, action_type, points_awarded, created_at')
          .in('user_id', userIds)
          .order('created_at', { ascending: false })
          .range(from, to)
      ),
      this.fetchAllRows<any>((from, to) =>
        supabase
          .from('event_notes')
          .select('user_id, event_id, note_text, created_at, updated_at, event:events!inner(id, title, event_date)')
          .in('user_id', userIds)
          .order('updated_at', { ascending: false })
          .range(from, to)
      )
    ]);

    // Группируем данные по user_id для быстрого доступа
    const achievementsMap = new Map<string, string[]>();
    allAchievements.forEach((a: any) => {
      const userId = a.user_id;
      if (!achievementsMap.has(userId)) {
        achievementsMap.set(userId, []);
      }
      if (a.achievement?.name) {
        achievementsMap.get(userId)!.push(a.achievement.name);
      }
    });

    const levelsMap = new Map<string, { level: number; experience_points: number }>();
    allUserLevels.forEach((ul: any) => {
      levelsMap.set(ul.user_id, { level: ul.level, experience_points: ul.experience_points });
    });

    // Группируем детальные ответы на мероприятия/диагностики по пользователям
    const eventAnswersMap = new Map<string, any[]>();
    const answersCountMap = new Map<string, number>();
    allEventAnswers.forEach((a: any) => {
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
    allSubmissions.forEach((s: any) => {
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
    allTargetedAnswers.forEach((a: any) => {
      const userId = a.user_id;
      if (!targetedAnswersDetailsMap.has(userId)) {
        targetedAnswersDetailsMap.set(userId, []);
      }
      targetedAnswersDetailsMap.get(userId)!.push(a);
      targetedAnswersCountMap.set(userId, (targetedAnswersCountMap.get(userId) || 0) + 1);
    });

    // Группируем транзакции и рефлексию по пользователям (берем только последние)
    const pointsMap = new Map<string, any[]>();
    allPointsTransactions.forEach((p: any) => {
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
    allReflectionHistory.forEach((r: any) => {
      const userId = r.user_id;
      if (!reflectionMap.has(userId)) {
        reflectionMap.set(userId, []);
      }
      const userReflection = reflectionMap.get(userId)!;
      if (userReflection.length < 10) {
        userReflection.push(r);
      }
    });

    // Создаем карту заметок по пользователям
    const eventNotesMap = new Map<string, any[]>();
    allEventNotes.forEach((note: any) => {
      const userId = note.user_id;
      if (!eventNotesMap.has(userId)) {
        eventNotesMap.set(userId, []);
      }
      // Преобразуем event из массива в объект, если нужно
      const eventData = Array.isArray(note.event) ? note.event[0] : note.event;
      eventNotesMap.get(userId)!.push({
        ...note,
        event: eventData
      });
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
      const userEventNotes = eventNotesMap.get(userId) || [];

      const recentPointsText = recentPoints.map((p: any) => 
        `${new Date(p.created_at).toLocaleDateString('ru-RU')}: ${p.points} (${p.reason || ''})`
      ).join('; ');

      const reflectionHistoryText = reflectionHistory.map((r: any) => 
        `${new Date(r.created_at).toLocaleDateString('ru-RU')}: ${r.action_type} (+${r.points_awarded})`
      ).join('; ');

      const eventNotesText = userEventNotes.map((note: any) => 
        `${note.event?.title || 'Программа'} (${note.event?.event_date ? new Date(note.event.event_date).toLocaleDateString('ru-RU') : 'без даты'}): ${note.note_text}`
      ).join('; ');

      const directionSlug = user.direction || '';
      const directionName = directionNameMap.get(directionSlug) || directionSlug;

      return {
        'ID': user.id,
        'Telegram ID': user.telegram_id || '',
        'Имя': user.first_name || '',
        'Фамилия': user.last_name || '',
        'Отчество': user.middle_name || '',
        'Username': user.telegram_username || '',
        'Мотивация': user.motivation || '',
        'Статус': user.status === 'registered' ? 'Зарегистрирован' : 'Новый',
        'Направление (slug)': directionSlug,
        'Направление': directionName,
        'Дата регистрации': new Date(user.created_at).toLocaleString('ru-RU'),
        'Общие баллы': user.total_points || 0,
        'Баллы рефлексии': user.reflection_points || 0,
        'Уровень рефлексии': user.reflection_level || 1,
        'Уровень (геймификация)': userLevel?.level || user.current_level || 1,
        'Опыт': userLevel?.experience_points || 0,
        'Достижения': achievementsList,
        'Участие в программах': eventsCount,
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
        'Ответы на программы': eventAnswersText,
        'Ответы на персональные вопросы': targetedAnswersText,
        'Ответы на задания': assignmentAnswersText,
        'Заметки по программам': eventNotesText
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
    const users = await this.fetchAllRows<any>((from, to) =>
      supabase.from('users').select('*').order('created_at', { ascending: false }).range(from, to)
    );
    if (users.length > 0) {
      const usersSheet = XLSX.utils.json_to_sheet(users.map((u: any) => ({
        ...u,
        created_at: u.created_at ? new Date(u.created_at).toLocaleString('ru-RU') : '',
        updated_at: u.updated_at ? new Date(u.updated_at).toLocaleString('ru-RU') : '',
      })));
      XLSX.utils.book_append_sheet(workbook, usersSheet, 'Пользователи');
    }

    // 2. Программы обучения
    const events = await this.fetchAllRows<any>((from, to) =>
      supabase.from('events').select('*').order('created_at', { ascending: false }).range(from, to)
    );
    if (events.length > 0) {
      const eventsSheet = XLSX.utils.json_to_sheet(events.map((e: any) => ({
        ...e,
        created_at: e.created_at ? new Date(e.created_at).toLocaleString('ru-RU') : '',
        updated_at: e.updated_at ? new Date(e.updated_at).toLocaleString('ru-RU') : '',
        event_date: e.event_date ? new Date(e.event_date).toLocaleDateString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, eventsSheet, 'Программа обучения');
    }

    // 3. Вопросы к программам
    const questions = await this.fetchAllRows<any>((from, to) =>
      supabase.from('questions').select('*').order('created_at', { ascending: false }).range(from, to)
    );
    if (questions.length > 0) {
      const questionsSheet = XLSX.utils.json_to_sheet(questions.map((q: any) => ({
        ...q,
        created_at: q.created_at ? new Date(q.created_at).toLocaleString('ru-RU') : '',
        options: Array.isArray(q.options) ? q.options.join(', ') : JSON.stringify(q.options)
      })));
      XLSX.utils.book_append_sheet(workbook, questionsSheet, 'Вопросы программ');
    }

    // 4. Ответы на вопросы
    const answers = await this.fetchAllRows<any>((from, to) =>
      supabase.from('answers').select('*').order('created_at', { ascending: false }).range(from, to)
    );
    if (answers.length > 0) {
      const answersSheet = XLSX.utils.json_to_sheet(answers.map((a: any) => ({
        ...a,
        created_at: a.created_at ? new Date(a.created_at).toLocaleString('ru-RU') : '',
        answer_data: this.formatAnswerData(a.answer_data)
      })));
      XLSX.utils.book_append_sheet(workbook, answersSheet, 'Ответы на вопросы');
    }

    // 5. Персональные вопросы
    const targetedQuestions = await this.fetchAllRows<any>((from, to) =>
      supabase.from('targeted_questions').select('*').order('created_at', { ascending: false }).range(from, to)
    );
    if (targetedQuestions.length > 0) {
      const targetedQuestionsSheet = XLSX.utils.json_to_sheet(targetedQuestions.map((q: any) => ({
        ...q,
        created_at: q.created_at ? new Date(q.created_at).toLocaleString('ru-RU') : '',
        options: Array.isArray(q.options) ? q.options.join(', ') : JSON.stringify(q.options),
        target_values: Array.isArray(q.target_values) ? q.target_values.join(', ') : JSON.stringify(q.target_values)
      })));
      XLSX.utils.book_append_sheet(workbook, targetedQuestionsSheet, 'Персональные вопросы');
    }

    // 6. Ответы на персональные вопросы
    const targetedAnswers = await this.fetchAllRows<any>((from, to) =>
      supabase.from('targeted_answers').select('*').order('created_at', { ascending: false }).range(from, to)
    );
    if (targetedAnswers.length > 0) {
      const targetedAnswersSheet = XLSX.utils.json_to_sheet(targetedAnswers.map((a: any) => ({
        ...a,
        created_at: a.created_at ? new Date(a.created_at).toLocaleString('ru-RU') : '',
        answer_data: this.formatAnswerData(a.answer_data)
      })));
      XLSX.utils.book_append_sheet(workbook, targetedAnswersSheet, 'Ответы персональные');
    }

    // 7. Задания
    const assignments = await this.fetchAllRows<any>((from, to) =>
      supabase.from('assignments').select('*').order('created_at', { ascending: false }).range(from, to)
    );
    if (assignments.length > 0) {
      const assignmentsSheet = XLSX.utils.json_to_sheet(assignments.map((a: any) => ({
        ...a,
        created_at: a.created_at ? new Date(a.created_at).toLocaleString('ru-RU') : '',
        target_values: Array.isArray(a.target_values) ? a.target_values.join(', ') : a.target_values
      })));
      XLSX.utils.book_append_sheet(workbook, assignmentsSheet, 'Задания');
    }

    // 8. Выполненные задания
    const submissions = await this.fetchAllRows<any>((from, to) =>
      supabase.from('assignment_submissions').select('*').order('created_at', { ascending: false }).range(from, to)
    );
    if (submissions.length > 0) {
      const submissionsSheet = XLSX.utils.json_to_sheet(submissions.map((s: any) => ({
        ...s,
        created_at: s.created_at ? new Date(s.created_at).toLocaleString('ru-RU') : '',
        updated_at: s.updated_at ? new Date(s.updated_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, submissionsSheet, 'Выполненные задания');
    }

    // 9. Баллы пользователей
    const userPoints = await this.fetchAllRows<any>((from, to) =>
      supabase.from('user_points').select('*').order('created_at', { ascending: false }).range(from, to)
    );
    if (userPoints.length > 0) {
      const userPointsSheet = XLSX.utils.json_to_sheet(userPoints.map((p: any) => ({
        ...p,
        created_at: p.created_at ? new Date(p.created_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, userPointsSheet, 'Баллы пользователей');
    }

    // 10. Достижения
    const achievements = await this.fetchAllRows<any>((from, to) =>
      supabase.from('achievements').select('*').order('created_at', { ascending: false }).range(from, to)
    );
    if (achievements.length > 0) {
      const achievementsSheet = XLSX.utils.json_to_sheet(achievements.map((a: any) => ({
        ...a,
        created_at: a.created_at ? new Date(a.created_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, achievementsSheet, 'Достижения');
    }

    // 11. Достижения пользователей
    const userAchievements = await this.fetchAllRows<any>((from, to) =>
      supabase.from('user_achievements').select('*').order('unlocked_at', { ascending: false }).range(from, to)
    );
    if (userAchievements.length > 0) {
      const userAchievementsSheet = XLSX.utils.json_to_sheet(userAchievements.map((ua: any) => ({
        ...ua,
        unlocked_at: ua.unlocked_at ? new Date(ua.unlocked_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, userAchievementsSheet, 'Достижения пользователей');
    }

    // 12. Уровни пользователей
    const userLevels = await this.fetchAllRows<any>((from, to) =>
      supabase.from('user_levels').select('*').order('updated_at', { ascending: false }).range(from, to)
    );
    if (userLevels.length > 0) {
      const userLevelsSheet = XLSX.utils.json_to_sheet(userLevels.map((ul: any) => ({
        ...ul,
        updated_at: ul.updated_at ? new Date(ul.updated_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, userLevelsSheet, 'Уровни пользователей');
    }

    // 13. Действия рефлексии
    const reflectionActions = await this.fetchAllRows<any>((from, to) =>
      supabase.from('reflection_actions').select('*').order('created_at', { ascending: false }).range(from, to)
    );
    if (reflectionActions.length > 0) {
      const reflectionActionsSheet = XLSX.utils.json_to_sheet(reflectionActions.map((ra: any) => ({
        ...ra,
        created_at: ra.created_at ? new Date(ra.created_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, reflectionActionsSheet, 'Действия рефлексии');
    }

    // 14. Направления
    const directions = await this.fetchAllRows<any>((from, to) =>
      supabase.from('directions').select('*').order('created_at', { ascending: false }).range(from, to)
    );
    if (directions.length > 0) {
      const directionsSheet = XLSX.utils.json_to_sheet(directions.map((d: any) => ({
        ...d,
        created_at: d.created_at ? new Date(d.created_at).toLocaleString('ru-RU') : '',
        updated_at: d.updated_at ? new Date(d.updated_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, directionsSheet, 'Направления');
    }

    // 15. Транзакции баллов
    const pointsTransactions = await this.fetchAllRows<any>((from, to) =>
      supabase.from('points_transactions').select('*').order('created_at', { ascending: false }).range(from, to)
    );
    if (pointsTransactions.length > 0) {
      const pointsTransactionsSheet = XLSX.utils.json_to_sheet(pointsTransactions.map((pt: any) => ({
        ...pt,
        created_at: pt.created_at ? new Date(pt.created_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, pointsTransactionsSheet, 'Транзакции баллов');
    }

    // 16. Рассылки (broadcasts)
    const broadcasts = await this.fetchAllRows<any>((from, to) =>
      supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).range(from, to)
    );
    if (broadcasts.length > 0) {
      const broadcastsSheet = XLSX.utils.json_to_sheet(broadcasts.map((b: any) => ({
        ...b,
        created_at: b.created_at ? new Date(b.created_at).toLocaleString('ru-RU') : '',
        scheduled_at: b.scheduled_at ? new Date(b.scheduled_at).toLocaleString('ru-RU') : '',
        sent_at: b.sent_at ? new Date(b.sent_at).toLocaleString('ru-RU') : '',
        target_values: Array.isArray(b.target_values) ? b.target_values.join(', ') : b.target_values
      })));
      XLSX.utils.book_append_sheet(workbook, broadcastsSheet, 'Рассылки');
    }

    // 17. Заметки по мероприятиям (event_notes)
    const eventNotes = await this.fetchAllRows<any>((from, to) =>
      supabase.from('event_notes').select('*').order('created_at', { ascending: false }).range(from, to)
    );
    if (eventNotes.length > 0) {
      const eventNotesSheet = XLSX.utils.json_to_sheet(eventNotes.map((n: any) => ({
        ...n,
        created_at: n.created_at ? new Date(n.created_at).toLocaleString('ru-RU') : '',
        updated_at: n.updated_at ? new Date(n.updated_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, eventNotesSheet, 'Заметки мероприятий');
    }

    // 18. Рандомайзеры (randomizer_questions)
    const randomizers = await this.fetchAllRows<any>((from, to) =>
      supabase.from('randomizer_questions').select('*').order('created_at', { ascending: false }).range(from, to)
    );
    if (randomizers.length > 0) {
      const randomizersSheet = XLSX.utils.json_to_sheet(randomizers.map((r: any) => ({
        ...r,
        created_at: r.created_at ? new Date(r.created_at).toLocaleString('ru-RU') : '',
        distributed_at: r.distributed_at ? new Date(r.distributed_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, randomizersSheet, 'Рандомайзеры');
    }

    // 19. Участники рандомайзеров (randomizer_participants)
    const randomizerParticipants = await this.fetchAllRows<any>((from, to) =>
      supabase.from('randomizer_participants').select('*').order('participated_at', { ascending: false }).range(from, to)
    );
    if (randomizerParticipants.length > 0) {
      const randomizerParticipantsSheet = XLSX.utils.json_to_sheet(randomizerParticipants.map((rp: any) => ({
        ...rp,
        participated_at: rp.participated_at ? new Date(rp.participated_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, randomizerParticipantsSheet, 'Участники рандомайзеров');
    }

    // 20. Распределения рандомайзеров (randomizer_distributions)
    const randomizerDistributions = await this.fetchAllRows<any>((from, to) =>
      supabase.from('randomizer_distributions').select('*').order('distributed_at', { ascending: false }).range(from, to)
    );
    if (randomizerDistributions.length > 0) {
      const randomizerDistributionsSheet = XLSX.utils.json_to_sheet(randomizerDistributions.map((rd: any) => ({
        ...rd,
        distributed_at: rd.distributed_at ? new Date(rd.distributed_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, randomizerDistributionsSheet, 'Распределения рандомайзеров');
    }

    // 21. Уведомления (notifications)
    const notifications = await this.fetchAllRows<any>((from, to) =>
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).range(from, to)
    );
    if (notifications.length > 0) {
      const notificationsSheet = XLSX.utils.json_to_sheet(notifications.map((n: any) => ({
        ...n,
        created_at: n.created_at ? new Date(n.created_at).toLocaleString('ru-RU') : '',
        read_at: n.read_at ? new Date(n.read_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, notificationsSheet, 'Уведомления');
    }

    // 22. Настройки пользователей (user_preferences)
    const userPreferences = await this.fetchAllRows<any>((from, to) =>
      supabase.from('user_preferences').select('*').order('updated_at', { ascending: false }).range(from, to)
    );
    if (userPreferences.length > 0) {
      const userPreferencesSheet = XLSX.utils.json_to_sheet(userPreferences.map((up: any) => ({
        ...up,
        updated_at: up.updated_at ? new Date(up.updated_at).toLocaleString('ru-RU') : ''
      })));
      XLSX.utils.book_append_sheet(workbook, userPreferencesSheet, 'Настройки пользователей');
    }

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return excelBuffer;
  }

  /**
   * Полный экспорт всего приложения в один Excel файл с человекочитаемыми данными
   * Включает все таблицы со связанными данными
   */
  static async exportFullApplication(): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // users.direction — строка (slug), не FK; directions загружаем отдельно
    const { data: directionsList } = await supabase.from('directions').select('slug, name');
    const directionNameMap = new Map<string, string>(
      (directionsList || []).map((d: any) => [d.slug, d.name || ''])
    );

    // ==================== ЛИСТ 1: ПОЛЬЗОВАТЕЛИ С ПОЛНЫМИ ДАННЫМИ ====================
    const users = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    const usersData = users.map((u: any) => {
      const directionSlug = u.direction || '';
      const directionName = directionNameMap.get(directionSlug) || directionSlug;
      return {
      'ID': u.id,
      'Telegram ID': u.telegram_id || '',
      'Имя': u.first_name || '',
      'Фамилия': u.last_name || '',
      'Отчество': u.middle_name || '',
      'Username': u.telegram_username || '',
      'Телефон': u.phone || '',
      'Email': u.email || '',
      'Мотивация': u.motivation || '',
      'Направление (slug)': directionSlug,
      'Направление': directionName,
      'Статус': u.status === 'registered' ? 'Зарегистрирован' : 'Новый',
      'Администратор': u.is_admin === 1 ? 'Да' : 'Нет',
      'Общие баллы': u.total_points || 0,
      'Баллы рефлексии': u.reflection_points || 0,
      'Уровень рефлексии': u.reflection_level || 1,
      'Текущий уровень': u.current_level || 1,
      'Дата регистрации': this.formatDate(u.created_at),
      'Дата обновления': this.formatDate(u.updated_at)
    };
    });
    if (usersData.length > 0) {
      const usersSheet = XLSX.utils.json_to_sheet(usersData);
      XLSX.utils.book_append_sheet(workbook, usersSheet, 'Пользователи');
    }

    // ==================== ЛИСТ 2: ПРОГРАММЫ ОБУЧЕНИЯ ====================
    const events = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('events')
        .select('*')
        .order('group_order', { ascending: true })
        .order('event_order', { ascending: true })
        .range(from, to)
    );

    const eventsData = events.map((e: any) => ({
      'ID': e.id,
      'Название': e.title || '',
      'Описание': e.description || '',
      'Спикер': e.speaker || '',
      'Аудитория': e.audience || '',
      'Тип': e.type === 'diagnostic' ? 'Диагностика' : 'Мероприятие',
      'Статус': this.getEventStatusLabel(e.status),
      'Группа': e.group_name || '',
      'Порядок группы': e.group_order || 0,
      'Порядок в группе': e.event_order || 0,
      'Дата': this.formatDateOnly(e.event_date),
      'Время': e.event_time || '',
      'Местоположение': e.location || '',
      'Запланированная публикация': this.formatDate(e.scheduled_at),
      'Дата создания': this.formatDate(e.created_at),
      'Дата обновления': this.formatDate(e.updated_at)
    }));
    if (eventsData.length > 0) {
      const eventsSheet = XLSX.utils.json_to_sheet(eventsData);
      XLSX.utils.book_append_sheet(workbook, eventsSheet, 'Программы обучения');
    }

    // ==================== ЛИСТ 3: ВОПРОСЫ К ПРОГРАММАМ ====================
    const questions = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('questions')
        .select(`*, event:events(title, type)`)
        .order('event_id')
        .order('order_index', { ascending: true })
        .range(from, to)
    );

    const questionsData = questions.map((q: any) => ({
      'ID': q.id,
      'Программа': q.event?.title || '',
      'Тип программы': q.event?.type === 'diagnostic' ? 'Диагностика' : 'Мероприятие',
      'Текст вопроса': q.text || '',
      'Тип вопроса': q.type || '',
      'Варианты ответов': Array.isArray(q.options) ? q.options.join(' | ') : '',
      'Лимит символов': q.char_limit || '',
      'Порядок': q.order_index || 0,
      'Дата создания': this.formatDate(q.created_at)
    }));
    if (questionsData.length > 0) {
      const questionsSheet = XLSX.utils.json_to_sheet(questionsData);
      XLSX.utils.book_append_sheet(workbook, questionsSheet, 'Вопросы программ');
    }

    // ==================== ЛИСТ 4: ОТВЕТЫ НА ПРОГРАММЫ/ДИАГНОСТИКИ ====================
    const answers = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('answers')
        .select(`
          *,
          user:users(first_name, last_name, telegram_username),
          event:events(title, type, group_name),
          question:questions(text, type)
        `)
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    const answersData = answers.map((a: any) => {
      const user = Array.isArray(a.user) ? a.user[0] : a.user;
      const event = Array.isArray(a.event) ? a.event[0] : a.event;
      const question = Array.isArray(a.question) ? a.question[0] : a.question;
      
      return {
        'ID': a.id,
        'Пользователь': `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.telegram_username || a.user_id,
        'Программа': event?.title || '',
        'Тип': event?.type === 'diagnostic' ? 'Диагностика' : 'Мероприятие',
        'Группа': event?.group_name || '',
        'Вопрос': question?.text || '',
        'Тип вопроса': question?.type || '',
        'Ответ': this.formatAnswerData(a.answer_data),
        'Дата ответа': this.formatDate(a.created_at)
      };
    });
    if (answersData.length > 0) {
      const answersSheet = XLSX.utils.json_to_sheet(answersData);
      XLSX.utils.book_append_sheet(workbook, answersSheet, 'Ответы на программы');
    }

    // ==================== ЛИСТ 5: ПЕРСОНАЛЬНЫЕ ВОПРОСЫ ====================
    const targetedQuestions = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('targeted_questions')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    const targetedQuestionsData = targetedQuestions.map((q: any) => ({
      'ID': q.id,
      'Текст вопроса': q.text || '',
      'Тип вопроса': q.type || '',
      'Варианты ответов': Array.isArray(q.options) ? q.options.join(' | ') : '',
      'Лимит символов': q.char_limit || '',
      'Целевая аудитория': this.getTargetAudienceLabel(q.target_audience),
      'Целевые значения': Array.isArray(q.target_values) ? q.target_values.join(', ') : '',
      'Группа': q.group_name || '',
      'Порядок группы': q.group_order || 0,
      'Порядок в группе': q.question_order || 0,
      'Статус': q.status === 'published' ? 'Опубликовано' : q.status === 'draft' ? 'Черновик' : 'Архив',
      'Запланированная публикация': this.formatDate(q.scheduled_at),
      'Дата создания': this.formatDate(q.created_at)
    }));
    if (targetedQuestionsData.length > 0) {
      const targetedQuestionsSheet = XLSX.utils.json_to_sheet(targetedQuestionsData);
      XLSX.utils.book_append_sheet(workbook, targetedQuestionsSheet, 'Персональные вопросы');
    }

    // ==================== ЛИСТ 6: ОТВЕТЫ НА ПЕРСОНАЛЬНЫЕ ВОПРОСЫ ====================
    const targetedAnswers = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('targeted_answers')
        .select(`
          *,
          user:users(first_name, last_name, telegram_username),
          question:targeted_questions(text, type, group_name)
        `)
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    const targetedAnswersData = targetedAnswers.map((a: any) => {
      const user = Array.isArray(a.user) ? a.user[0] : a.user;
      const question = Array.isArray(a.question) ? a.question[0] : a.question;
      
      return {
        'ID': a.id,
        'Пользователь': `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.telegram_username || a.user_id,
        'Вопрос': question?.text || '',
        'Тип вопроса': question?.type || '',
        'Группа вопроса': question?.group_name || '',
        'Ответ': this.formatAnswerData(a.answer_data),
        'Дата ответа': this.formatDate(a.created_at)
      };
    });
    if (targetedAnswersData.length > 0) {
      const targetedAnswersSheet = XLSX.utils.json_to_sheet(targetedAnswersData);
      XLSX.utils.book_append_sheet(workbook, targetedAnswersSheet, 'Ответы персональные');
    }

    // ==================== ЛИСТ 7: ЗАДАНИЯ ====================
    const assignments = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    const assignmentsData = assignments.map((a: any) => ({
      'ID': a.id,
      'Название': a.title || '',
      'Описание': a.description || '',
      'Формат ответа': this.getAnswerFormatLabel(a.answer_format),
      'Награда (баллы)': a.reward || 0,
      'Целевая аудитория': this.getTargetTypeLabel(a.target_type),
      'Целевые значения': Array.isArray(a.target_values) ? a.target_values.join(', ') : '',
      'Статус': a.status === 'published' ? 'Опубликовано' : 'Черновик',
      'Запланированная публикация': this.formatDate(a.scheduled_at),
      'Дата создания': this.formatDate(a.created_at)
    }));
    if (assignmentsData.length > 0) {
      const assignmentsSheet = XLSX.utils.json_to_sheet(assignmentsData);
      XLSX.utils.book_append_sheet(workbook, assignmentsSheet, 'Задания');
    }

    // ==================== ЛИСТ 8: ВЫПОЛНЕННЫЕ ЗАДАНИЯ ====================
    const submissions = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('assignment_submissions')
        .select(`
          *,
          user:users(first_name, last_name, telegram_username),
          assignment:assignments(title, answer_format, reward)
        `)
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    const submissionsData = submissions.map((s: any) => {
      const user = Array.isArray(s.user) ? s.user[0] : s.user;
      const assignment = Array.isArray(s.assignment) ? s.assignment[0] : s.assignment;
      
      return {
        'ID': s.id,
        'Пользователь': `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.telegram_username || s.user_id,
        'Задание': assignment?.title || '',
        'Формат': this.getAnswerFormatLabel(assignment?.answer_format),
        'Ответ': s.content || '',
        'URL файла': s.file_url || '',
        'Статус': this.getStatusLabel(s.status),
        'Комментарий админа': s.admin_comment || '',
        'Номер попытки': s.attempt_number || '',
        'Награда': assignment?.reward || 0,
        'Дата отправки': this.formatDate(s.created_at),
        'Дата обновления': this.formatDate(s.updated_at)
      };
    });
    if (submissionsData.length > 0) {
      const submissionsSheet = XLSX.utils.json_to_sheet(submissionsData);
      XLSX.utils.book_append_sheet(workbook, submissionsSheet, 'Выполненные задания');
    }

    // ==================== ЛИСТ 9: РАССЫЛКИ ====================
    const broadcasts = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    const broadcastsData = broadcasts.map((b: any) => ({
      'ID': b.id,
      'Заголовок': b.title || '',
      'Текст': b.content || '',
      'Тип': b.type || '',
      'Целевая аудитория': this.getTargetTypeLabel(b.target_type),
      'Целевые значения': Array.isArray(b.target_values) ? b.target_values.join(', ') : '',
      'URL изображения': b.image_url || '',
      'URL кнопки': b.button_url || '',
      'Текст кнопки': b.button_text || '',
      'Статус': b.status || '',
      'Запланировано на': this.formatDate(b.scheduled_at),
      'Отправлено': this.formatDate(b.sent_at),
      'Дата создания': this.formatDate(b.created_at)
    }));
    if (broadcastsData.length > 0) {
      const broadcastsSheet = XLSX.utils.json_to_sheet(broadcastsData);
      XLSX.utils.book_append_sheet(workbook, broadcastsSheet, 'Рассылки');
    }

    // ==================== ЛИСТ 10: ЗАМЕТКИ ПО МЕРОПРИЯТИЯМ ====================
    const eventNotes = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('event_notes')
        .select(`
          *,
          user:users(first_name, last_name, telegram_username),
          event:events(title)
        `)
        .order('updated_at', { ascending: false })
        .range(from, to)
    );

    const eventNotesData = eventNotes.map((n: any) => {
      const user = Array.isArray(n.user) ? n.user[0] : n.user;
      const event = Array.isArray(n.event) ? n.event[0] : n.event;
      
      return {
        'ID': n.id,
        'Пользователь': `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.telegram_username || n.user_id,
        'Программа': event?.title || '',
        'Заметка': n.note_text || '',
        'Дата создания': this.formatDate(n.created_at),
        'Дата обновления': this.formatDate(n.updated_at)
      };
    });
    if (eventNotesData.length > 0) {
      const eventNotesSheet = XLSX.utils.json_to_sheet(eventNotesData);
      XLSX.utils.book_append_sheet(workbook, eventNotesSheet, 'Заметки пользователей');
    }

    // ==================== ЛИСТ 11: РАНДОМАЙЗЕРЫ ====================
    const randomizers = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('randomizer_questions')
        .select(`
          *,
          assignment:assignments(title)
        `)
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    const randomizersData = randomizers.map((r: any) => {
      const assignment = Array.isArray(r.assignment) ? r.assignment[0] : r.assignment;
      
      return {
        'ID': r.id,
        'Задание': assignment?.title || '',
        'Режим': r.randomizer_mode === 'tables' ? 'По столам' : 'Простой',
        'Мин. число': r.number_min ?? 1,
        'Макс. число': r.number_max ?? 100,
        'Количество столов': r.tables_count || '',
        'Статус': r.status || '',
        'Распределено': this.formatDate(r.distributed_at),
        'Дата создания': this.formatDate(r.created_at)
      };
    });
    if (randomizersData.length > 0) {
      const randomizersSheet = XLSX.utils.json_to_sheet(randomizersData);
      XLSX.utils.book_append_sheet(workbook, randomizersSheet, 'Рандомайзеры');
    }

    // ==================== ЛИСТ 12: УЧАСТНИКИ РАНДОМАЙЗЕРОВ ====================
    const randomizerParticipants = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('randomizer_participants')
        .select(`
          *,
          user:users(first_name, last_name, telegram_username),
          randomizer:randomizer_questions(assignment:assignments(title))
        `)
        .order('participated_at', { ascending: false })
        .range(from, to)
    );

    const randomizerParticipantsData = randomizerParticipants.map((rp: any) => {
      const user = Array.isArray(rp.user) ? rp.user[0] : rp.user;
      const randomizer = Array.isArray(rp.randomizer) ? rp.randomizer[0] : rp.randomizer;
      const assignment = randomizer?.assignment;
      const assignmentObj = Array.isArray(assignment) ? assignment[0] : assignment;
      
      return {
        'ID': rp.id,
        'Пользователь': `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.telegram_username || rp.user_id,
        'Задание': assignmentObj?.title || '',
        'Дата участия': this.formatDate(rp.participated_at)
      };
    });
    if (randomizerParticipantsData.length > 0) {
      const randomizerParticipantsSheet = XLSX.utils.json_to_sheet(randomizerParticipantsData);
      XLSX.utils.book_append_sheet(workbook, randomizerParticipantsSheet, 'Участники рандомайзеров');
    }

    // ==================== ЛИСТ 13: РАСПРЕДЕЛЕНИЯ РАНДОМАЙЗЕРОВ ====================
    const randomizerDistributions = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('randomizer_distributions')
        .select(`
          *,
          user:users(first_name, last_name, telegram_username),
          randomizer:randomizer_questions(assignment:assignments(title))
        `)
        .order('distributed_at', { ascending: false })
        .range(from, to)
    );

    const randomizerDistributionsData = randomizerDistributions.map((rd: any) => {
      const user = Array.isArray(rd.user) ? rd.user[0] : rd.user;
      const randomizer = Array.isArray(rd.randomizer) ? rd.randomizer[0] : rd.randomizer;
      const assignment = randomizer?.assignment;
      const assignmentObj = Array.isArray(assignment) ? assignment[0] : assignment;
      
      return {
        'ID': rd.id,
        'Пользователь': `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.telegram_username || rd.user_id,
        'Задание': assignmentObj?.title || '',
        'Присвоенное число': rd.random_number ?? rd.table_number ?? '',
        'Номер стола': rd.table_number ?? '',
        'Дата распределения': this.formatDate(rd.distributed_at)
      };
    });
    if (randomizerDistributionsData.length > 0) {
      const randomizerDistributionsSheet = XLSX.utils.json_to_sheet(randomizerDistributionsData);
      XLSX.utils.book_append_sheet(workbook, randomizerDistributionsSheet, 'Распределения');
    }

    // ==================== ЛИСТ 14: НАПРАВЛЕНИЯ ====================
    const directions = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('directions')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    const directionsData = directions.map((d: any) => ({
      'ID': d.id,
      'Название': d.name || '',
      'Slug': d.slug || '',
      'Описание': d.description || '',
      'Дата создания': this.formatDate(d.created_at),
      'Дата обновления': this.formatDate(d.updated_at)
    }));
    if (directionsData.length > 0) {
      const directionsSheet = XLSX.utils.json_to_sheet(directionsData);
      XLSX.utils.book_append_sheet(workbook, directionsSheet, 'Направления');
    }

    // ==================== ЛИСТ 15: ДОСТИЖЕНИЯ ====================
    const achievements = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('achievements')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    const achievementsData = achievements.map((a: any) => ({
      'ID': a.id,
      'Название': a.name || '',
      'Описание': a.description || '',
      'Иконка': a.icon || '',
      'Очки': a.points || 0,
      'Дата создания': this.formatDate(a.created_at)
    }));
    if (achievementsData.length > 0) {
      const achievementsSheet = XLSX.utils.json_to_sheet(achievementsData);
      XLSX.utils.book_append_sheet(workbook, achievementsSheet, 'Достижения');
    }

    // ==================== ЛИСТ 16: ДОСТИЖЕНИЯ ПОЛЬЗОВАТЕЛЕЙ ====================
    const userAchievements = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('user_achievements')
        .select(`
          *,
          user:users(first_name, last_name, telegram_username),
          achievement:achievements(name)
        `)
        .order('unlocked_at', { ascending: false })
        .range(from, to)
    );

    const userAchievementsData = userAchievements.map((ua: any) => {
      const user = Array.isArray(ua.user) ? ua.user[0] : ua.user;
      const achievement = Array.isArray(ua.achievement) ? ua.achievement[0] : ua.achievement;
      
      return {
        'ID': ua.id,
        'Пользователь': `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.telegram_username || ua.user_id,
        'Достижение': achievement?.name || '',
        'Дата получения': this.formatDate(ua.unlocked_at)
      };
    });
    if (userAchievementsData.length > 0) {
      const userAchievementsSheet = XLSX.utils.json_to_sheet(userAchievementsData);
      XLSX.utils.book_append_sheet(workbook, userAchievementsSheet, 'Достижения польз.');
    }

    // ==================== ЛИСТ 17: УРОВНИ ПОЛЬЗОВАТЕЛЕЙ ====================
    const userLevels = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('user_levels')
        .select(`
          *,
          user:users(first_name, last_name, telegram_username)
        `)
        .order('level', { ascending: false })
        .range(from, to)
    );

    const userLevelsData = userLevels.map((ul: any) => {
      const user = Array.isArray(ul.user) ? ul.user[0] : ul.user;
      
      return {
        'ID': ul.id,
        'Пользователь': `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.telegram_username || ul.user_id,
        'Уровень': ul.level || 1,
        'Очки опыта': ul.experience_points || 0,
        'Дата обновления': this.formatDate(ul.updated_at)
      };
    });
    if (userLevelsData.length > 0) {
      const userLevelsSheet = XLSX.utils.json_to_sheet(userLevelsData);
      XLSX.utils.book_append_sheet(workbook, userLevelsSheet, 'Уровни пользователей');
    }

    // ==================== ЛИСТ 18: БАЛЛЫ ПОЛЬЗОВАТЕЛЕЙ ====================
    const userPoints = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('user_points')
        .select(`
          *,
          user:users(first_name, last_name, telegram_username, total_points)
        `)
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    const userPointsData = userPoints.map((up: any) => {
      const user = Array.isArray(up.user) ? up.user[0] : up.user;
      
      return {
        'ID': up.id,
        'Пользователь': `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.telegram_username || up.user_id,
        'Баллы (транзакция)': up.points ?? 0,
        'Причина': up.reason || '',
        'Всего баллов': user?.total_points ?? 0,
        'Дата создания': this.formatDate(up.created_at)
      };
    });
    if (userPointsData.length > 0) {
      const userPointsSheet = XLSX.utils.json_to_sheet(userPointsData);
      XLSX.utils.book_append_sheet(workbook, userPointsSheet, 'Баллы пользователей');
    }

    // ==================== ЛИСТ 19: ТРАНЗАКЦИИ БАЛЛОВ ====================
    const pointsTransactions = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('points_transactions')
        .select(`
          *,
          user:users(first_name, last_name, telegram_username)
        `)
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    const pointsTransactionsData = pointsTransactions.map((pt: any) => {
      const user = Array.isArray(pt.user) ? pt.user[0] : pt.user;
      
      return {
        'ID': pt.id,
        'Пользователь': `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.telegram_username || pt.user_id,
        'Баллы': pt.points || 0,
        'Причина': pt.reason || '',
        'Дата': this.formatDate(pt.created_at)
      };
    });
    if (pointsTransactionsData.length > 0) {
      const pointsTransactionsSheet = XLSX.utils.json_to_sheet(pointsTransactionsData);
      XLSX.utils.book_append_sheet(workbook, pointsTransactionsSheet, 'Транзакции баллов');
    }

    // ==================== ЛИСТ 20: ДЕЙСТВИЯ РЕФЛЕКСИИ ====================
    const reflectionActions = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('reflection_actions')
        .select(`
          *,
          user:users(first_name, last_name, telegram_username)
        `)
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    const reflectionActionsData = reflectionActions.map((ra: any) => {
      const user = Array.isArray(ra.user) ? ra.user[0] : ra.user;
      
      return {
        'ID': ra.id,
        'Пользователь': `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.telegram_username || ra.user_id,
        'Тип действия': ra.action_type || '',
        'Баллы за действие': ra.points_awarded || 0,
        'Дата': this.formatDate(ra.created_at)
      };
    });
    if (reflectionActionsData.length > 0) {
      const reflectionActionsSheet = XLSX.utils.json_to_sheet(reflectionActionsData);
      XLSX.utils.book_append_sheet(workbook, reflectionActionsSheet, 'Рефлексия');
    }

    // ==================== ЛИСТ 21: УВЕДОМЛЕНИЯ ====================
    const notifications = await this.fetchAllRows<any>((from, to) =>
      supabase
        .from('notifications')
        .select(`
          *,
          user:users(first_name, last_name, telegram_username)
        `)
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    const notificationsData = notifications.map((n: any) => {
      const user = Array.isArray(n.user) ? n.user[0] : n.user;
      
      return {
        'ID': n.id,
        'Пользователь': `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.telegram_username || n.user_id,
        'Заголовок': n.title || '',
        'Текст': n.message || '',
        'Тип': n.type || '',
        'Прочитано': n.is_read ? 'Да' : 'Нет',
        'Дата прочтения': this.formatDate(n.read_at),
        'Дата создания': this.formatDate(n.created_at)
      };
    });
    if (notificationsData.length > 0) {
      const notificationsSheet = XLSX.utils.json_to_sheet(notificationsData);
      XLSX.utils.book_append_sheet(workbook, notificationsSheet, 'Уведомления');
    }

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return excelBuffer;
  }

  /**
   * Получение читаемого названия формата ответа
   */
  private static getAnswerFormatLabel(format: string): string {
    const labels: Record<string, string> = {
      'text': 'Текст',
      'number': 'Число',
      'link': 'Ссылка',
      'random_number': 'Случайное число',
      'photo_upload': 'Загрузка фото'
    };
    return labels[format] || format;
  }
}
