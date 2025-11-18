// file: services/commentService.js

const commentModel = require('../models/commentModel');
const postModel = require('../models/postModel'); // Để kiểm tra bài viết có tồn tại không
const communityService = require('../services/communityService');
const notificationModel = require('../models/notificationModel');
const userModel = require('../models/userModel');

const commentService = {
  createComment: async (postId, userId, content, parentCommentId) => {
    // Kiểm tra cấm bình luận đang hoạt động
    const activeBan = await notificationModel.findActiveBan(userId);
    if (activeBan) {
      const until = activeBan.expires_at ? new Date(activeBan.expires_at) : null;
      const untilText = until ? until.toLocaleString('vi-VN') : 'khi có thông báo khác';
      throw new Error(`Bạn đang bị cấm bình luận đến ${untilText}.`);
    }

    // Kiểm tra xem bài viết có tồn tại không
    const postExists = await postModel.findById(postId);
    if (!postExists) {
      throw new Error('Bài viết không tồn tại.');
    }
    
    // Đóng gói content vào object JSON
    const contentObject = { html: content }; // Giả sử content là chuỗi HTML


    const newComment = await commentModel.create({
      post_id: postId,
      user_id: userId,
      content: contentObject,
      parent_comment_id: parentCommentId
    });

    const notificationService = require('./notificationService');
    const userModel = require('../models/userModel');
    const commenter = await userModel.findUserById(userId);
    const commenterName = commenter?.username || 'Ai đó';
    const commentPreview = content.substring(0, 100).replace(/<[^>]*>/g, ''); // Remove HTML tags

    // 🔔 THÔNG BÁO 1: Comment bài viết (gửi cho chủ bài viết)
    if (postExists.user_id !== userId) {
      try {
        await notificationService.createNotification({
          recipient_id: postExists.user_id,
          audience: 'user',
          type: 'community',
          title: `💬 ${commenterName} đã bình luận bài viết của bạn`,
          content: { 
            message: `${commenterName} đã bình luận: "${commentPreview}..."` 
          },
          redirect_type: 'post_comment',
          data: { 
            post_id: postId,
            comment_id: newComment.id,
            commenter_id: userId,
            commenter_name: commenterName,
            commenter_avatar: commenter?.avatar || '',
            comment_preview: commentPreview
          },
          priority: 1
        });
      } catch (error) {
        console.error('❌ Error sending comment notification:', error);
      }
    }

    // 🔔 THÔNG BÁO 2: Reply comment (gửi cho chủ comment cha)
    if (parentCommentId) {
      try {
        const parentComment = await commentModel.findByIdWithDetails(parentCommentId);
        if (parentComment && parentComment.user_id !== userId) {
          await notificationService.createNotification({
            recipient_id: parentComment.user_id,
            audience: 'user',
            type: 'community',
            title: `↩️ ${commenterName} đã phản hồi bình luận của bạn`,
            content: { 
              message: `${commenterName} đã phản hồi: "${commentPreview}..."` 
            },
            redirect_type: 'post_comment',
            data: { 
              post_id: postId,
              comment_id: newComment.id,
              parent_comment_id: parentCommentId,
              replier_id: userId,
              replier_name: commenterName,
              replier_avatar: commenter?.avatar || '',
              reply_preview: commentPreview
            },
            priority: 1
          });
        }
      } catch (error) {
        console.error('❌ Error sending reply notification:', error);
      }
    }

    return newComment;
  },

  getCommentsForPost: async (postId) => {
    // 1. Lấy danh sách comment phẳng từ DB (đã bao gồm user và badge)
    const allComments = await commentModel.findAllByPostId(postId);
    
    // 2. Logic xây dựng cây (giữ nguyên)
    const commentMap = new Map();
    const rootComments = [];

    allComments.forEach(comment => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    });

    allComments.forEach(comment => {
      if (comment.parent_comment_id && commentMap.has(comment.parent_comment_id)) {
        commentMap.get(comment.parent_comment_id).replies.push(comment);
      } else {
        rootComments.push(comment);
      }
    });

    return rootComments;
  },


  updateComment: async (commentId, userId, payload) => {
    // Chỉ cho phép cập nhật content
    if (!payload.content) {
        throw new Error("Dữ liệu 'content' là bắt buộc để cập nhật.");
    }
    const contentObject = (typeof payload.content === 'string') ? { html: payload.content } : payload.content;

    const updatedComment = await commentModel.update(commentId, userId, contentObject);
    if (!updatedComment) {
      throw new Error('Cập nhật thất bại. Bình luận không tồn tại hoặc bạn không có quyền chỉnh sửa.');
    }
    return updatedComment;
  },

  getCommentById: async (commentId) => {
    // Tái sử dụng hàm findById đã có trong model
    const comment = await commentModel.findByIdWithDetails(commentId); // Cần tạo hàm mới trong model
    if (!comment) {
      throw new Error('Bình luận không tồn tại hoặc đã bị xóa.');
    }
    return comment;
  },

  
  


  removeComment: async (commentId, user, reason) => {
    // 1. Lấy thông tin bình luận và bài viết chứa nó
    const comment = await commentModel.findWithPostOwner(commentId);
    
    if (!comment) {
      throw new Error("Bình luận không tồn tại.");
    }
    
    if (comment.deleted_at) {
        throw new Error("Bình luận này đã bị gỡ trước đó.");
    }

    // 2. Logic phân quyền
    const isAdmin = user.role === 'admin' || user.role === 'super admin';
    const isCommentOwner = comment.user_id === user.id;
    const isPostOwner = comment.post_owner_id === user.id;

    if (!isAdmin && !isCommentOwner && !isPostOwner) {
      // Nếu không phải admin, không phải chủ bình luận, và cũng không phải chủ bài viết -> Từ chối
      throw new Error("Bạn không có quyền gỡ bình luận này.");
    }
    
    // 3. Chuẩn bị dữ liệu để xóa mềm
    const dataToRemove = {
      deleted_at: new Date(),
      deleted_by: user.id,
      deleted_reason: reason || 
        (isAdmin ? "Gỡ bởi quản trị viên" : 
        (isPostOwner ? "Gỡ bởi chủ bài viết" : "Gỡ bởi người dùng")),
    };

    // 4. Gọi model để cập nhật
    await commentModel.softDelete(commentId, dataToRemove);
    
    // 5. (Tùy chọn) Ghi log hành động kiểm duyệt
    if (isAdmin || isPostOwner) {
        await communityService.createLog({
            target_type: 'comment',
            target_id: commentId,
            action: 'gỡ',
            reason: reason || (isAdmin ? "Gỡ bởi quản trị viên" : "Gỡ bởi chủ bài viết"),
            performed_by: user.id
        });
    }
  },

  restoreComment: async (commentId, adminId) => {
    // Sử dụng hàm đã có để lấy thông tin
    const comment = await commentModel.findWithPostOwner(commentId); 
    if (!comment) {
      throw new Error("Bình luận không tồn tại.");
    }
    if (!comment.deleted_at) {
      throw new Error("Bình luận này chưa bị gỡ nên không thể khôi phục.");
    }

    await commentModel.restore(commentId);
    
    await communityService.createLog({
      target_type: 'comment',
      target_id: commentId,
      action: 'khôi phục',
      reason: "Khôi phục bởi quản trị viên",
      performed_by: adminId
    });
  },

  // Remove comment with violation (admin only)
  removeCommentWithViolation: async (commentId, adminId, { reason, ruleIds, resolution, severity }) => {
    const comment = await commentModel.findWithPostOwner(commentId);
    
    if (!comment) {
      throw new Error("Bình luận không tồn tại.");
    }
    
    if (comment.deleted_at) {
      throw new Error("Bình luận này đã bị gỡ trước đó.");
    }

    // Lưu user_id trước khi xóa
    const commentUserId = comment.user_id;

    // Chuẩn bị dữ liệu để xóa mềm
    const dataToRemove = {
      deleted_at: new Date(),
      deleted_by: adminId,
      deleted_reason: reason || "Gỡ bởi quản trị viên",
    };

    // Gọi model để cập nhật
    await commentModel.softDelete(commentId, dataToRemove);

    // Tạo violation record
    const moderationModel = require('../models/moderationModel');
    await moderationModel.createViolationAuto({
      userId: commentUserId,
      targetType: 'comment',
      targetId: commentId,
      severity: severity || 'medium',
      ruleIds: ruleIds || [],
      detectedBy: 'admin',
      resolution: resolution || reason
    });

    // Ghi log
    await communityService.createLog({
      target_type: 'comment',
      target_id: commentId,
      action: 'gỡ',
      reason: reason || "Gỡ bởi quản trị viên",
      performed_by: adminId
    });

    // Trả về comment với user_id
    return {
      id: commentId,
      user_id: commentUserId,
      deleted_at: dataToRemove.deleted_at,
      deleted_by: dataToRemove.deleted_by,
      deleted_reason: dataToRemove.deleted_reason
    };
  },
};

module.exports = commentService;