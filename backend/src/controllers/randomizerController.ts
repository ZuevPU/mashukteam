import { Request, Response } from 'express';
import { RandomizerService } from '../services/randomizerService';
import { UserService, supabase } from '../services/supabase';
import { notifyRandomizerDistribution } from '../utils/telegramBot';
import { logger } from '../utils/logger';

export class RandomizerController {
  /**
   * POST /api/randomizer/create
   * Создание рандомайзера (админ)
   */
  static async createRandomizer(req: Request, res: Response) {
    try {
      const { question_id, tables_count, participants_per_table, topic, description } = req.body;

      if (!question_id || !tables_count || !participants_per_table || !topic) {
        return res.status(400).json({
          success: false,
          error: 'Необходимы: question_id, tables_count, participants_per_table, topic',
        });
      }

      const randomizer = await RandomizerService.createRandomizer({
        question_id,
        tables_count,
        participants_per_table,
        topic,
        description,
      });

      return res.json({
        success: true,
        randomizer,
      });
    } catch (error: any) {
      logger.error('Create randomizer error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: error.message || 'Ошибка при создании рандомайзера',
      });
    }
  }

  /**
   * POST /api/randomizer/participate
   * Участие пользователя в рандомайзере
   */
  static async participate(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Не авторизован',
        });
      }

      const { randomizer_id } = req.body;
      if (!randomizer_id) {
        return res.status(400).json({
          success: false,
          error: 'randomizer_id обязателен',
        });
      }

      const participant = await RandomizerService.participateInRandomizer(userId, randomizer_id);

      return res.json({
        success: true,
        participant,
      });
    } catch (error: any) {
      logger.error('Participate in randomizer error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: error.message || 'Ошибка при участии в рандомайзере',
      });
    }
  }

  /**
   * POST /api/admin/randomizer/preview
   * Создание предпросмотра распределения (админ)
   */
  static async createPreview(req: Request, res: Response) {
    try {
      const { randomizer_id } = req.body;
      if (!randomizer_id) {
        return res.status(400).json({
          success: false,
          error: 'randomizer_id обязателен',
        });
      }

      // Создаем предпросмотр распределения
      const distributions = await RandomizerService.distributeParticipants(randomizer_id, true);

      return res.json({
        success: true,
        distributions,
        message: `Создан предпросмотр для ${distributions.length} участников`,
      });
    } catch (error: any) {
      logger.error('Create preview error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: error.message || 'Ошибка при создании предпросмотра',
      });
    }
  }

  /**
   * GET /api/admin/randomizer/:id/preview
   * Получение предпросмотра распределения (админ)
   */
  static async getPreview(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const distributions = await RandomizerService.getPreviewDistribution(id);

      return res.json({
        success: true,
        distributions,
      });
    } catch (error: any) {
      logger.error('Get preview error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: error.message || 'Ошибка при получении предпросмотра',
      });
    }
  }

  /**
   * PATCH /api/admin/randomizer/:id/distribution
   * Изменение стола участника в предпросмотре (админ)
   */
  static async updateDistribution(req: Request, res: Response) {
    try {
      const { id } = req.params; // randomizer_id
      const { user_id, table_number } = req.body;

      if (!user_id || !table_number) {
        return res.status(400).json({
          success: false,
          error: 'user_id и table_number обязательны',
        });
      }

      const distribution = await RandomizerService.updateDistribution(id, user_id, table_number);

      return res.json({
        success: true,
        distribution,
      });
    } catch (error: any) {
      logger.error('Update distribution error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: error.message || 'Ошибка при изменении распределения',
      });
    }
  }

  /**
   * POST /api/admin/randomizer/:id/publish
   * Публикация финального распределения (админ)
   */
  static async publishDistribution(req: Request, res: Response) {
    try {
      const { id } = req.params; // randomizer_id

      // Публикуем распределение
      const distributions = await RandomizerService.publishDistribution(id);

      // Получаем данные рандомайзера для уведомлений
      const { data: randomizer } = await supabase
        .from('randomizer_questions')
        .select('topic')
        .eq('id', id)
        .single();

      // Отправляем уведомления участникам
      const notificationPromises = distributions.map(async (dist) => {
        try {
          const user = await UserService.getUserById(dist.user_id);
          if (user?.telegram_id) {
            await notifyRandomizerDistribution(
              dist.user_id,
              user.telegram_id,
              randomizer?.topic || 'Рандомайзер',
              dist.table_number
            );
          }
        } catch (notifError) {
          logger.error('Error sending randomizer notification', notifError instanceof Error ? notifError : new Error(String(notifError)));
          // Не прерываем выполнение при ошибке уведомления
        }
      });

      await Promise.all(notificationPromises);

      return res.json({
        success: true,
        distributions,
        message: `Распределение опубликовано для ${distributions.length} участников`,
      });
    } catch (error: any) {
      logger.error('Publish distribution error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: error.message || 'Ошибка при публикации распределения',
      });
    }
  }

  /**
   * POST /api/randomizer/distribute
   * Подведение итогов и распределение по столам (админ) - УСТАРЕЛО, используйте publish
   * Оставлено для обратной совместимости, теперь только для финальной публикации
   */
  static async distribute(req: Request, res: Response) {
    try {
      const { randomizer_id } = req.body;
      if (!randomizer_id) {
        return res.status(400).json({
          success: false,
          error: 'randomizer_id обязателен',
        });
      }

      // Выполняем финальное распределение (без предпросмотра)
      const distributions = await RandomizerService.distributeParticipants(randomizer_id, false);

      // Получаем данные рандомайзера для уведомлений
      const { data: randomizer } = await supabase
        .from('randomizer_questions')
        .select('topic')
        .eq('id', randomizer_id)
        .single();

      // Отправляем уведомления участникам
      const notificationPromises = distributions.map(async (dist) => {
        try {
          const user = await UserService.getUserById(dist.user_id);
          if (user?.telegram_id) {
            await notifyRandomizerDistribution(
              dist.user_id,
              user.telegram_id,
              randomizer?.topic || 'Рандомайзер',
              dist.table_number
            );
          }
        } catch (notifError) {
          logger.error('Error sending randomizer notification', notifError instanceof Error ? notifError : new Error(String(notifError)));
          // Не прерываем выполнение при ошибке уведомления
        }
      });

      await Promise.all(notificationPromises);

      return res.json({
        success: true,
        distributions,
        message: `Распределено ${distributions.length} участников`,
      });
    } catch (error: any) {
      logger.error('Distribute randomizer error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: error.message || 'Ошибка при распределении участников',
      });
    }
  }

  /**
   * POST /api/randomizer/my
   * Получение рандомайзеров пользователя
   */
  static async getMyRandomizers(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Не авторизован',
        });
      }

      const randomizers = await RandomizerService.getUserRandomizers(userId);

      return res.json({
        success: true,
        randomizers,
      });
    } catch (error: any) {
      logger.error('Get my randomizers error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: error.message || 'Ошибка при получении рандомайзеров',
      });
    }
  }

  /**
   * POST /api/randomizer/:id
   * Получение данных рандомайзера
   */
  static async getRandomizer(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Не авторизован',
        });
      }

      const { id } = req.params;
      const data = await RandomizerService.getRandomizerForUser(userId, id);

      return res.json({
        success: true,
        ...data,
      });
    } catch (error: any) {
      logger.error('Get randomizer error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: error.message || 'Ошибка при получении рандомайзера',
      });
    }
  }

  /**
   * POST /api/randomizer/:id/distributions
   * Получение распределений рандомайзера (админ)
   */
  static async getDistributions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const distributions = await RandomizerService.getRandomizerDistributions(id);

      return res.json({
        success: true,
        distributions,
      });
    } catch (error: any) {
      logger.error('Get randomizer distributions error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: error.message || 'Ошибка при получении распределений',
      });
    }
  }

  /**
   * POST /api/randomizer/by-question/:questionId
   * Получение рандомайзера по question_id
   */
  static async getRandomizerByQuestionId(req: Request, res: Response) {
    try {
      const { questionId } = req.params;
      const randomizer = await RandomizerService.getRandomizerByQuestionId(questionId);

      if (!randomizer) {
        return res.json({
          success: true,
          randomizer: null,
        });
      }

      // Получаем количество участников
      const { count: participantsCount } = await supabase
        .from('randomizer_participants')
        .select('*', { count: 'exact', head: true })
        .eq('randomizer_id', randomizer.id);

      return res.json({
        success: true,
        randomizer: {
          ...randomizer,
          participantsCount: participantsCount || 0,
        },
      });
    } catch (error: any) {
      logger.error('Get randomizer by question id error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: error.message || 'Ошибка при получении рандомайзера',
      });
    }
  }

  /**
   * POST /api/randomizer/:id/participants-count
   * Получение количества участников рандомайзера
   */
  static async getParticipantsCount(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { count } = await supabase
        .from('randomizer_participants')
        .select('*', { count: 'exact', head: true })
        .eq('randomizer_id', id);

      return res.json({
        success: true,
        count: count || 0,
      });
    } catch (error: any) {
      logger.error('Get participants count error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({
        success: false,
        error: error.message || 'Ошибка при получении количества участников',
      });
    }
  }
}
