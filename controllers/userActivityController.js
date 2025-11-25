// file: controllers/userActivityController.js
// Controller xử lý các API lấy hoạt động của user trong cộng đồng

const userActivityService = require('../services/userActivityService');

const userActivityController = {
  /**
   * GET /community/users/:userId/posts
   * Lấy danh sách bài viết của user (không bao gồm bài đã gỡ)
   */
  getUserPosts: async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const result = await userActivityService.getUserPosts(userId, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      });

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy bài viết của người dùng',
        error: error.message
      });
    }
  },

  /**
   * GET /community/users/:userId/liked-posts
   * Lấy danh sách bài viết user đã thích
   */
  getUserLikedPosts: async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const result = await userActivityService.getUserLikedPosts(userId, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      });

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy bài viết đã thích',
        error: error.message
      });
    }
  },

  /**
   * GET /community/users/:userId/commented-posts
   * Lấy danh sách bài viết user đã bình luận
   */
  getUserCommentedPosts: async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const result = await userActivityService.getUserCommentedPosts(userId, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      });

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy bài viết đã bình luận',
        error: error.message
      });
    }
  },

  /**
   * GET /community/users/:userId/viewed-posts
   * Lấy danh sách bài viết user đã xem
   */
  getUserViewedPosts: async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const result = await userActivityService.getUserViewedPosts(userId, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      });

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy bài viết đã xem',
        error: error.message
      });
    }
  },

  /**
   * GET /community/users/:userId/removed-posts
   * Lấy danh sách bài viết của user đã bị gỡ
   */
  getUserRemovedPosts: async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const result = await userActivityService.getUserRemovedPosts(userId, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      });

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy bài viết đã bị gỡ',
        error: error.message
      });
    }
  },

  /**
   * GET /community/users/:userId/removed-comments
   * Lấy danh sách bình luận của user đã bị gỡ
   */
  getUserRemovedComments: async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const result = await userActivityService.getUserRemovedComments(userId, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
      });

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy bình luận đã bị gỡ',
        error: error.message
      });
    }
  }
};

module.exports = userActivityController;