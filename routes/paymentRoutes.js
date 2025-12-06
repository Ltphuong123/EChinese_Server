// file: routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');

const basePath = '/monetization/payments';

router.post(
    '/payments/request', 
    authMiddleware.verifyToken, // Chỉ cần đăng nhập
    paymentController.requestPayment
);

router.post(
    '/monetization/payments', 
    authMiddleware.verifyToken, // Chỉ cần đăng nhập
    paymentController.createPayment
);

router.use(basePath, [authMiddleware.verifyToken, authMiddleware.isAdmin]);

router.get(`${basePath}/search`, paymentController.searchPayments);

// GET /api/monetization/payments - Lấy danh sách giao dịch
router.get(basePath, paymentController.getAllPayments);

// PUT /api/monetization/payments/bulk-status - Cập nhật hàng loạt
router.put(`${basePath}/bulk-status`, paymentController.bulkUpdatePaymentStatus);

// PUT /api/monetization/payments/:paymentId/status - Cập nhật một giao dịch
router.put(`${basePath}/:paymentId/status`, paymentController.updatePaymentStatus);

// DELETE /api/monetization/payments/all - Xóa tất cả payments (chỉ super admin)
router.delete(
  `${basePath}/all`,
  [authMiddleware.verifyToken, authMiddleware.isSuperAdmin],
  paymentController.deleteAllPayments
);

// GET /api/monetization/payments/auto-confirm - Lấy trạng thái auto confirm
router.get(`${basePath}/auto-confirm`, paymentController.getAutoConfirmStatus);

// PUT /api/monetization/payments/auto-confirm - Bật/tắt auto confirm
router.put(`${basePath}/auto-confirm`, paymentController.setAutoConfirmStatus);

module.exports = router;