import { Router } from 'express';
import { verifyAuth } from '../controllers/authController';
import { getUser, getUserStatus, registerUser } from '../controllers/userController';

const router = Router();

// Аутентификация
router.post('/auth/verify', verifyAuth);

// Пользователи
router.get('/user/:telegramId', getUser);
router.post('/user/status', getUserStatus); // POST, т.к. требует initData в body
router.post('/user/register', registerUser);

/**
 * ============================================
 * БУДУЩИЕ МАРШРУТЫ ДЛЯ ГЕЙМИФИКАЦИИ
 * ============================================
 * 
 * router.post('/gamification/points/add', addPoints);
 * router.get('/gamification/points/:userId', getUserPoints);
 * router.get('/gamification/achievements/:userId', getUserAchievements);
 * router.post('/gamification/achievements/unlock', unlockAchievement);
 * router.get('/gamification/stats/:userId', getUserStats);
 * router.post('/gamification/level/up', levelUp);
 */

export default router;
