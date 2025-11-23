// file: routes/moderationRoutes.js
const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');
const authMiddleware = require('../middlewares/authMiddleware');

// --- User Routes ---
// Tạo báo cáo
router.post('/reports', authMiddleware.verifyToken, moderationController.createUserReport);
// Tạo khiếu nại
router.post('/appeals', authMiddleware.verifyToken, moderationController.createUserAppeal);


// --- Admin Routes ---
const ADMIN_BASE = '/moderation';
router.use(ADMIN_BASE, [authMiddleware.verifyToken, authMiddleware.isAdmin]);

// Reports
router.get(`${ADMIN_BASE}/reports`, moderationController.getReports);
router.put(`${ADMIN_BASE}/reports/:reportId/status`, moderationController.updateReportStatus);

// Violations
router.post(`${ADMIN_BASE}/violations`, moderationController.createViolation);
router.get(`${ADMIN_BASE}/violations`, moderationController.getViolations);
router.get(`${ADMIN_BASE}/violations/target-types`, moderationController.getViolationTargetTypes);
router.delete(`${ADMIN_BASE}/violations/:id`, moderationController.deleteViolation);

// Appeals
router.get(`${ADMIN_BASE}/appeals`, moderationController.getAdminAppeals);
router.get(`${ADMIN_BASE}/appeals/:appealId`, moderationController.getAppealDetails);
router.put(`${ADMIN_BASE}/appeals/:appealId/process`, moderationController.processAppeal);

module.exports = router;