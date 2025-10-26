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

module.exports = router;