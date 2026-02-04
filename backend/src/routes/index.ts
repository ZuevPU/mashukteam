import { Router } from 'express';
import { verifyAuth } from '../controllers/authController';
import { getUser, getUserStatus, registerUser, setUserDirection, updateProfile } from '../controllers/userController';
import { DirectionController } from '../controllers/directionController';
import { ExportController } from '../controllers/exportController';
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
import { authRateLimiter, gamificationRateLimiter, registrationRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Аутентификация (с более строгим rate limiting)
router.post('/auth/verify', authRateLimiter, verifyAuth);

// Пользователи
router.get('/user/:telegramId', getUser);
router.post('/user/status', getUserStatus); // POST, т.к. требует initData в body
router.post('/user/register', registrationRateLimiter, registerUser); // Добавлен rate limiter для регистрации

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
router.post('/events/:id/note', requireAuth, EventController.saveEventNote);
router.post('/events/:id/note/get', requireAuth, EventController.getEventNote); // POST because we send initData
router.post('/events/notes/my', requireAuth, EventController.getUserEventNotes); // POST because we send initData
router.post('/events/:id/diagnostic/questions', requireAuth, EventController.getDiagnosticQuestions); // POST because we send initData
router.post('/events/:id/diagnostic/answer', requireAuth, EventController.submitDiagnosticAnswer); // POST because we send initData
router.post('/events/:id/diagnostic/answers', requireAuth, EventController.submitDiagnosticAnswers); // Batch save all answers

import { TargetedQuestionController } from '../controllers/targetedQuestionController';
import { RandomizerController } from '../controllers/randomizerController';
import { AssignmentController } from '../controllers/assignmentController';
import { UserPreferencesController } from '../controllers/userPreferencesController';
import { AnalyticsController } from '../controllers/analyticsController';
import { NotificationController } from '../controllers/notificationController';
import { BroadcastController } from '../controllers/broadcastController';
import { CronController } from '../controllers/cronController';
import { UploadController } from '../controllers/uploadController';

// Динамический импорт multer для избежания ошибок типов
// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer');

// Настройка multer для загрузки файлов в память
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый тип файла'));
    }
  },
});

// === Directions (public) ===
router.get('/directions', DirectionController.getAllDirections);

// === User Direction ===
router.post('/user/direction', requireAuth, setUserDirection);

// === User Profile ===
router.patch('/user/profile', requireAuth, updateProfile);

// === User Preferences ===
router.post('/user/preferences', requireAuth, UserPreferencesController.getPreferences);
router.patch('/user/preferences', requireAuth, UserPreferencesController.updatePreferences);

// === Targeted Questions ===
router.post('/questions/my', requireAuth, TargetedQuestionController.getMyQuestions);
router.post('/questions/answer', requireAuth, TargetedQuestionController.submitAnswer);

// === Randomizers ===
router.post('/randomizer/create', requireAuth, requireAdmin, RandomizerController.createRandomizer);
router.post('/randomizer/participate', requireAuth, RandomizerController.participate);
router.post('/randomizer/distribute', requireAuth, requireAdmin, RandomizerController.distribute);
router.post('/randomizer/my', requireAuth, RandomizerController.getMyRandomizers);
router.post('/randomizer/:id', requireAuth, RandomizerController.getRandomizer);
router.post('/randomizer/:id/distributions', requireAuth, requireAdmin, RandomizerController.getDistributions);
router.post('/randomizer/:id/participants-count', requireAuth, requireAdmin, RandomizerController.getParticipantsCount);
router.post('/randomizer/:id/participants', requireAuth, requireAdmin, RandomizerController.getParticipants);
router.post('/randomizer/by-question/:questionId', requireAuth, requireAdmin, RandomizerController.getRandomizerByQuestionId);

// === Admin Randomizer Preview ===
router.post('/admin/randomizer/preview', requireAuth, requireAdmin, RandomizerController.createPreview);
router.post('/admin/randomizer/:id/preview', requireAuth, requireAdmin, RandomizerController.getPreview);
router.patch('/admin/randomizer/:id/distribution', requireAuth, requireAdmin, RandomizerController.updateDistribution);
router.post('/admin/randomizer/:id/publish', requireAuth, requireAdmin, RandomizerController.publishDistribution);

