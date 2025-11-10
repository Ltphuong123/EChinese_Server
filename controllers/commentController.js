// file: controllers/commentController.js

const commentService = require('../services/commentService');

const commentController = {
  // CREATE
  createComment: async (req, res) => {
    try {
      const { postId } = req.params;
      const { content, parentCommentId } = req.body;
      const userId = req.user.id; // Lấy từ token

      if (!content) {
        return res.status(400).json({ success: false, message: 'Nội dung bình luận là bắt buộc.' });
      }

      const newComment = await commentService.createComment(postId, userId, content, parentCommentId);
      res.status(210).json({ success: true, message: 'Bình luận thành công.', data: newComment });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
          return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi tạo bình luận', error: error.message });
    }
  },

  // READ (All for a post)
  getComments: async (req, res) => {
    try {
      const { postId } = req.params;
      const comments = await commentService.getCommentsForPost(postId);
      res.status(200).json({ 
        success: true, 
        message: 'Lấy danh sách bình luận thành công.',
        data: comments 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy bình luận', error: error.message });
    }
  },



  getCommentById: async (req, res) => {
    try {
      const { commentId } = req.params;
      const comment = await commentService.getCommentById(commentId);
      res.status(200).json({ success: true, data: comment });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi lấy bình luận', error: error.message });
    }
  },

  // UPDATE
  updateComment: async (req, res) => {
    try {
      const { commentId } = req.params;
      const payload = req.body;
      const userId = req.user.id;

      const updatedComment = await commentService.updateComment(commentId, userId, payload);
      res.status(200).json({ success: true, message: 'Cập nhật bình luận thành công.', data: updatedComment });
    } catch (error) {
      if (error.message.includes('không tồn tại') || error.message.includes('không có quyền')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes('bắt buộc')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật bình luận', error: error.message });
    }
  },


  

  
};

module.exports = commentController;