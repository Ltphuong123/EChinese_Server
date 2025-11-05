// file: routes/postRoutes.js

const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const authMiddleware = require("../middlewares/authMiddleware");
const moderationController = require("../controllers/moderationController");

const BASE_PATH = "/community/posts";

router.get(
  "/community/posts",
  authMiddleware.verifyToken,
  postController.getPosts
);

router.get(
  `/community/posts/:postId`,
  authMiddleware.verifyToken,
  postController.getPostById
);

router.post(
  "/community/posts",
  authMiddleware.verifyToken,
  postController.createPost
);

router.put(
  `/community/posts/:postId`,
  authMiddleware.verifyToken,
  postController.updatePost
);

router.post(
  `/community/posts/:postId/like`,
  authMiddleware.verifyToken,
  postController.toggleLikePost
);

router.get(`/community/posts/:postId/views`, postController.getPostViews);

router.get(`/community/posts/:postId/likes`, postController.getPostLikes);

// Ghi nhận một lượt xem bài viết
// router.delete(
//   `/community/posts/:postId`,
//   authMiddleware.verifyToken,
//   postController.softDeletePost
// );

// router.delete(
//   `${BASE_PATH}/:postId`,
//   authMiddleware.verifyToken,
//   postController.softDeletePostByUser
// );

// // ADMIN: Gỡ bài viết của bất kỳ ai
// router.delete(
//   `/admin${BASE_PATH}/:postId`,
//   [authMiddleware.verifyToken, authMiddleware.isAdmin],
//   moderationController.removePostByAdmin // Đặt trong moderationController sẽ logic hơn
// );

// // ADMIN: Khôi phục một bài viết đã gỡ
// router.post(
//   `/admin${BASE_PATH}/:postId/restore`,
//   [authMiddleware.verifyToken, authMiddleware.isAdmin],
//   moderationController.restorePostByAdmin // Đặt trong moderationController
// );

module.exports = router;
