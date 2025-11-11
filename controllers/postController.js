// file: controllers/postController.js

const postService = require("../services/postService");

const postController = {
  // CREATE
  createPost: async (req, res) => {
    try {
      const postData = req.body;
      const userId = req.user.id; // Lấy từ token

      if (!postData.title || !postData.content || !postData.topic) {
        return res.status(400).json({
          success: false,
          message: "Tiêu đề, nội dung và chủ đề là bắt buộc.",
        });
      }

      const newPost = await postService.createPost(postData, userId);
      res.status(201).json({
        success: true,
        message: "Tạo bài viết thành công.",
        data: newPost,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi tạo bài viết",
        error: error.message,
      });
    }
  },

  // READ (All)
  getPosts: async (req, res) => {
    try {
      const filters = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
        topic: req.query.topic || "",
        userId: req.user.id || "",
        status: req.query.status,
      };
      const result = await postService.getPublicPosts(filters);
      res.status(200).json({ success: true, data:result });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy danh sách bài viết",
        error: error.message,
      });
    }
  },


  // READ (One)
  getPostById: async (req, res) => {
    try {
      const { postId } = req.params;
      const post = await postService.getPostById(postId);
      res.status(200).json({ success: true, data: post });
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy bài viết",
        error: error.message,
      });
    }
  },

  // UPDATE
  updatePost: async (req, res) => {
    try {
      const { postId } = req.params;
      const postData = req.body;
      const userId = req.user.id;

      const updatedPost = await postService.updatePost(
        postId,
        userId,
        postData
      );
      res.status(200).json({
        success: true,
        message: "Cập nhật bài viết thành công.",
        data: updatedPost,
      });
    } catch (error) {
      if (
        error.message.includes("không tồn tại") ||
        error.message.includes("không có quyền")
      ) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes("Không có dữ liệu")) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi cập nhật bài viết",
        error: error.message,
      });
    }
  },

  toggleLikePost: async (req, res) => {
    try {
      const { postId } = req.params;
      const userId = req.user.id; // Lấy từ token

      const result = await postService.toggleLike(postId, userId);

      res.status(200).json({
        success: true,
        message:
          result.action === "liked"
            ? "Đã thích bài viết."
            : "Đã bỏ thích bài viết.",
        data: {
          action: result.action,
          likes: result.likes,
        },
      });
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi thực hiện thao tác",
        error: error.message,
      });
    }
  },

  getPostViews: async (req, res) => {
    try {
      const { postId } = req.params;
      const filters = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
      };
      const views = await postService.getPostViews(postId, filters);

      res.status(200).json({
        success: true,
        data: views,
        message: "Lấy danh sách người xem thành công.",
      });
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy số lượt xem",
        error: error.message,
      });
    }
  },

  getPostLikes: async (req, res) => {
    try {
      const { postId } = req.params;
      const filters = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
      };
      const likes = await postService.getPostLikes(postId, filters);
      res.status(200).json({
        success: true,
        data: likes,
        message: "Lấy danh sách người thích thành công.",
      });
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy danh sách người thích",
        error: error.message,
      });
    }
  },

  recordPostView: async (req, res) => {
    try {
      const { postId } = req.params;
      // Lấy userId nếu người dùng đã đăng nhập, không bắt buộc
      const userId = req.user ? req.user.id : null;

      const newViewCount = await postService.recordView(postId, userId);

      res.status(200).json({
        success: true,
        message: "Ghi nhận lượt xem thành công.",
        data: {
          views: newViewCount,
        },
      });
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi ghi nhận lượt xem",
        error: error.message,
      });
    }
  },



  
  
  removePost: async (req, res) => {
    try {
      const { postId } = req.params;
      const { reason } = req.body; // Lý do gỡ bài, có thể không bắt buộc
      
      // Lấy thông tin người dùng đang thực hiện hành động từ token
      const user = {
          id: req.user.id,
          role: req.user.role
      };

      await postService.removePost(postId, user, reason);

      res.status(200).json({ success: true, message: 'Gỡ bài viết thành công.' });
    } catch (error) {
      if (error.message.includes('không tồn tại') || error.message.includes('không có quyền')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes('đã bị gỡ')) {
          return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi gỡ bài viết', error: error.message });
    }
  },



  restorePost: async (req, res) => {
    try {
      const { postId } = req.params;
      const adminId = req.user.id; // Lấy ID admin từ token

      await postService.restorePost(postId, adminId);
      
      res.status(200).json({ success: true, message: 'Khôi phục bài viết thành công.' });
    } catch (error) {
      if (error.message.includes('không tồn tại') || error.message.includes('chưa bị gỡ')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi khôi phục bài viết', error: error.message });
    }
  },


  
};

module.exports = postController;
