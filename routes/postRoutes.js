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

router.post(
  `/community/posts/:postId/view`,
  authMiddleware.verifyToken,
  postController.recordPostView
);

router.get(`/community/posts/:postId/views`, postController.getPostViews);

router.get(`/community/posts/:postId/likes`, postController.getPostLikes);


router.delete(
  `${BASE_PATH}/:postId`,
  authMiddleware.verifyToken,
  postController.removePost
);


router.put(
  `/community/posts/:postId/restore`,
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  postController.restorePost // Đặt hàm controller trong postController
);

// Moderation endpoint (admin remove/restore + violation logging)
router.post(
  `/community/posts/:postId/moderation`,
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  postController.moderatePost
);



module.exports = router;
