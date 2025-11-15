// file: routes/aiModerationRoutes.js

const express = require('express');
const router = express.Router();
const aiModerationController = require('../controllers/aiModerationController');
const authMiddleware = require('../middlewares/authMiddleware');

// Test APIs - Yêu cầu admin để test
router.post(
  '/ai-moderation/test-text',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  aiModerationController.testTextModeration
);

router.post(
  '/ai-moderation/test-image',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  aiModerationController.testImageModeration
);

router.post(
  '/ai-moderation/test-content',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  aiModerationController.testContentModeration
);

module.exports = router;
