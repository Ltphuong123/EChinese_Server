// file: routes/notificationRoutes.js

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');

const BASE_PATH = '/notifications';

// --- User Routes (yêu cầu đăng nhập) ---
router.get(BASE_PATH, authMiddleware.verifyToken, notificationController.getNotifications);

// Route cụ thể phải đặt TRƯỚC route động (:id)
router.get(
  '/notifications/unread-count',
  authMiddleware.verifyToken,
  notificationController.getUnreadCount
);

router.post(
  '/notifications/mark-read',
  authMiddleware.verifyToken,
  notificationController.markAsRead
);

// Route động với :id phải đặt CUỐI CÙNG
router.get(
  '/notifications/:id',
  authMiddleware.verifyToken,
  notificationController.getNotificationById
);

// --- Admin Routes (yêu cầu quyền admin) ---
router.get(
    '/admin/notifications/all',
    [authMiddleware.verifyToken, authMiddleware.isAdmin],
    notificationController.getAdminAllNotifications
);

router.get(
    '/admin/notifications/sent',
    [authMiddleware.verifyToken, authMiddleware.isAdmin],
    notificationController.getAdminSentNotifications
);

router.get(
    '/admin/notifications/received',
    [authMiddleware.verifyToken, authMiddleware.isAdmin],
    notificationController.getAdminReceivedNotifications
);

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
    `${BASE_PATH}/revoke`,
    [authMiddleware.verifyToken, authMiddleware.isAdmin],
    notificationController.revokeNotifications
);

router.post(
    `${BASE_PATH}/delete`,
    [authMiddleware.verifyToken, authMiddleware.isAdmin],
    notificationController.deleteNotifications
);

router.delete(
    '/admin/notifications/delete-all',
    [authMiddleware.verifyToken, authMiddleware.isAdmin],
    notificationController.deleteAllNotifications
);

router.get(
    '/admin/notifications/columns',
    [authMiddleware.verifyToken, authMiddleware.isAdmin],
    notificationController.getTableColumns
);

module.exports = router;
