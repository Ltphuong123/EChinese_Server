// file: services/postService.js

const postModel = require("../models/postModel");
const communityService = require('../services/communityService');


const postService = {
  createPost: async (postData, userId) => {
    // Gán user_id từ token để đảm bảo an toàn
    const dataToCreate = { ...postData, user_id: userId };
    
    
    // TODO: Có thể thêm logic kiểm duyệt nội dung tự động ở đây
    return await postModel.create(dataToCreate);
  },

  getPublicPosts: async (filters) => {
    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    // `filters` đã chứa `status`, truyền thẳng xuống là được
    const { posts, totalItems } = await postModel.findAllPublic({ ...filters, offset });
    
    const totalPages = Math.ceil(totalItems / limit);
    return { data: posts, meta: { total: totalItems, page, limit, totalPages } };
  },


  getPostById: async (postId) => {
    // Tăng lượt xem khi có người xem bài viết
    // TODO: Nên có logic để tránh tăng view cho cùng 1 user trong 1 khoảng thời gian ngắn
    // await postModel.incrementViews(postId);
    const post = await postModel.findById(postId);
    if (!post) {
      throw new Error("Bài viết không tồn tại hoặc đã bị xóa.");
    }
    return post;
  },

  updatePost: async (postId, userId, updateData) => {
    // Chỉ cho phép cập nhật các trường nhất định
    const allowedUpdates = ["title", "content", "topic"];
    const safeUpdateData = {};
    for (const key of allowedUpdates) {
      if (updateData[key] !== undefined) {
        safeUpdateData[key] = updateData[key];
      }
    }

    if (Object.keys(safeUpdateData).length === 0) {
      throw new Error("Không có dữ liệu hợp lệ để cập nhật.");
    }

    const updatedPost = await postModel.update(postId, userId, safeUpdateData);
    if (!updatedPost) {
      throw new Error(
        "Cập nhật thất bại. Bài viết không tồn tại hoặc bạn không có quyền chỉnh sửa."
      );
    }
    return updatedPost;
  },

  toggleLike: async (postId, userId) => {
    // Kiểm tra xem bài viết có tồn tại không
    const postExists = await postModel.findById(postId);
    if (!postExists) {
      throw new Error("Bài viết không tồn tại.");
    }

    // Kiểm tra xem người dùng đã like bài viết này chưa
    const existingLike = await postModel.findLike(postId, userId);

    let action;
    if (existingLike) {
      // Nếu đã like -> Xóa like (unlike)
      await postModel.removeLike(postId, userId);
      action = "unliked";
    } else {
      // Nếu chưa like -> Thêm like
      await postModel.addLike(postId, userId);
      action = "liked";
    }

    // Cập nhật lại số lượng like trong bảng Posts
    const newLikesCount = await postModel.updateLikesCount(postId);

    return { action, likes: newLikesCount };
  },

  getPostViews: async (postId, filters = { page: 1, limit: 10 }) => {
    const post = await postModel.findById(postId);
    if (!post) {
      throw new Error("Bài viết không tồn tại.");
    }
    const { page, limit } = filters;
    const offset = (page - 1) * limit;
    const { viewer, totalItems } = await postModel.getPostViews(
      postId,
      filters,
      offset
    );
    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: viewer,
      meta: { total: totalItems, page, limit, totalPages },
    };
  },

  getPostLikes: async (postId, filters = { page: 1, limit: 10 }) => {
    const post = await postModel.findById(postId);
    if (!post) {
      throw new Error("Bài viết không tồn tại.");
    }
    const { page, limit } = filters;
    const offset = (page - 1) * limit;
    const { likers, totalItems } = await postModel.getPostLikes(
      postId,
      filters,
      offset
    );
    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: likers,
      meta: { total: totalItems, page, limit, totalPages },
    };
  },

  recordView: async (postId, userId) => {
    // Service có thể thêm logic để ngăn chặn spam view ở đây.
    // Ví dụ: chỉ cho phép ghi nhận view từ cùng một userId/IP sau một khoảng thời gian nhất định.
    // (Để đơn giản, ví dụ này bỏ qua logic đó)

    // Ghi nhận vào bảng lịch sử xem
    await postModel.addViewRecord(postId, userId);

    // Cập nhật lại số lượng view trong bảng Posts
    const newViewsCount = await postModel.updateViewsCount(postId);

    return newViewsCount;
  },

  // softDeletePost: async (postId, userId) => {
  //   // Gọi model với `userId` để đảm bảo chỉ chủ sở hữu mới xóa được
  //   const deletedCount = await postModel.softDelete(
  //     postId,
  //     userId,
  //     "Người dùng tự xóa"
  //   );
  //   if (deletedCount === 0) {
  //     throw new Error("Bài viết không tồn tại hoặc bạn không có quyền xóa.");
  //   }
  // },

  getUserPosts: async (userId, currentUserId, filters) => {
    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    const { posts, totalItems } = await postModel.findAllByUserId(userId, currentUserId, { limit, offset });
    
    const totalPages = Math.ceil(totalItems / limit);
    return { data: posts, meta: { total: totalItems, page, limit, totalPages } };
  },

  // --- HÀM MỚI ---
  // Service cho API getMyInteractedPosts
  getInteractedPosts: async (userId, filters) => {
    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    const { posts, totalItems } = await postModel.findInteractedByUserId(userId, { limit, offset });
    
    const totalPages = Math.ceil(totalItems / limit);
    return { data: posts, meta: { total: totalItems, page, limit, totalPages } };
  },


  removePost: async (postId, user, reason) => {
    // 1. Lấy thông tin bài viết để kiểm tra
    const post = await postModel.findRawById(postId); // Cần 1 hàm lấy dữ liệu thô, không cần join
    
    if (!post) {
      throw new Error("Bài viết không tồn tại.");
    }

    if (post.deleted_at) {
        throw new Error("Bài viết này đã bị gỡ trước đó.");
    }

    // 2. Logic phân quyền
    const isAdmin = user.role === 'admin' || user.role === 'super admin';
    const isOwner = post.user_id === user.id;

    if (!isAdmin && !isOwner) {
      // Nếu không phải admin và cũng không phải chủ bài viết -> Từ chối
      throw new Error("Bạn không có quyền gỡ bài viết này.");
    }
    
    // 3. Chuẩn bị dữ liệu để cập nhật (xóa mềm)
    const dataToRemove = {
      deleted_at: new Date(),
      deleted_by: user.id,
      deleted_reason: reason || (isAdmin ? "Gỡ bởi quản trị viên" : "Gỡ bởi người dùng"),
      // Khi gỡ, nên đổi status để nó không còn là 'published'
      status: 'removed' 
    };

    // 4. Gọi model để cập nhật
    await postModel.softDelete(postId, dataToRemove);
    
    // 5. (Tùy chọn) Ghi log hành động của admin
    if (isAdmin && !isOwner) {
      await communityService.createLog({
        target_type: 'post',
        target_id: postId,
        action: 'gỡ', // 'gỡ' là giá trị enum bạn đã định nghĩa
        reason: reason || "Gỡ bởi quản trị viên",
        performed_by: user.id
      });
    }
  },


  restorePost: async (postId, adminId) => {
    const post = await postModel.findRawById(postId);
    if (!post) {
      throw new Error("Bài viết không tồn tại.");
    }
    if (!post.deleted_at) {
      throw new Error("Bài viết này chưa bị gỡ nên không thể khôi phục.");
    }

    // Thực hiện khôi phục
    await postModel.restore(postId);

    // TODO: Ghi log hành động khôi phục vào ModerationLogs
    await communityService.createLog({
      target_type: 'post',
      target_id: postId,
      action: 'khôi phục', // 'khôi phục' là giá trị enum bạn đã định nghĩa
      reason: "Khôi phục bởi quản trị viên",
      performed_by: adminId
    });

  },






};

module.exports = postService;
