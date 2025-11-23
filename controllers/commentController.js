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
        user_id: userId,
        post_id: postId
      }).then(result => {
        if (result.removed) {
          console.log(`Comment ${newComment.id} auto-removed:`, result.reason);
        }
      }).catch(error => {
        console.error('Auto moderation error:', error);
      });

      // Gửi thông báo cho chủ bài viết (nếu không phải tự comment)
      try {
        const postService = require('../services/postService');
        const post = await postService.getPostById(postId);
        
        if (post && post.user_id !== userId) {
          const userModel = require('../models/userModel');
          const commenter = await userModel.findUserById(userId);
          
          // Tạo preview của comment
          const commentPreview = typeof content === 'string' 
            ? content.substring(0, 100) 
            : (content?.text || content?.html || '').substring(0, 100);
          
          const notificationService = require('../services/notificationService');
          await notificationService.createNotification({
            recipient_id: post.user_id,
            audience: 'user',
            type: 'community',
            title: '💬 Có người bình luận bài viết của bạn',
            content: {
              html: `<p><strong>${commenter?.name || 'Một người dùng'}</strong> đã bình luận vào bài viết <strong>"${post.title}"</strong> của bạn.</p>
<p><em>Nội dung bình luận:</em> "${commentPreview}..."</p>
${parentCommentId ? '<p><small>💬 Đây là một phản hồi trong chuỗi bình luận</small></p>' : ''}
<hr>
<p><small><strong>📌 Thông tin chi tiết:</strong></small></p>
<ul style="font-size: 0.9em;">
  <li><strong>Bài viết:</strong> ${post.title}</li>
  <li><strong>Người bình luận:</strong> ${commenter?.name || 'Người dùng'}</li>
  <li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li>
  ${parentCommentId ? '<li><strong>Loại:</strong> Phản hồi bình luận</li>' : ''}
</ul>`
            },
            redirect_type: 'post_comment',
            data: {
              comment_id: newComment.id,
              post_id: postId,
              type: 'comment'
            }
          }, true); // auto push = true
        }

        // Nếu là reply, gửi thông báo cho người được reply
        if (parentCommentId) {
          const parentComment = await commentService.getCommentById(parentCommentId);
          if (parentComment && parentComment.user_id !== userId) {
            const userModel = require('../models/userModel');
            const commenter = await userModel.findUserById(userId);
            
            const commentPreview = typeof content === 'string' 
              ? content.substring(0, 100) 
              : (content?.text || content?.html || '').substring(0, 100);
            
            const notificationService = require('../services/notificationService');
            await notificationService.createNotification({
              recipient_id: parentComment.user_id,
              audience: 'user',
              type: 'community',
              title: '↩️ Có người trả lời bình luận của bạn',
              content: {
                html: `<p><strong>${commenter?.name || 'Một người dùng'}</strong> đã trả lời bình luận của bạn.</p>
<p><em>Nội dung trả lời:</em> "${commentPreview}..."</p>
<hr>
<p><small><strong>�  Thông tin chi tiết:</strong></small></p>
<ul style="font-size: 0.9em;">
  <li><strong>Người trả lời:</strong> ${commenter?.name || 'Người dùng'}</li>
  <li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li>
  <li><strong>Bài viết ID:</strong> ${postId}</li>
</ul>
<p><small>💡 Nhấn để xem chuỗi bình luận đầy đủ</small></p>`
              },
              redirect_type: 'post_comment',
              data: {
                comment_id: newComment.id,
                post_id: postId,
                type: 'comment'
              }
            }, true); // auto push = true
          }
        }
      } catch (notifError) {
        console.error('Error sending comment notification:', notifError);
        // Không throw error để không ảnh hưởng đến việc tạo comment
      }

      res.status(201).json({ success: true, message: 'Bình luận thành công.', data: newComment });
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
      
      // Format response theo spec
      res.status(200).json({ 
        success: true, 
        data: {
          id: comment.id,
          post_id: comment.post_id,
          user_id: comment.user_id,
          parent_id: comment.parent_id || null,
          content: comment.content,
          deleted_at: comment.deleted_at || null,
          deleted_by: comment.deleted_by || null,
          deleted_reason: comment.deleted_reason || null,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          likes_count: comment.likes_count || 0
        }
      });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ 
          success: false, 
          error: 'Comment not found' 
        });
      }
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        message: error.message 
      });
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
      const moderationModel = require("../models/moderationModel");
      
      // Tìm và xóa vi phạm liên quan đến comment này (nếu có)
      const violations = await moderationModel.findViolationsByTarget("comment", commentId);
      if (violations && violations.length > 0) {
        for (const violation of violations) {
          await moderationModel.deleteViolation(violation.id);
        }
      }
      
      // Tạo preview của comment
      const commentPreview = typeof comment.content === 'string' 
        ? comment.content.substring(0, 100) 
        : (comment.content?.text || comment.content?.html || '').substring(0, 100);
      
      // Gửi thông báo chi tiết cho user với lý do khôi phục
      const restoreReason = reason || 'Bình luận của bạn đã được xem xét lại và khôi phục.';
      const violationsCleared = violations ? violations.length : 0;
      
      const notificationService = require('../services/notificationService');
      await notificationService.createNotification({
        recipient_id: comment.user_id,
        audience: 'user',
        type: 'community',
        title: '✅ Bình luận của bạn đã được khôi phục',
        content: {
          html: `<p>Bình luận của bạn đã được quản trị viên khôi phục.</p>
<p><strong>Lý do khôi phục:</strong> ${restoreReason}</p>
${violationsCleared > 0 ? `<p>✅ Đã xóa <strong>${violationsCleared}</strong> vi phạm liên quan.</p>` : ''}
<p><em>Nội dung bình luận:</em> "${commentPreview}..."</p>
<hr>
<p><small><strong>📌 Thông tin chi tiết:</strong></small></p>
<ul style="font-size: 0.9em;">
  <li><strong>Khôi phục bởi:</strong> Quản trị viên</li>
  <li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li>
  <li><strong>Vi phạm đã xóa:</strong> ${violationsCleared}</li>
  <li><strong>Bài viết ID:</strong> ${comment.post_id}</li>
</ul>
<p><small>💚 Cảm ơn bạn đã đóng góp ý kiến cho cộng đồng!</small></p>`
        },
        redirect_type: 'post_comment',
        data: {
          comment_id: commentId,
          post_id: comment.post_id,
          type: 'comment'
        }
      }, true); // auto push = true
      
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

      // Gửi thông báo chi tiết cho user (kiểm tra removedComment có user_id)
      if (removedComment && removedComment.user_id) {
        // Tạo preview của comment
        const commentPreview = typeof removedComment.content === 'string' 
          ? removedComment.content.substring(0, 100) 
          : (removedComment.content?.text || removedComment.content?.html || '').substring(0, 100);
        
        // Lấy thông tin chi tiết các rule bị vi phạm
        const db = require("../config/db");
        let violatedRulesDetail = [];
        if (ruleIds && ruleIds.length > 0) {
          const rulesResult = await db.query(
            `SELECT id, title, description, severity_default FROM "CommunityRules" WHERE id = ANY($1::uuid[])`,
            [ruleIds]
          );
          violatedRulesDetail = rulesResult.rows.map(r => ({
            id: r.id,
            title: r.title,
            description: r.description,
            severity: r.severity_default
          }));
        }
        
        const rulesText = violatedRulesDetail.map((r, i) => 
          `<li><strong>${r.title}</strong> (${r.severity}): ${r.description}</li>`
        ).join('');
        
        const notificationService = require('../services/notificationService');
        await notificationService.createNotification({
          recipient_id: removedComment.user_id,
          audience: 'user',
          type: 'violation',
          title: '⚠️ Bình luận của bạn đã bị gỡ do vi phạm',
          content: {
            html: `<p>Bình luận của bạn đã bị gỡ bởi quản trị viên.</p>
<p><strong>Lý do:</strong> ${reason}</p>
<p><strong>Độ nghiêm trọng:</strong> <span class="badge-${severity || 'medium'}">${severity || 'medium'}</span></p>
<p><strong>Vi phạm:</strong> ${violatedRulesDetail.length} quy tắc cộng đồng</p>
${violatedRulesDetail.length > 0 ? `<p><strong>Các quy tắc bị vi phạm:</strong></p><ul>${rulesText}</ul>` : ''}
<p><em>Nội dung bình luận:</em> "${commentPreview}..."</p>
<hr>
<p><small><strong>📌 Thông tin chi tiết:</strong></small></p>
<ul style="font-size: 0.9em;">
  <li><strong>Gỡ bởi:</strong> Quản trị viên</li>
  <li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li>
  <li><strong>Bài viết ID:</strong> ${removedComment.post_id}</li>
  <li><strong>Số quy tắc vi phạm:</strong> ${violatedRulesDetail.length}</li>
</ul>
<p><small>⚖️ Bạn có thể khiếu nại quyết định này nếu cho rằng đây là nhầm lẫn.</small></p>`
          },
          redirect_type: 'post_comment',
          data: {
            comment_id: commentId,
            post_id: removedComment.post_id,
            type: 'comment_remove'
          }
        }, true); // auto push = true
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