const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const moderationController = require('../controllers/moderationController');
const paymentController = require('../controllers/paymentController');
const achievementController = require('../controllers/achievementController');


router.post('/auth/register', userController.signup);
router.post('/auth/login', userController.login);
router.post('/auth/refresh-token', userController.refreshToken);
router.post('/auth/logout', userController.logout);
router.post('/auth/reset-password', authMiddleware.verifyToken, userController.resetPassword);
router.post('/auth/change-password', userController.changePassword);


router.get('/users/me/usage',authMiddleware.verifyToken, userController.getUsageInfo);
router.get('/users/me/payment-history',authMiddleware.verifyToken, paymentController.getUserPaymentHistory);

router.get(
    '/users/profile', 
    authMiddleware.verifyToken, 
    userController.getUserProfile
);

// Lấy các thành tích đã đạt được của người dùng đang đăng nhập
router.get(
  '/users/me/achievements',
  authMiddleware.verifyToken,
  userController.getUserAchievements
);

// Lấy tiến độ các thành tích của người dùng đang đăng nhập
router.get(
  '/users/me/achievements/progress',
  authMiddleware.verifyToken,
  userController.getUserAchievementsProgress
);

router.get(
  '/users/me/badge',
  authMiddleware.verifyToken,
  userController.getCurrentUserBadge
);

// --- ACHIEVEMENT ROUTES FOR ANY USER ---

// GET /api/users/:userId/achievements (Xem thành tích của người dùng khác)
router.get(
  '/users/:userId/achievements',
  achievementController.getPublicUserAchievements
);

// Cập nhật thông tin cá nhân của người dùng đang đăng nhập
router.put(
    '/users/profile', 
    authMiddleware.verifyToken, 
    userController.updateUserProfile
);

router.get(
  '/users/me/exam-history',
  authMiddleware.verifyToken,
  userController.getExamHistory
);
router.get(
  '/users/me/violations',
  authMiddleware.verifyToken,
  userController.getUserViolations
);

router.get(
  '/users/me/appeals',
  authMiddleware.verifyToken,
  moderationController.getUserAppeals // Sử dụng lại hàm đã viết trong moderationController
);

router.get('/user/subscription',authMiddleware.verifyToken, userController.getCurrentSubscriptionInfo);

router.get('/user/achievements',authMiddleware.verifyToken, achievementController.getUserAchievements);



// admin
router.get('/admin/users', authMiddleware.verifyToken, authMiddleware.isAdmin, userController.getUsersAdmin);

router.get(
    '/admin/users/:userId/details', 
    [authMiddleware.verifyToken, authMiddleware.isAdmin], 
    userController.getUserDetailsAdmin
);

router.put(
    '/admin/users/:userId',
    [authMiddleware.verifyToken, authMiddleware.isAdmin],
    userController.updateUserAdmin
);

router.post(
  '/admin/users/:userId/achievements',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  userController.grantAchievementToUserAdmin
);

router.post(
    '/admin/users/:userId/reset-quota',
    [authMiddleware.verifyToken, authMiddleware.isAdmin],
    userController.resetUserQuota
);

router.delete(
    '/admin/users/:userId',
    [authMiddleware.verifyToken, authMiddleware.isSuperAdmin], // <-- Cực kỳ khuyến khích chỉ cho Super Admin
    userController.deleteUser
);



module.exports = router;
