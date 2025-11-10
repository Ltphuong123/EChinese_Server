// file: routes/adminLogRoutes.js

const express = require('express');
const router = express.Router();
const adminLogController = require('../controllers/adminLogController');
const authMiddleware = require('../middlewares/authMiddleware');

const adminMiddleware = [authMiddleware.verifyToken, authMiddleware.isAdmin];

// POST /api/admin/logs - Tạo một bản ghi log mới
router.post(
  '/admin/logs',
  adminMiddleware,
  adminLogController.createAdminLog
);

// GET /api/admin/logs - Lấy danh sách các bản ghi log
router.get(
  '/admin/logs',
  adminMiddleware,
  adminLogController.getAdminLogs
);

module.exports = router;