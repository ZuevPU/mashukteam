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

export default router;
