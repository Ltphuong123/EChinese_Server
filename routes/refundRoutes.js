// file: routes/refundRoutes.js

const express = require('express');
const router = express.Router();
const refundController = require('../controllers/refundController');
const authMiddleware = require('../middlewares/authMiddleware');

// --- Admin Routes ---
const adminPath = '/monetization/refunds';
router.use(adminPath, [authMiddleware.verifyToken, authMiddleware.isAdmin]);
router.get(adminPath, refundController.getAllRefunds);
router.put(`${adminPath}/:id/process`, refundController.processRefund);

// --- User Routes ---
const userPath = '/refunds';
router.use(userPath, authMiddleware.verifyToken); // Chỉ cần đăng nhập
router.post(userPath, refundController.createUserRefundRequest);
router.get(userPath, refundController.getUserRefundHistory);

// DELETE /api/monetization/refunds/all - Xóa tất cả refunds (chỉ super admin)
router.delete(
  `${adminPath}/all`,
  [authMiddleware.verifyToken, authMiddleware.isSuperAdmin],
  refundController.deleteAllRefunds
);

module.exports = router;