// === Notifications ===
router.post('/notifications/my', requireAuth, NotificationController.getMyNotifications);
router.post('/notifications/:id/read', requireAuth, NotificationController.markAsRead);
router.post('/notifications/read-all', requireAuth, NotificationController.markAllAsRead);

// === Admin System ===
router.post('/admin/targeted-questions', requireAuth, requireAdmin, TargetedQuestionController.getAllQuestions);
router.post('/admin/targeted-answers', requireAuth, requireAdmin, TargetedQuestionController.getAllAnswers);
router.post('/admin/questions', (req, res, next) => {
  // #region agent log
  try{const fs=require('fs');const path=require('path');const logPath=path.join(process.cwd(),'.cursor','debug.log');const logEntry={id:`log_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,timestamp:Date.now(),location:'routes/index.ts:95',message:'route handler entry',data:{path:req.path,method:req.method,bodyKeys:Object.keys(req.body)},sessionId:'debug-session',runId:'run1',hypothesisId:'D'};fs.appendFileSync(logPath,JSON.stringify(logEntry)+'\n');}catch(e){}
  // #endregion
  next();
}, requireAuth, requireAdmin, TargetedQuestionController.createQuestion);
router.put('/admin/questions/:id', requireAuth, requireAdmin, TargetedQuestionController.updateQuestion);
router.delete('/admin/questions/:id', requireAuth, requireAdmin, TargetedQuestionController.deleteQuestion);

// Шаблонные вопросы
router.get('/admin/questions/templates', requireAuth, requireAdmin, TargetedQuestionController.getTemplates);
router.post('/admin/questions/templates/:id/publish', requireAuth, requireAdmin, TargetedQuestionController.publishTemplateInstance);
router.get('/admin/questions/templates/:id/instances', requireAuth, requireAdmin, TargetedQuestionController.getTemplateInstances);

router.patch('/admin/users/:id/direction', requireAuth, requireAdmin, AdminController.setUserDirection);

router.post('/admin/events', requireAuth, requireAdmin, AdminController.createEvent);
router.post('/admin/events/list', requireAuth, requireAdmin, AdminController.getAllEvents); // Новый роут
router.put('/admin/events/:id', requireAuth, requireAdmin, AdminController.updateEvent); // PUT usually has body
router.delete('/admin/events/:id', requireAuth, requireAdmin, AdminController.deleteEvent); // DELETE with body for initData
router.post('/admin/events/:id/questions', requireAuth, requireAdmin, AdminController.addQuestionToDiagnostic);
router.put('/admin/events/questions/:questionId', requireAuth, requireAdmin, AdminController.updateDiagnosticQuestion);
router.delete('/admin/events/questions/:questionId', requireAuth, requireAdmin, AdminController.deleteDiagnosticQuestion);
router.post('/admin/events/:id/analytics', requireAuth, requireAdmin, AdminController.getDiagnosticAnalytics);

router.post('/admin/users', requireAuth, requireAdmin, AdminController.getAllUsers);
router.post('/admin/users/:id', requireAuth, requireAdmin, AdminController.getUserDetails);
router.patch('/admin/users/:id', requireAuth, requireAdmin, AdminController.updateUser);
router.patch('/admin/users/:id/direction', requireAuth, requireAdmin, AdminController.setUserDirection);

// === Admin Export ===
router.post('/admin/export/answers', requireAuth, requireAdmin, ExportController.exportAnswers);
router.post('/admin/export/events', requireAuth, requireAdmin, ExportController.exportEvents);
router.post('/admin/export/diagnostics', requireAuth, requireAdmin, ExportController.exportDiagnostics);
router.post('/admin/export/assignments', requireAuth, requireAdmin, ExportController.exportAssignments);
router.post('/admin/export/questions', requireAuth, requireAdmin, ExportController.exportQuestions);
router.post('/admin/export/users', requireAuth, requireAdmin, ExportController.exportUsers);
router.post('/admin/export/all', requireAuth, requireAdmin, ExportController.exportAll);
router.post('/admin/export/full', requireAuth, requireAdmin, ExportController.exportFullApplication);

// === Admin Directions ===
router.post('/admin/directions', requireAuth, requireAdmin, DirectionController.createDirection);
router.put('/admin/directions/:id', requireAuth, requireAdmin, DirectionController.updateDirection);
router.delete('/admin/directions/:id', requireAuth, requireAdmin, DirectionController.deleteDirection);

// === Admin Assignments ===
router.post('/admin/assignments', requireAuth, requireAdmin, AssignmentController.createAssignment);
router.post('/admin/assignments/list', requireAuth, requireAdmin, AssignmentController.getAllAssignments);
router.post('/admin/assignments/recalculate-stars', requireAuth, requireAdmin, AssignmentController.recalculateAllStars);
router.put('/admin/assignments/:id', requireAuth, requireAdmin, AssignmentController.updateAssignment);
router.delete('/admin/assignments/:id', requireAuth, requireAdmin, AssignmentController.deleteAssignment);
router.post('/admin/assignments/:id/submissions', requireAuth, requireAdmin, AssignmentController.getSubmissionsForAssignment);
router.post('/admin/submissions', requireAuth, requireAdmin, AssignmentController.getAllSubmissions);
router.patch('/admin/submissions/:id', requireAuth, requireAdmin, AssignmentController.moderateSubmission);
router.post('/admin/leaderboard', requireAuth, requireAdmin, AssignmentController.getLeaderboard);

// === User Assignments ===
router.post('/assignments/my', requireAuth, AssignmentController.getMyAssignments);
router.post('/assignments/:id/submit', requireAuth, AssignmentController.submitAssignment);
router.post('/assignments/submissions', requireAuth, AssignmentController.getMySubmissions);

// === File Upload ===
// Важно: multer должен быть ПЕРЕД requireAuth, чтобы распарсить FormData и получить initData из body
router.post('/upload/task', upload.single('file'), requireAuth, UploadController.uploadTaskFile);
router.post('/upload/signed-url', requireAuth, UploadController.getSignedUrl);

// === User Assignment Randomizer (Random Number) ===
router.post('/assignments/:id/participate', requireAuth, AssignmentController.participateInRandomNumber);
router.post('/assignments/:id/randomizer', requireAuth, AssignmentController.getRandomizerByAssignment);

// === Admin Assignment Randomizer ===
router.post('/admin/assignments/:id/randomizer/participants', requireAuth, requireAdmin, AssignmentController.getRandomizerParticipants);
router.post('/admin/assignments/:id/randomizer/preview', requireAuth, requireAdmin, AssignmentController.previewRandomizerDistribution);
router.post('/admin/assignments/:id/randomizer/preview/get', requireAuth, requireAdmin, AssignmentController.getPreviewDistribution);
router.patch('/admin/assignments/:id/randomizer/distribution', requireAuth, requireAdmin, AssignmentController.updateDistribution);
router.post('/admin/assignments/:id/randomizer/publish', requireAuth, requireAdmin, AssignmentController.publishRandomizerDistribution);

// === Admin Analytics ===
router.post('/admin/analytics/user-activity', requireAuth, requireAdmin, AnalyticsController.getUserActivity);
router.post('/admin/analytics/directions', requireAuth, requireAdmin, AnalyticsController.getDirectionStats);
router.post('/admin/analytics/events', requireAuth, requireAdmin, AnalyticsController.getEventStats);
router.post('/admin/analytics/questions', requireAuth, requireAdmin, AnalyticsController.getQuestionStats);
router.post('/admin/analytics/gamification', requireAuth, requireAdmin, AnalyticsController.getGamificationStats);
router.post('/admin/analytics/assignments', requireAuth, requireAdmin, AnalyticsController.getAssignmentStats);
router.post('/admin/analytics/registration-trend', requireAuth, requireAdmin, AnalyticsController.getRegistrationTrend);

// === Admin Broadcasts (Рассылки) ===
router.post('/admin/broadcasts', requireAuth, requireAdmin, BroadcastController.createBroadcast);
router.post('/admin/broadcasts/list', requireAuth, requireAdmin, BroadcastController.getAllBroadcasts);
router.post('/admin/broadcasts/:id', requireAuth, requireAdmin, BroadcastController.getBroadcastById);
router.put('/admin/broadcasts/:id', requireAuth, requireAdmin, BroadcastController.updateBroadcast);
router.delete('/admin/broadcasts/:id', requireAuth, requireAdmin, BroadcastController.deleteBroadcast);
router.post('/admin/broadcasts/:id/send', requireAuth, requireAdmin, BroadcastController.sendBroadcast);

// === Cron Jobs ===
router.get('/cron/publish', CronController.processScheduledContent);
router.get('/cron/health', CronController.healthCheck);

export default router;
