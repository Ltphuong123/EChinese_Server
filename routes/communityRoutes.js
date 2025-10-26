// file: routes/communityRoutes.js

const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const authMiddleware = require('../middlewares/authMiddleware');

// GET /api/community/stats
// Chỉ admin mới xem được thống kê
router.get(
  '/community/stats',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  communityController.getCommunityStats
);
router.get(
  '/community/moderation-logs',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  communityController.getModerationLogs
);

module.exports = router;