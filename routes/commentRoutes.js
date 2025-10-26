// file: routes/commentRoutes.js

const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middlewares/authMiddleware');
const moderationController = require('../controllers/moderationController');

// --- Routes liên quan đến Post ---
// Lấy danh sách bình luận của một bài viết (công khai)
router.get('/community/posts/:postId/comments', commentController.getComments);

router.get(
  '/community/comments/:commentId',
  commentController.getCommentById
);

// Thêm một bình luận mới (yêu cầu đăng nhập)
router.post(
  '/community/posts/:postId/comments',
  authMiddleware.verifyToken,
  commentController.createComment
);

// --- Routes liên quan đến Comment ---
// Cập nhật bình luận (yêu cầu đăng nhập)
router.put(
  '/community/comments/:commentId',
  authMiddleware.verifyToken,
  commentController.updateComment
);



// router.delete(
//   '/community/comments/:commentId',
//   authMiddleware.verifyToken,
//   commentController.softDeleteCommentByUser
// );

// // ADMIN: Gỡ bình luận của bất kỳ ai
// router.delete(
//   '/admin/community/comments/:commentId',
//   [authMiddleware.verifyToken, authMiddleware.isAdmin],
//   moderationController.removeCommentByAdmin // Tạo hàm mới trong moderationController
// );

// // ADMIN: Khôi phục một bình luận đã gỡ
// router.post(
//   '/admin/community/comments/:commentId/restore',
//   [authMiddleware.verifyToken, authMiddleware.isAdmin],
//   moderationController.restoreCommentByAdmin // Tạo hàm mới trong moderationController
// );




module.exports = router;