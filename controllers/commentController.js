// file: controllers/commentController.js

const commentService = require('../services/commentService');
const communityService = require('../services/communityService');


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

      // Tự động kiểm duyệt bằng AI (chạy async, không chờ)
      const autoModerationService = require('../services/autoModerationService');
      autoModerationService.moderateComment(newComment.id, {
        content: content,
        user_id: userId
      }).then(result => {
        if (result.removed) {
          console.log(`Comment ${newComment.id} auto-removed:`, result.reason);
        }
      }).catch(error => {
        console.error('Auto moderation error:', error);
      });

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


  removeComment: async (req, res) => {
    try {
      const { commentId } = req.params;
      const { reason } = req.body; // Lý do gỡ
      
      const user = {
          id: req.user.id,
          role: req.user.role
      };

      await commentService.removeComment(commentId, user, reason);

      res.status(200).json({ success: true, message: 'Gỡ bình luận thành công.' });
    } catch (error) {
      if (error.message.includes('không tồn tại') || error.message.includes('không có quyền')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes('đã bị gỡ')) {
          return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi gỡ bình luận', error: error.message });
    }
  },


  restoreComment: async (req, res) => {
    try {
      const { commentId } = req.params;
      const { reason } = req.body;
      const adminId = req.user.id;

      if (!reason) {
        return res.status(400).json({ success: false, message: 'Lý do khôi phục là bắt buộc.' });
      }

      await commentService.restoreComment(commentId, adminId);

      // Lấy lại comment để gửi thông báo
      const comment = await commentService.getCommentById(commentId);
      
      // Gửi thông báo cho user
      await require('../models/notificationModel').create({
        recipient_id: comment.user_id,
        audience: 'user',
        type: 'community',
        title: 'Bình luận của bạn đã được khôi phục',
        content: JSON.stringify({ html: reason }),
      });
      
      res.status(200).json({ success: true, message: 'Khôi phục bình luận thành công.', comment });
    } catch (error) {
      if (error.message.includes('không tồn tại') || error.message.includes('chưa bị gỡ')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi khôi phục bình luận', error: error.message });
    }
  },

  // Remove comment with violation (admin only)
  removeCommentWithViolation: async (req, res) => {
    try {
      const { commentId } = req.params;
      const { reason, ruleIds, resolution, severity } = req.body;
      const adminId = req.user.id;

      if (!reason || !ruleIds || !severity) {
        return res.status(400).json({ 
          success: false, 
          message: 'Các trường reason, ruleIds và severity là bắt buộc.' 
        });
      }

      const removedComment = await commentService.removeCommentWithViolation(
        commentId, 
        adminId, 
        { reason, ruleIds, resolution, severity }
      );

      // Gửi thông báo cho user (kiểm tra removedComment có user_id)
      if (removedComment && removedComment.user_id) {
        await require('../models/notificationModel').create({
          recipient_id: removedComment.user_id,
          audience: 'user',
          type: 'community',
          title: 'Bình luận của bạn đã bị gỡ',
          content: JSON.stringify({ html: reason }),
        });
      }

      res.status(200).json({ 
        success: true, 
        message: 'Gỡ bình luận thành công.', 
        comment: removedComment 
      });
    } catch (error) {
      if (error.message.includes('không tồn tại') || error.message.includes('đã bị gỡ')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ 
        success: false, 
        message: 'Lỗi khi gỡ bình luận', 
        error: error.message 
      });
    }
  },
};

module.exports = commentController;