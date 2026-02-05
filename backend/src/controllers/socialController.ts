import { Request, Response } from 'express';
import { ActivityService, ActivityFeedFilters } from '../services/activityService';
import { UserService } from '../services/supabase';
import { logger } from '../utils/logger';

/**
 * Контроллер социальных функций
 */
export class SocialController {
  /**
   * Получение ленты активности
   * POST /api/social/feed
   */
  static async getActivityFeed(req: Request, res: Response): Promise<void> {
    try {
      const { direction, activity_type, limit, offset } = req.body;

      const filters: ActivityFeedFilters = {
        direction,
        activity_type,
        limit: limit ? parseInt(limit) : 30,
        offset: offset ? parseInt(offset) : 0,
      };

      const activities = await ActivityService.getActivityFeed(filters);

      res.json({
        success: true,
        activities,
        hasMore: activities.length === (filters.limit || 30),
      });
    } catch (error) {
      logger.error('Error in getActivityFeed', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ success: false, error: 'Ошибка получения ленты активности' });
    }
  }

  /**
   * Получение активности команды (по направлению)
   * POST /api/social/team-feed
   */
  static async getTeamFeed(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ success: false, error: 'userId обязателен' });
        return;
      }

      // Получаем пользователя для определения направления
      const user = await UserService.getUserById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'Пользователь не найден' });
        return;
      }

      const direction = user.direction;
      if (!direction) {
        // Если нет направления, показываем общую ленту
        const activities = await ActivityService.getActivityFeed({ limit: 30 });
        res.json({ success: true, activities, team: null });
        return;
      }

      const activities = await ActivityService.getTeamActivity(direction, 30);

      res.json({
        success: true,
        activities,
        team: direction,
      });
    } catch (error) {
      logger.error('Error in getTeamFeed', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ success: false, error: 'Ошибка получения ленты команды' });
    }
  }

  /**
   * Получение активности конкретного пользователя
   * POST /api/social/user-activity
   */
  static async getUserActivity(req: Request, res: Response): Promise<void> {
    try {
      const { targetUserId, limit } = req.body;

      if (!targetUserId) {
        res.status(400).json({ success: false, error: 'targetUserId обязателен' });
        return;
      }

      const activities = await ActivityService.getUserActivity(targetUserId, limit || 20);

      res.json({
        success: true,
        activities,
      });
    } catch (error) {
      logger.error('Error in getUserActivity', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ success: false, error: 'Ошибка получения активности пользователя' });
    }
  }

  /**
   * Получение публичного профиля пользователя
   * POST /api/social/profile/:userId
   */
  static async getUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { requesterId } = req.body; // ID запрашивающего пользователя

      if (!userId) {
        res.status(400).json({ success: false, error: 'userId обязателен' });
        return;
      }

      const user = await UserService.getUserById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'Пользователь не найден' });
        return;
      }

      // Проверяем видимость профиля
      const visibility = (user as any).profile_visibility || 'team';
      
      if (visibility === 'private' && requesterId !== userId) {
        res.status(403).json({ success: false, error: 'Профиль скрыт' });
        return;
      }

      // Если видимость 'team', проверяем направление
      if (visibility === 'team' && requesterId !== userId) {
        const requester = requesterId ? await UserService.getUserById(requesterId) : null;
        if (!requester || requester.direction !== user.direction) {
          res.status(403).json({ success: false, error: 'Профиль доступен только участникам команды' });
          return;
        }
      }

      // Формируем публичный профиль
      const publicProfile = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        direction: user.direction,
        bio: (user as any).bio,
        reflection_level: user.reflection_level,
        total_stars: user.stars_count || 0,
        created_at: user.created_at,
      };

      // Получаем последнюю активность
      const recentActivity = await ActivityService.getUserActivity(userId, 5);

      res.json({
        success: true,
        profile: publicProfile,
        recentActivity,
      });
    } catch (error) {
      logger.error('Error in getUserProfile', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ success: false, error: 'Ошибка получения профиля' });
    }
  }

  /**
   * Обновление настроек профиля
   * PATCH /api/social/profile/settings
   */
  static async updateProfileSettings(req: Request, res: Response): Promise<void> {
    try {
      const { userId, bio, show_in_feed, profile_visibility } = req.body;

      if (!userId) {
        res.status(400).json({ success: false, error: 'userId обязателен' });
        return;
      }

      const updates: Record<string, unknown> = {};
      
      if (bio !== undefined) {
        updates.bio = bio;
      }
      if (show_in_feed !== undefined) {
        updates.show_in_feed = show_in_feed;
      }
      if (profile_visibility !== undefined) {
        if (!['public', 'team', 'private'].includes(profile_visibility)) {
          res.status(400).json({ success: false, error: 'Неверное значение profile_visibility' });
          return;
        }
        updates.profile_visibility = profile_visibility;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ success: false, error: 'Нет данных для обновления' });
        return;
      }

      const user = await UserService.updateUserById(userId, updates as any);

      res.json({
        success: true,
        user: {
          bio: (user as any).bio,
          show_in_feed: (user as any).show_in_feed,
          profile_visibility: (user as any).profile_visibility,
        },
      });
    } catch (error) {
      logger.error('Error in updateProfileSettings', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ success: false, error: 'Ошибка обновления настроек профиля' });
    }
  }

  /**
   * Получение участников команды
   * POST /api/social/team-members
   */
  static async getTeamMembers(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ success: false, error: 'userId обязателен' });
        return;
      }

      const user = await UserService.getUserById(userId);
      if (!user || !user.direction) {
        res.status(400).json({ success: false, error: 'Направление не найдено' });
        return;
      }

      const allUsers = await UserService.getAllUsers();
      const teamMembers = allUsers
        .filter(u => u.direction === user.direction && u.status === 'registered')
        .map(u => ({
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          reflection_level: u.reflection_level,
          total_stars: u.stars_count || 0,
        }))
        .sort((a, b) => (b.total_stars || 0) - (a.total_stars || 0));

      res.json({
        success: true,
        team: user.direction,
        members: teamMembers,
        totalMembers: teamMembers.length,
      });
    } catch (error) {
      logger.error('Error in getTeamMembers', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({ success: false, error: 'Ошибка получения участников команды' });
    }
  }
}
