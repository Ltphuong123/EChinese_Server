const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const authMiddleware = require('../middlewares/authMiddleware');

// ==================== PUBLIC ROUTES ====================

// Lấy danh sách tất cả thành tích công khai
router.get('/achievements', achievementController.getPublicAchievements);

// Lấy chi tiết 1 thành tích
router.get('/achievements/:id', achievementController.getAchievementById);

// Lấy thành tích của user khác (public profile)
router.get(
  '/users/:userId/achievements',
  achievementController.getPublicUserAchievements
);

// ==================== USER ROUTES (Authenticated) ====================

// Lấy thành tích đã đạt được của user hiện tại
router.get(
  '/users/me/achievements',
  authMiddleware.verifyToken,
  achievementController.getUserAchievements
);

// Lấy tiến độ các thành tích chưa hoàn thành
router.get(
  '/users/me/achievements/progress',
  authMiddleware.verifyToken,
  achievementController.getUserAchievementProgress
);

// Lấy thống kê thành tích của user
router.get(
  '/users/me/achievements/statistics',
  authMiddleware.verifyToken,
  achievementController.getUserAchievementStatistics
);

// Lấy các thành tích sắp đạt được (>70% progress)
router.get(
  '/users/me/achievements/almost-achieved',
  authMiddleware.verifyToken,
  achievementController.getAlmostAchievedAchievements
);

// ==================== ADMIN ROUTES ====================

// Lấy danh sách thành tích (có phân trang, filter, search)
router.get(
  '/admin/settings/achievements',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  achievementController.getAchievementsAdmin
);

// Tạo thành tích mới
router.post(
  '/admin/settings/achievements',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  achievementController.createAchievementAdmin
);

// Lấy thống kê tổng quan (admin dashboard)
router.get(
  '/admin/achievements/statistics',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  achievementController.getAdminStatistics
);

// Cập nhật thông tin thành tích
router.put(
  '/admin/settings/achievements/:id',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  achievementController.updateAchievementAdmin
);

// Kích hoạt/vô hiệu hóa thành tích
router.patch(
  '/admin/settings/achievements/:id/status',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  achievementController.toggleAchievementStatus
);

// Xóa thành tích
router.delete(
  '/admin/settings/achievements/:id',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  achievementController.deleteAchievementAdmin
);

// Lấy danh sách user đã đạt thành tích cụ thể
router.get(
  '/admin/settings/achievements/:achievementId/users',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  achievementController.getUsersForAchievementAdmin
);

// Cập nhật tiến độ thành tích cho user (manual)
router.post(
  '/admin/achievements/progress',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  achievementController.updateUserAchievementProgressAdmin
);

module.exports = router;