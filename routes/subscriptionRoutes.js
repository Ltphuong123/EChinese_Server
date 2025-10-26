// file: routes/subscriptionRoutes.js

const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middlewares/authMiddleware');

const basePath = '/monetization/subscriptions';

// router.get('/subscription/list', subscriptionController.getPublicList);
// Áp dụng middleware cho tất cả các route trong file này
router.use(basePath, [authMiddleware.verifyToken, authMiddleware.isAdmin]);

// GET /api/monetization/subscriptions - Lấy danh sách
router.get(basePath, subscriptionController.getAllSubscriptions);

// POST /api/monetization/subscriptions - Tạo mới
router.post(basePath, subscriptionController.createSubscription);

// GET /api/monetization/subscriptions/:subscriptionId/usage - Lấy usage
router.get(`${basePath}/:subscriptionId/usage`, subscriptionController.getSubscriptionUsage);

// PUT /api/monetization/subscriptions/:id - Cập nhật
router.put(`${basePath}/:id`, subscriptionController.updateSubscription);

// DELETE /api/monetization/subscriptions/:id - Xóa
router.delete(`${basePath}/:id`, subscriptionController.deleteSubscription);


module.exports = router;