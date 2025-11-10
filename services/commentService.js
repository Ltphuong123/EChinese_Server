// file: services/commentService.js

const commentModel = require('../models/commentModel');
const postModel = require('../models/postModel'); // Để kiểm tra bài viết có tồn tại không

const commentService = {
  createComment: async (postId, userId, content, parentCommentId) => {
    // Kiểm tra xem bài viết có tồn tại không
    const postExists = await postModel.findById(postId);
    if (!postExists) {
      throw new Error('Bài viết không tồn tại.');
    }
    
    // Đóng gói content vào object JSON
    const contentObject = { html: content }; // Giả sử content là chuỗi HTML

    return await commentModel.create({
      post_id: postId,
      user_id: userId,
      content: contentObject,
      parent_comment_id: parentCommentId
    });
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

  // softDeleteComment: async (commentId, userId) => {
  //   const deletedCount = await commentModel.softDelete(commentId, userId, 'Người dùng tự xóa');
  //   if (deletedCount === 0) {
  //     throw new Error('Bình luận không tồn tại hoặc bạn không có quyền xóa.');
  //   }
  // },

  // removeComment: async (commentId, reason, adminId) => {
  //   const comment = await commentModel.updateDeletionStatus(commentId, true, reason, adminId);
  //   if (!comment) throw new Error('Bình luận không tồn tại.');
  //   await postModel.logModeration(comment.id, 'comment', 'gỡ', reason, adminId);
  //   return comment;
  // },

  // restoreComment: async (commentId, adminId) => {
  //   const comment = await commentModel.updateDeletionStatus(commentId, false);
  //   if (!comment) throw new Error('Bình luận không tồn tại.');
  //   await postModel.logModeration(comment.id, 'comment', 'khôi phục', 'Khôi phục bởi quản trị viên', adminId);
  //   return comment;
  // },
  
};

module.exports = commentService;