// file: routes/simpleNotificationRoutes.js
// Routes đơn giản để gửi thông báo

const express = require('express');
const router = express.Router();
const simpleNotificationController = require('../controllers/simpleNotificationController');
const authMiddleware = require('../middlewares/authMiddleware');

// POST /api/send-notification - Gửi thông báo cho 1 user (Admin only)
router.post(
  '/send-notification',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  simpleNotificationController.sendToUser
);

// POST /api/send-notification-all - Gửi thông báo cho tất cả (Admin only)
router.post(
  '/send-notification-all',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  simpleNotificationController.sendToAll
);

module.exports = router;
