// file: routes/dashboardRoutes.js

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

const basePath = '/monetization/dashboard';

router.use(basePath, [authMiddleware.verifyToken, authMiddleware.isAdmin]);

router.get(`${basePath}/stats`, dashboardController.getStats);

router.get(
  '/admin/dashboard/analytics',
  dashboardController.getAnalytics
);

// GET /api/admin/dashboard/charts?days=...
router.get(
  '/admin/dashboard/charts',
  dashboardController.getChartData
);

// GET /api/admin/dashboard/community
router.get(
  '/admin/dashboard/community',
  dashboardController.getCommunityData
);


module.exports = router;