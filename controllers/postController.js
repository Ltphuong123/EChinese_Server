// file: controllers/postController.js

const postService = require("../services/postService");
const moderationModel = require("../models/moderationModel");
const communityService = require("../services/communityService");

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

      // Tạo bài viết (lưu thô xuống DB)
      const newPost = await postService.createPost(postData, userId);

      // Tự động kiểm duyệt bằng AI (chạy async, không chờ)
      const autoModerationService = require("../services/autoModerationService");
      autoModerationService
        .moderatePost(newPost.id, {
          ...postData,
          user_id: userId,
        })
        .then((result) => {
          if (result.removed) {
            console.log(`Post ${newPost.id} auto-removed:`, result.reason);
          }
        })
        .catch((error) => {
          console.error("Auto moderation error:", error);
        });

      // Chuẩn hóa content theo cấu trúc yêu cầu { html, text, images }
      let contentHtml = null,
        contentText = null,
        contentImages = [];
      const rawContent = postData.content; // dùng dữ liệu gửi lên để bảo toàn html/text/images
      const stripTags = (html) => (html || "").replace(/<[^>]*>/g, "").trim();
      if (rawContent && typeof rawContent === "object") {
        contentHtml = rawContent.html || rawContent.content || null;
        contentText = rawContent.text || stripTags(contentHtml);
        if (Array.isArray(rawContent.images)) contentImages = rawContent.images;
      } else if (typeof rawContent === "string") {
        contentHtml = rawContent;
        contentText = stripTags(rawContent);
      }

      const response = {
        id: newPost.id,
        user_id: newPost.user_id,
        title: newPost.title,
        topic: newPost.topic,
        content: {
          html: contentHtml,
          text: contentText,
          images: contentImages,
        },
        is_pinned: newPost.is_pinned,
        status: newPost.status,
        is_approved: newPost.is_approved,
        auto_flagged: newPost.auto_flagged,
        created_at: newPost.created_at,
        likes: newPost.likes || 0,
        views: newPost.views || 0,
      };

      return res.status(201).json({
        success: true,
        message: "Tạo bài viết thành công.",
        data: response,
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

      // Lấy thông tin user đã like/comment cho các posts
      const postIds = result.data.map((post) => post.id);
      const userInteractions = await postService.getPostsUserInteractions(
        postIds,
        req.user.id
      );

      // Transform posts to required shape
      const transformed = (result.data || []).map((post) => {
        const interaction = userInteractions.find(
          (i) => i.postId === post.id
        ) || { isLiked: false, isCommented: false };

        // Build content object
        let contentHtml = null,
          contentText = null,
          contentImages = [];
        const rawContent = post.content;
        const stripTags = (html) => (html || "").replace(/<[^>]*>/g, "").trim();
        if (rawContent && typeof rawContent === "object") {
          contentHtml = rawContent.html || rawContent.content || null;
          contentText = rawContent.text || stripTags(contentHtml);
          if (Array.isArray(rawContent.images))
            contentImages = rawContent.images;
          else if (rawContent.image) contentImages = [rawContent.image];
        } else if (typeof rawContent === "string") {
          contentHtml = rawContent;
          contentText = stripTags(rawContent);
        }
        return {
          id: post.id,
          user_id: post.user_id,
          title: post.title,
          content: {
            html: contentHtml,
            text: contentText,
            images: contentImages,
          },
          topic: post.topic,
          likes: post.likes || 0,
          views: post.views || 0,
          created_at: post.created_at,
          status: post.status,
          is_pinned: post.is_pinned,
          is_approved: post.is_approved,
          auto_flagged: post.auto_flagged,
          user: post.user || null,
          badge: post.badge || null,
          comment_count: post.comment_count || 0,
          isLiked: interaction.isLiked,
          isCommented: interaction.isCommented,
        };
      });
      res.status(200).json({ data: transformed, meta: result.meta });
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
      if (!post) {
        return res
          .status(404)
          .json({ success: false, message: "Bài viết không tồn tại." });
      }

      // Lấy thông tin user đã like/comment cho post này
      const userInteraction = await postService.getPostUserInteractions(
        postId,
        req.user.id
      );

      // Transform content similar to list endpoint
      let contentHtml = null,
        contentText = null,
        contentImages = [];
      const rawContent = post.content;
      const stripTags = (html) => (html || "").replace(/<[^>]*>/g, "").trim();
      if (rawContent && typeof rawContent === "object") {
        contentHtml = rawContent.html || rawContent.content || null;
        contentText = rawContent.text || stripTags(contentHtml);
        if (Array.isArray(rawContent.images)) contentImages = rawContent.images;
        else if (rawContent.image) contentImages = [rawContent.image];
      } else if (typeof rawContent === "string") {
        contentHtml = rawContent;
        contentText = stripTags(rawContent);
      }

      const response = {
        id: post.id,
        user_id: post.user_id,
        title: post.title,
        content: {
          html: contentHtml,
          text: contentText,
          images: contentImages,
        },
        topic: post.topic,
        likes: post.likes || 0,
        views: post.views || 0,
        created_at: post.created_at,
        status: post.status,
        is_pinned: post.is_pinned,
        is_approved: post.is_approved,
        auto_flagged: post.auto_flagged,
        user: post.user || null,
        badge: post.badge || null,
        comment_count: post.comment_count || 0,
        isLiked: userInteraction.isLiked,
        isCommented: userInteraction.isCommented,
      };
      return res.status(200).json(response);
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
      // Lấy lại bản ghi đầy đủ để trả về đúng cấu trúc yêu cầu
      const freshPost = await postService.getPostById(postId);

      // Lấy thông tin user đã like/comment
      const userInteraction = await postService.getPostUserInteractions(
        postId,
        userId
      );

      // Chuẩn hóa content giống các endpoint khác
      let contentHtml = null,
        contentText = null,
        contentImages = [];
      const rawContent = freshPost.content;
      const stripTags = (html) => (html || "").replace(/<[^>]*>/g, "").trim();
      if (rawContent && typeof rawContent === "object") {
        contentHtml = rawContent.html || rawContent.content || null;
        contentText = rawContent.text || stripTags(contentHtml);
        if (Array.isArray(rawContent.images)) contentImages = rawContent.images;
        else if (rawContent.image) contentImages = [rawContent.image];
      } else if (typeof rawContent === "string") {
        contentHtml = rawContent;
        contentText = stripTags(rawContent);
      }

      const response = {
        id: freshPost.id,
        user_id: freshPost.user_id,
        title: freshPost.title,
        content: {
          html: contentHtml,
          text: contentText,
          images: contentImages,
        },
        topic: freshPost.topic,
        likes: freshPost.likes || 0,
        views: freshPost.views || 0,
        created_at: freshPost.created_at,
        status: freshPost.status,
        is_pinned: freshPost.is_pinned,
        is_approved: freshPost.is_approved,
        auto_flagged: freshPost.auto_flagged,
        user: freshPost.user || null,
        badge: freshPost.badge || null,
        comment_count: freshPost.comment_count || 0,
        isLiked: userInteraction.isLiked,
        isCommented: userInteraction.isCommented,
      };

      return res.status(200).json({
        success: true,
        message: "Cập nhật bài viết thành công.",
        data: response,
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

  moderatePost2: async (req, res) => {
    try {
      const { postId } = req.params;
      const payload = req.body || {};
      const action = payload.action;

      // Lấy lại bài viết (bao gồm cả đã xóa)
      const existing = await postService.getPostById2(postId);
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Bài viết không tồn tại." });
      }

      if (action === "remove") {
        // Lấy lý do gỡ từ post_update hoặc violation
        const reason =
          (payload.post_update && payload.post_update.deleted_reason) ||
          (payload.violation && payload.violation.reason) ||
          "Gỡ bởi quản trị viên";
        await postService.removePost2(postId, {}, reason);

        // Tạo vi phạm cho người đăng bài (dùng violation object từ payload nếu có)
        let userIdToNotify = existing.user_id;
        if (payload.violation) {
          const violationInput = {
            userId: payload.violation.user_id || existing.user_id,
            targetType: payload.violation.target_type || "post",
            targetId: payload.violation.target_id || postId,
            severity: payload.violation.severity || "medium",
            ruleIds: payload.violation.ruleIds || [],
            detectedBy: "admin",
            resolution: payload.violation.resolution || reason,
          };
          await require("../models/moderationModel").createViolationAuto(
            violationInput
          );
          userIdToNotify = violationInput.userId;
        } else {
          // Fallback: create basic violation
          const violationInput = {
            userId: existing.user_id,
            targetType: "post",
            targetId: postId,
            severity: "medium",
            ruleIds: [],
            detectedBy: "admin",
            resolution: reason,
          };
          await require("../models/moderationModel").createViolationAuto(
            violationInput
          );
          userIdToNotify = violationInput.userId;
        }

        // Gửi thông báo tới user_id từ violation
        await require("../models/notificationModel").create({
          recipient_id: userIdToNotify,
          audience: "user",
          type: "violation",
          title: "Bài viết của bạn đã bị gỡ",
          content: JSON.stringify({ html: reason }),
        });
      } else if (action === "restore") {
        await postService.restorePost(postId);
      } else {
        return res.status(400).json({
          success: false,
          message: "action không hợp lệ. Chỉ hỗ trợ remove hoặc restore.",
        });
      }

      // Lấy lại bài viết sau thay đổi
      const fresh = await postService.getPostById(postId);

      // Chuẩn hóa content
      let contentHtml = null,
        contentText = null,
        contentImages = [];
      const rawContent = fresh.content;
      const stripTags = (html) => (html || "").replace(/<[^>]*>/g, "").trim();
      if (rawContent && typeof rawContent === "object") {
        contentHtml = rawContent.html || rawContent.content || null;
        contentText = rawContent.text || stripTags(contentHtml);
        if (Array.isArray(rawContent.images)) contentImages = rawContent.images;
        else if (rawContent.image) contentImages = [rawContent.image];
      } else if (typeof rawContent === "string") {
        contentHtml = rawContent;
        contentText = stripTags(rawContent);
      }

      const response = {
        id: fresh.id,
        user_id: fresh.user_id,
        title: fresh.title,
        content: {
          html: contentHtml,
          text: contentText,
          images: contentImages,
        },
        topic: fresh.topic,
        likes: fresh.likes || 0,
        views: fresh.views || 0,
        created_at: fresh.created_at,
        status: fresh.status,
        is_pinned: fresh.is_pinned,
        is_approved: fresh.is_approved,
        auto_flagged: fresh.auto_flagged,
        deleted_at: fresh.deleted_at || null,
        deleted_by: fresh.deleted_by || null,
        deleted_reason: fresh.deleted_reason || null,
        user: fresh.user || null,
        badge: fresh.badge || null,
        comment_count: fresh.comment_count || 0,
      };

      return res.status(200).json(response);
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      return res.status(500).json({
        success: false,
        message: "Lỗi moderation",
        error: error.message,
      });
    }
  },

  // --- Moderation (admin) ---
  moderatePost: async (req, res) => {
    try {
      const { postId } = req.params;
      const adminId = req.user.id;
      const payload = req.body || {};
      const action = payload.action;

      if (!action || !["remove", "restore"].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "action không hợp lệ. Chỉ hỗ trợ remove hoặc restore.",
        });
      }

      // Lấy lại bài viết (bao gồm cả đã xóa)

      const existing = await postService.getPostById2(postId);
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Bài viết không tồn tại." });
      }

      if (action === "remove") {
        // Validate required fields for remove action
        if (!payload.post_update) {
          return res.status(400).json({
            success: false,
            message: "Thiếu thông tin post_update.",
          });
        }

        const { post_update, violation } = payload;
        const deletedBy = post_update.deleted_by || adminId;
        const isSelfRemove = deletedBy === existing.user_id;

        // Cập nhật bài viết với thông tin từ post_update
        await postService.updatePostStatus(postId, {
          status: post_update.status || "removed",
          deleted_at: post_update.deleted_at || new Date(),
          deleted_by: deletedBy,
          deleted_reason:
            post_update.deleted_reason ||
            (violation ? violation.reason : "Tự gỡ"),
        });

        // Chỉ tạo violation và notification nếu KHÔNG phải người dùng tự gỡ
        if (!isSelfRemove && violation) {
          // Tạo vi phạm cho người đăng bài
          const violationInput = {
            userId: violation.user_id || existing.user_id,
            targetType: violation.target_type || "post",
            targetId: violation.target_id || postId,
            severity: violation.severity || "medium",
            ruleIds: violation.ruleIds || [],
            detectedBy: "admin",
            resolution: violation.resolution || violation.reason,
          };
          await require("../models/moderationModel").createViolationAuto(
            violationInput
          );

          // Gửi thông báo tới người dùng
          await require("../models/notificationModel").create({
            recipient_id: violationInput.userId,
            audience: "user",
            type: "community",
            title: "Bài viết của bạn đã bị gỡ",
            content: JSON.stringify({ html: violation.reason }),
          });
        }
      } else if (action === "restore") {
        // Validate required fields for restore action
        if (!payload.post_update) {
          return res.status(400).json({
            success: false,
            message: "Thiếu thông tin post_update.",
          });
        }

        const { post_update } = payload;

        // Khôi phục bài viết
        await postService.updatePostStatus(postId, {
          status: post_update.status || "published",
          deleted_at: null,
          deleted_by: null,
          deleted_reason: null,
        });

        // Gửi thông báo tới người dùng
        await require("../models/notificationModel").create({
          recipient_id: existing.user_id,
          audience: "user",
          type: "community",
          title: "Bài viết của bạn đã được khôi phục",
          content: JSON.stringify({
            html: "Bài viết của bạn đã được xem xét lại và khôi phục.",
          }),
        });
      }

      // Lấy lại bài viết sau thay đổi
      const fresh = await postService.getPostById(postId);

      // Lấy thông tin user đã like/comment
      const userInteraction = await postService.getPostUserInteractions(
        postId,
        adminId
      );

      // Chuẩn hóa content
      let contentHtml = null,
        contentText = null,
        contentImages = [];
      const rawContent = fresh.content;
      const stripTags = (html) => (html || "").replace(/<[^>]*>/g, "").trim();
      if (rawContent && typeof rawContent === "object") {
        contentHtml = rawContent.html || rawContent.content || null;
        contentText = rawContent.text || stripTags(contentHtml);
        if (Array.isArray(rawContent.images)) contentImages = rawContent.images;
        else if (rawContent.image) contentImages = [rawContent.image];
      } else if (typeof rawContent === "string") {
        contentHtml = rawContent;
        contentText = stripTags(rawContent);
      }

      const response = {
        id: fresh.id,
        user_id: fresh.user_id,
        title: fresh.title,
        content: {
          html: contentHtml,
          text: contentText,
          images: contentImages,
        },
        topic: fresh.topic,
        likes: fresh.likes || 0,
        views: fresh.views || 0,
        created_at: fresh.created_at,
        status: fresh.status,
        is_pinned: fresh.is_pinned,
        is_approved: fresh.is_approved,
        auto_flagged: fresh.auto_flagged,
        deleted_at: fresh.deleted_at || null,
        deleted_by: fresh.deleted_by || null,
        deleted_reason: fresh.deleted_reason || null,
        user: fresh.user || null,
        badge: fresh.badge || null,
        comment_count: fresh.comment_count || 0,
        isLiked: userInteraction.isLiked,
        isCommented: userInteraction.isCommented,
      };

      return res.status(200).json(response);
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      return res.status(500).json({
        success: false,
        message: "Lỗi moderation",
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
        role: req.user.role,
      };

      await postService.removePost(postId, user, reason);

      res
        .status(200)
        .json({ success: true, message: "Gỡ bài viết thành công." });
    } catch (error) {
      if (
        error.message.includes("không tồn tại") ||
        error.message.includes("không có quyền")
      ) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes("đã bị gỡ")) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi gỡ bài viết",
        error: error.message,
      });
    }
  },

  restorePost: async (req, res) => {
    try {
      const { postId } = req.params;
      const adminId = req.user.id; // Lấy ID admin từ token

      await postService.restorePost(postId, adminId);

      res
        .status(200)
        .json({ success: true, message: "Khôi phục bài viết thành công." });
    } catch (error) {
      if (
        error.message.includes("không tồn tại") ||
        error.message.includes("chưa bị gỡ")
      ) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi khôi phục bài viết",
        error: error.message,
      });
    }
  },
};

module.exports = postController;
