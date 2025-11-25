// file: routes/userActivityRoutes.js
// Routes cho các API lấy hoạt động của user trong cộng đồng

const express = require('express');
const router = express.Router();
const userActivityController = require('../controllers/userActivityController');
const authMiddleware = require('../middlewares/authMiddleware');

// Tất cả routes đều yêu cầu xác thực
const authRequired = [authMiddleware.verifyToken];

// GET /community/users/:userId/posts - Lấy bài viết của user
router.get(
  '/community/users/:userId/posts',
  authRequired,
  userActivityController.getUserPosts
);

// GET /community/users/:userId/liked-posts - Lấy bài viết user đã thích
router.get(
  '/community/users/:userId/liked-posts',
  authRequired,
  userActivityController.getUserLikedPosts
);

// GET /community/users/:userId/commented-posts - Lấy bài viết user đã bình luận
router.get(
  '/community/users/:userId/commented-posts',
  authRequired,
  userActivityController.getUserCommentedPosts
);

// GET /community/users/:userId/viewed-posts - Lấy bài viết user đã xem
router.get(
  '/community/users/:userId/viewed-posts',
  authRequired,
  userActivityController.getUserViewedPosts
);

// GET /community/users/:userId/removed-posts - Lấy bài viết đã bị gỡ của user
router.get(
  '/community/users/:userId/removed-posts',
  authRequired,
  userActivityController.getUserRemovedPosts
);

// GET /community/users/:userId/removed-comments - Lấy bình luận đã bị gỡ của user
router.get(
  '/community/users/:userId/removed-comments',
  authRequired,
  userActivityController.getUserRemovedComments
);

module.exports = router;