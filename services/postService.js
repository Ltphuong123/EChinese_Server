// file: services/postService.js

const postModel = require("../models/postModel");
const communityService = require("../services/communityService");
const COMMUNITY_POINTS = require("../config/communityPoints");

const postService = {
  createPost: async (postData, userId) => {
    // Gán user_id từ token để đảm bảo an toàn
    const dataToCreate = { ...postData, user_id: userId };

    // TODO: Có thể thêm logic kiểm duyệt nội dung tự động ở đây
    const newPost = await postModel.create(dataToCreate);

    // 🎁 CỘNG ĐIỂM CHO NGƯỜI TẠO BÀI VIẾT
    try {
      const userModel = require("../models/userModel");
      await userModel.addCommunityPoints(userId, COMMUNITY_POINTS.POST_CREATED);
      console.log(
        `✅ User ${userId} nhận ${COMMUNITY_POINTS.POST_CREATED} điểm cho bài viết mới`
      );
    } catch (error) {
      console.error("❌ Lỗi khi cộng điểm cho bài viết:", error);
      // Không throw để không ảnh hưởng flow chính
    }

    // 📊 CẬP NHẬT TIẾN ĐỘ ACHIEVEMENT
    try {
      const achievementService = require("./achievementService");
      await achievementService.updateProgress(userId, "post_created", 1);
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật achievement post_created:", error);
    }

    return newPost;
  },

  getPublicPosts: async (filters) => {
    const { page = 1, limit = 15 } = filters;
    const offset = (page - 1) * limit;

    // `filters` đã chứa `status`, `topic`, truyền thẳng xuống model
    const { posts, totalItems } = await postModel.findAllPublic({
      ...filters,
      offset,
      limit,
    });

    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: posts,
      meta: {
        total: totalItems,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
      },
    };
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

  // Hàm mới: lấy cả bài đã bị xóa mềm
  getPostById2: async (postId) => {
    const post = await postModel.findById2(postId);
    return post || null;
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

    // Lấy thông tin chủ bài viết
    const postOwnerId = postExists.user_id;

    // Kiểm tra xem người dùng đã like bài viết này chưa
    const existingLike = await postModel.findLike(postId, userId);

    let action;
    if (existingLike) {
      // Nếu đã like -> Xóa like (unlike)
      await postModel.removeLike(postId, userId);
      action = "unliked";

      // 💔 TRỪ ĐIỂM KHI UNLIKE (nếu không phải tự like)
      if (userId !== postOwnerId) {
        try {
          const userModel = require("../models/userModel");
          await userModel.addCommunityPoints(
            postOwnerId,
            -COMMUNITY_POINTS.POST_LIKED
          );
          console.log(
            `➖ User ${postOwnerId} bị trừ ${COMMUNITY_POINTS.POST_LIKED} điểm do unlike`
          );
        } catch (error) {
          console.error("❌ Lỗi khi trừ điểm unlike:", error);
        }
      }
    } else {
      // Nếu chưa like -> Thêm like
      await postModel.addLike(postId, userId);
      action = "liked";

      // 🎁 CỘNG ĐIỂM CHO CHỦ BÀI VIẾT (không cộng nếu tự like)
      if (userId !== postOwnerId) {
        try {
          const userModel = require("../models/userModel");
          await userModel.addCommunityPoints(
            postOwnerId,
            COMMUNITY_POINTS.POST_LIKED
          );
          console.log(
            `✅ User ${postOwnerId} nhận ${COMMUNITY_POINTS.POST_LIKED} điểm từ like`
          );
        } catch (error) {
          console.error("❌ Lỗi khi cộng điểm like:", error);
        }

        // 📊 CẬP NHẬT TIẾN ĐỘ ACHIEVEMENT (tổng số like nhận được)
        try {
          const achievementService = require("./achievementService");
          await achievementService.updateProgress(
            postOwnerId,
            "post_likes_received",
            1
          );
        } catch (error) {
          console.error(
            "❌ Lỗi khi cập nhật achievement post_likes_received:",
            error
          );
        }
      }
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

    const { posts, totalItems } = await postModel.findAllByUserId(
      userId,
      currentUserId,
      { limit, offset }
    );

    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: posts,
      meta: { total: totalItems, page, limit, totalPages },
    };
  },

  // --- HÀM MỚI ---
  // Service cho API getMyInteractedPosts
  getInteractedPosts: async (userId, filters) => {
    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    const { posts, totalItems } = await postModel.findInteractedByUserId(
      userId,
      { limit, offset }
    );

    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: posts,
      meta: { total: totalItems, page, limit, totalPages },
    };
  },

  // Service cho API getMyViewedPosts
  getViewedPosts: async (userId, filters) => {
    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    const { posts, totalItems } = await postModel.findViewedByUserId(userId, {
      limit,
      offset,
    });

    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: posts,
      meta: { total: totalItems, page, limit, totalPages },
    };
  },

  // Service cho API getMyLikedPosts
  getLikedPosts: async (userId, filters) => {
    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    const { posts, totalItems } = await postModel.findLikedByUserId(userId, {
      limit,
      offset,
    });

    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: posts,
      meta: { total: totalItems, page, limit, totalPages },
    };
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
    const isAdmin = user.role === "admin" || user.role === "super admin";
    const isOwner = post.user_id === user.id;

    if (!isAdmin && !isOwner) {
      // Nếu không phải admin và cũng không phải chủ bài viết -> Từ chối
      throw new Error("Bạn không có quyền gỡ bài viết này.");
    }

    // 3. Chuẩn bị dữ liệu để cập nhật (xóa mềm)
    const dataToRemove = {
      deleted_at: new Date(),
      deleted_by: user.id,
      deleted_reason:
        reason || (isAdmin ? "Gỡ bởi quản trị viên" : "Gỡ bởi người dùng"),
      // Khi gỡ, nên đổi status để nó không còn là 'published'
      status: "removed",
    };

    // 4. Gọi model để cập nhật
    await postModel.softDelete(postId, dataToRemove);

    // 💔 TRỪ ĐIỂM NẾU BỊ ADMIN GỠ (vi phạm)
    if (isAdmin && !isOwner) {
      try {
        const userModel = require("../models/userModel");
        await userModel.addCommunityPoints(
          post.user_id,
          COMMUNITY_POINTS.POST_REMOVED
        );
        console.log(
          `➖ User ${post.user_id} bị trừ ${Math.abs(
            COMMUNITY_POINTS.POST_REMOVED
          )} điểm do bài viết bị gỡ`
        );
      } catch (error) {
        console.error("❌ Lỗi khi trừ điểm bài viết bị gỡ:", error);
      }
    }

    // 5. (Tùy chọn) Ghi log hành động của admin
    if (isAdmin && !isOwner) {
      await communityService.createLog({
        target_type: "post",
        target_id: postId,
        action: "gỡ", // 'gỡ' là giá trị enum bạn đã định nghĩa
        reason: reason || "Gỡ bởi quản trị viên",
        performed_by: user.id,
      });
    }
  },

  removePost2: async (postId, user, reason) => {
    // 1. Lấy thông tin bài viết để kiểm tra
    const post = await postModel.findRawById(postId); // Cần 1 hàm lấy dữ liệu thô, không cần join

    if (!post) {
      throw new Error("Bài viết không tồn tại.");
    }

    if (post.deleted_at) {
      throw new Error("Bài viết này đã bị gỡ trước đó.");
    }

    // 3. Chuẩn bị dữ liệu để cập nhật (xóa mềm)
    const dataToRemove = {
      deleted_at: new Date(),
      deleted_by: null,
      deleted_reason: "Gỡ bởi quản AI",
      // Khi gỡ, nên đổi status để nó không còn là 'published'
      status: "removed",
    };

    // 4. Gọi model để cập nhật
    await postModel.softDelete(postId, dataToRemove);

    // await communityService.createLog({
    //   target_type: 'post',
    //   target_id: postId,
    //   action: 'gỡ', // 'gỡ' là giá trị enum bạn đã định nghĩa
    //   reason: reason || "Gỡ bởi quản AI",
    //   performed_by: " AI System "
    // });
  },

  restorePost: async (postId, adminId) => {
    // Thực hiện khôi phục
    await postModel.restore(postId);

    // TODO: Ghi log hành động khôi phục vào ModerationLogs
    // await communityService.createLog({
    //   target_type: 'post',
    //   target_id: postId,
    //   action: 'khôi phục', // 'khôi phục' là giá trị enum bạn đã định nghĩa
    //   reason: "Khôi phục bởi quản trị viên",
    //   performed_by: adminId
    // });
  },

  // Lấy thông tin user đã like/comment/view cho 1 post
  getPostUserInteractions: async (postId, userId) => {
    const isLiked = await postModel.checkUserLiked(postId, userId);
    const isCommented = await postModel.checkUserCommented(postId, userId);
    const isViewed = await postModel.checkUserViewed(postId, userId);
    return { isLiked, isCommented, isViewed };
  },

  // Lấy thông tin user đã like/comment cho nhiều posts
  getPostsUserInteractions: async (postIds, userId) => {
    return await postModel.checkUserInteractionsForPosts(postIds, userId);
  },

  // Update post status (for moderation)
  updatePostStatus: async (postId, statusData) => {
    const { status, deleted_at, deleted_by, deleted_reason } = statusData;

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (deleted_at !== undefined) {
      updateFields.push(`deleted_at = $${paramIndex++}`);
      values.push(deleted_at);
    }
    if (deleted_by !== undefined) {
      updateFields.push(`deleted_by = $${paramIndex++}`);
      values.push(deleted_by);
    }
    if (deleted_reason !== undefined) {
      updateFields.push(`deleted_reason = $${paramIndex++}`);
      values.push(deleted_reason);
    }

    if (updateFields.length === 0) {
      throw new Error("Không có dữ liệu để cập nhật.");
    }

    values.push(postId);
    const query = `
      UPDATE "Posts"
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const db = require("../config/db");
    const result = await db.query(query, values);

    if (result.rowCount === 0) {
      throw new Error("Bài viết không tồn tại.");
    }

    return result.rows[0];
  },

  /**
   * Xóa vĩnh viễn TẤT CẢ bài đăng và dữ liệu liên quan trong hệ thống
   * ⚠️ CỰC KỲ NGUY HIỂM - CHỈ SUPER ADMIN MỚI CÓ QUYỀN
   */
  permanentDeleteAllPosts: async (adminId, confirmationCode) => {
    // Mã xác nhận để tránh xóa nhầm
    const REQUIRED_CODE = "DELETE_ALL_POSTS_PERMANENTLY";

    if (confirmationCode !== REQUIRED_CODE) {
      throw new Error("Mã xác nhận không đúng. Thao tác bị hủy.");
    }

    // Thực hiện xóa
    const stats = await postModel.permanentDeleteAll();

    return stats;
  },
};

module.exports = postService;
