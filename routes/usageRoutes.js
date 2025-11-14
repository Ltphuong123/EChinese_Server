// routes/usageRoutes.js

const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usageController');
const authMiddleware = require('../middlewares/authMiddleware');

// === GET /api/admin/usage ===
router.get(
  '/admin/usage',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  usageController.getAllUsageRecords
);

// === POST /api/admin/usage ===
router.post(
  '/admin/usage',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  usageController.createUsage
);

router.post(
    '/usage/increment',
    authMiddleware.verifyToken, // Bảo vệ route, đảm bảo có req.user
    usageController.incrementUsage
);

router.post(
    '/admin/usage/reset',
    authMiddleware.verifyToken, authMiddleware.isAdmin, // Yêu cầu cả đăng nhập và quyền admin
    usageController.resetUserUsage
);




module.exports = router;