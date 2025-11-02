// file: routes/notificationRoutes.js

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');

const BASE_PATH = '/notifications';

// --- User Routes (yêu cầu đăng nhập) ---
router.get(BASE_PATH, authMiddleware.verifyToken, notificationController.getNotifications);
router.post(`${BASE_PATH}/mark-read`, authMiddleware.verifyToken, notificationController.markAsRead);

router.get(
  '/notifications/unread-count',
  authMiddleware.verifyToken, // Yêu cầu phải đăng nhập
  notificationController.getUnreadCount
);
// --- Admin Routes (yêu cầu quyền admin) ---
router.post(
    BASE_PATH,
    [authMiddleware.verifyToken, authMiddleware.isAdmin],
    notificationController.createNotification
);
router.post(
    `${BASE_PATH}/publish`,
    [authMiddleware.verifyToken, authMiddleware.isAdmin],
    notificationController.publishNotifications
);
router.post(
    `${BASE_PATH}/delete`,
    [authMiddleware.verifyToken, authMiddleware.isAdmin],
    notificationController.deleteNotifications
);

module.exports = router;