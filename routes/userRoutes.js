const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const moderationController = require("../controllers/moderationController");
const paymentController = require("../controllers/paymentController");
const achievementController = require("../controllers/achievementController");
const { authLimiter } = require("../middlewares/rateLimitMiddleware");

router.post("/auth/register", userController.signup);
router.post("/auth/login", userController.login);
router.post("/auth/google-login", userController.googleLogin);
router.post("/auth/refresh-token", userController.refreshToken);
router.post("/auth/logout", userController.logout);
// Debug endpoint - xóa sau khi debug xong
router.get("/auth/debug-token", authMiddleware.verifyToken, (req, res) => {
  const jwt = require('jsonwebtoken');
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.decode(token, { complete: true });
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = decoded.payload.exp - now;
  
  res.json({
    issuedAt: new Date(decoded.payload.iat * 1000).toISOString(),
    expiresAt: new Date(decoded.payload.exp * 1000).toISOString(),
    timeLeftSeconds: timeLeft,
    timeLeftHours: (timeLeft / 3600).toFixed(2),
    timeLeftDays: (timeLeft / 86400).toFixed(2),
    userId: decoded.payload.id,
    role: decoded.payload.role
  });
});
router.post(
  "/auth/reset-password",
  authMiddleware.verifyToken,
  userController.resetPassword
);
router.post("/auth/change-password", userController.changePassword);

router.get(
  "/users/me/usage",
  authMiddleware.verifyToken,
  userController.getUsageInfo
);
router.get(
  "/users/me/payment-history",
  authMiddleware.verifyToken,
  paymentController.getUserPaymentHistory
);

router.get(
  "/users/me/usage",
  authMiddleware.verifyToken,
  userController.getUsageInfo
);
router.get(
  "/users/me/payment-history",
  authMiddleware.verifyToken,
  paymentController.getUserPaymentHistory
);

router.get(
  "/users/profile",
  authMiddleware.verifyToken,
  userController.getUserProfile
);

// Lấy các thành tích đã đạt được của người dùng đang đăng nhập
router.get(
  "/users/me/achievements",
  authMiddleware.verifyToken,
  userController.getUserAchievements
);

// Lấy tiến độ các thành tích của người dùng đang đăng nhập
router.get(
  "/users/me/achievements/progress",
  authMiddleware.verifyToken,
  userController.getUserAchievementsProgress
);

router.get(
  "/users/me/badge",
  authMiddleware.verifyToken,
  userController.getCurrentUserBadge
);

// Lấy thống kê hoạt động của user trong tuần hiện tại
router.get(
  "/users/me/weekly-activity",
  authMiddleware.verifyToken,
  userController.getWeeklyActivity
);

// Lấy bảng xếp hạng điểm cộng đồng
router.get(
  "/users/community-leaderboard",
  userController.getCommunityLeaderboard
);

// --- ACHIEVEMENT ROUTES FOR ANY USER ---

// GET /api/users/:userId/achievements (Xem thành tích của người dùng khác)
router.get(
  "/users/:userId/achievements",
  achievementController.getPublicUserAchievements
);

// Cập nhật thông tin cá nhân của người dùng đang đăng nhập
router.put(
  "/users/profile",
  authMiddleware.verifyToken,
  userController.updateUserProfile
);

router.get(
  "/users/me/exam-history",
  authMiddleware.verifyToken,
  userController.getExamHistory
);
router.get(
  "/users/me/violations",
  authMiddleware.verifyToken,
  userController.getUserViolations
);

router.get(
  "/users/me/appeals",
  authMiddleware.verifyToken,
  moderationController.getUserAppeals // Sử dụng lại hàm đã viết trong moderationController
);

router.get(
  "/user/subscription",
  authMiddleware.verifyToken,
  userController.getCurrentSubscriptionInfo
);

router.get(
  "/user/achievements",
  authMiddleware.verifyToken,
  achievementController.getUserAchievements
);

router.get(
  "/users/me/posts",
  authMiddleware.verifyToken,
  userController.getMyPosts
);

// Lấy danh sách bài viết người dùng đã tương tác (like hoặc comment)
router.get(
  "/users/me/interacted-posts",
  authMiddleware.verifyToken,
  userController.getMyInteractedPosts
);

// admin
router.get(
  "/admin/users",
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  userController.getUsersAdmin
);

router.get(
  "/admin/users/:userId/details",
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  userController.getUserDetailsAdmin
);

// Basic user fetch (only core fields) for admin
router.get(
  "/admin/users/:userId",
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  userController.fetchUserById
);

router.put(
  "/admin/users/:userId",
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  userController.updateUserAdmin
);

router.post(
  "/admin/users/:userId/achievements",
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  userController.grantAchievementToUserAdmin
);

router.post(
  "/admin/users/:userId/reset-quota",
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  userController.resetUserQuota
);

router.delete(
  "/admin/users/:userId",
  [authMiddleware.verifyToken, authMiddleware.isSuperAdmin], // <-- Cực kỳ khuyến khích chỉ cho Super Admin
  userController.deleteUser
);

// Ban/Unban user
router.post(
  "/admin/users/:userId/ban",
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  userController.banUser
);

router.post(
  "/admin/users/:userId/unban",
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  userController.unbanUser
);

module.exports = router;
