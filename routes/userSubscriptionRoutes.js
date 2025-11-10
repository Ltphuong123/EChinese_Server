// file: routes/userSubscriptionRoutes.js

const express = require('express');
const router = express.Router();
const userSubscriptionController = require('../controllers/userSubscriptionController');
const authMiddleware = require('../middlewares/authMiddleware');

const basePath = '/monetization/user-subscriptions';

router.use(basePath, [authMiddleware.verifyToken, authMiddleware.isAdmin]);

// GET /api/monetization/user-subscriptions
router.get(basePath, userSubscriptionController.getAll);

// GET /api/monetization/user-subscriptions/history/:userId
router.get(`${basePath}/history/:userId`, userSubscriptionController.getHistory);

// PUT /api/monetization/user-subscriptions/:userSubId
router.put(`${basePath}/:id`, userSubscriptionController.updateDetails);

router.post(basePath, userSubscriptionController.addSubscription);

module.exports = router;