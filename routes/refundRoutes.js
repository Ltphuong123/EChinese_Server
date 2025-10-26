// file: routes/refundRoutes.js

const express = require('express');
const router = express.Router();
const refundController = require('../controllers/refundController');
const authMiddleware = require('../middlewares/authMiddleware');

// --- Admin Routes ---
const adminPath = '/monetization/refunds';
router.use(adminPath, [authMiddleware.verifyToken, authMiddleware.isAdmin]);
router.get(adminPath, refundController.getAllRefunds);
router.put(`${adminPath}/:refundId/process`, refundController.processRefundRequest);

// --- User Routes ---
const userPath = '/refunds';
router.use(userPath, authMiddleware.verifyToken); // Chỉ cần đăng nhập
router.post(userPath, refundController.createUserRefundRequest);
router.get(userPath, refundController.getUserRefundHistory);


module.exports = router;