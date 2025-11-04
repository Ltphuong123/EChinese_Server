// file: controllers/postController.js

const postService = require('../services/postService');

const postController = {
  // CREATE
  createPost: async (req, res) => {
    try {
      const postData = req.body;
      const userId = req.user.id; // Lấy từ token

      if (!postData.title || !postData.content || !postData.topic) {
        return res.status(400).json({ success: false, message: 'Tiêu đề, nội dung và chủ đề là bắt buộc.' });
      }

      const newPost = await postService.createPost(postData, userId);
      res.status(201).json({ success: true, message: 'Tạo bài viết thành công.', data: newPost });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi tạo bài viết', error: error.message });
    }
  },

  // READ (All)
  getPosts: async (req, res) => {
    try {
      const filters = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
        topic: req.query.topic || '',
        userId: req.user.id || '',
      };
      const result = await postService.getPublicPosts(filters);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách bài viết', error: error.message });
    }
  },

  // READ (One)
  getPostById: async (req, res) => {
    try {
      const { postId } = req.params;
      const post = await postService.getPostById(postId);
      res.status(200).json({ success: true, data: post });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi lấy bài viết', error: error.message });
    }
  },

  // UPDATE
  updatePost: async (req, res) => {
    try {
      const { postId } = req.params;
      const postData = req.body;
      const userId = req.user.id;

      const updatedPost = await postService.updatePost(postId, userId, postData);
      res.status(200).json({ success: true, message: 'Cập nhật bài viết thành công.', data: updatedPost });
    } catch (error) {
      if (error.message.includes('không tồn tại') || error.message.includes('không có quyền')) {
        return res.status(404).json({ success: false, message: error.message });
      }
       if (error.message.includes('Không có dữ liệu')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật bài viết', error: error.message });
    }
  },

  toggleLikePost: async (req, res) => {
    try {
      const { postId } = req.params;
      const userId = req.user.id; // Lấy từ token

      const result = await postService.toggleLike(postId, userId);
      
      res.status(200).json({
        success: true,
        message: result.action === 'liked' ? 'Đã thích bài viết.' : 'Đã bỏ thích bài viết.',
        data: {
          action: result.action,
          likes: result.likes,
        }
      });
    } catch (error) {
       if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi thực hiện thao tác', error: error.message });
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
        message: 'Ghi nhận lượt xem thành công.',
        data: {
          views: newViewCount,
        }
      });
    } catch (error) {
       if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi ghi nhận lượt xem', error: error.message });
    }
  },


  softDeletePostByUser: async (req, res) => {
    try {
      const { postId } = req.params;
      const userId = req.user.id; // Lấy từ token

      await postService.softDeletePost(postId, userId);
      
      res.status(204).send();
    } catch (error) {
      if (error.message.includes('không tồn tại') || error.message.includes('không có quyền')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi xóa bài viết', error: error.message });
    }
  },


};

module.exports = postController;