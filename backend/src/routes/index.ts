import { Router } from 'express';
import { verifyAuth } from '../controllers/authController';
import { getUser, getUserStatus, registerUser } from '../controllers/userController';
import {
  addPoints,
  getUserPoints,
  getUserAchievements,
  unlockAchievement,
  getUserStats,
  levelUp,
} from '../controllers/gamificationController';
import { EventController } from '../controllers/eventController';
import { AdminController } from '../controllers/adminController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { authRateLimiter, gamificationRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Аутентификация (с более строгим rate limiting)
router.post('/auth/verify', authRateLimiter, verifyAuth);

// Пользователи
router.get('/user/:telegramId', getUser);
router.post('/user/status', getUserStatus); // POST, т.к. требует initData в body
router.post('/user/register', registerUser);

// Геймификация (с rate limiting для геймификации)
router.post('/gamification/points/add', gamificationRateLimiter, addPoints);
router.post('/gamification/points/:userId', gamificationRateLimiter, getUserPoints);
router.post('/gamification/achievements/:userId', gamificationRateLimiter, getUserAchievements);
router.post('/gamification/achievements/unlock', gamificationRateLimiter, unlockAchievement);
router.post('/gamification/stats/:userId', gamificationRateLimiter, getUserStats);
router.post('/gamification/level/up', gamificationRateLimiter, levelUp);

// === Event System (User) ===
// Все запросы требуют initData в body или headers
router.post('/events/list', requireAuth, EventController.getEvents); // POST because we send initData
router.post('/events/:id/details', requireAuth, EventController.getEventDetails);
router.post('/events/:id/answers', requireAuth, EventController.submitAnswer);
router.post('/user/my-answers', requireAuth, EventController.getMyAnswers);

// === Admin System ===
router.post('/admin/events', requireAuth, requireAdmin, AdminController.createEvent);
router.put('/admin/events/:id', requireAuth, requireAdmin, AdminController.updateEvent); // PUT usually has body
router.delete('/admin/events/:id', requireAuth, requireAdmin, AdminController.deleteEvent); // DELETE with body for initData
router.post('/admin/events/:id/questions', requireAuth, requireAdmin, AdminController.addQuestion);
router.post('/admin/events/:id/analytics', requireAuth, requireAdmin, AdminController.getEventAnalytics); // Новый роут

router.post('/admin/users', requireAuth, requireAdmin, AdminController.getAllUsers);
router.post('/admin/users/:id', requireAuth, requireAdmin, AdminController.getUserDetails);
router.patch('/admin/users/:id', requireAuth, requireAdmin, AdminController.updateUser);

export default router;
