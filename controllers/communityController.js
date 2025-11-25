// // file: controllers/communityController.js

// const communityService = require('../services/communityService');

// const communityController = {
//   getCommunityStats: async (req, res) => {
//     try {
//       const stats = await communityService.getStats();
//       res.status(200).json({
//         success: true,
//         data: stats
//       });
//     } catch (error) {
//       res.status(500).json({ success: false, message: 'Lỗi khi lấy thống kê cộng đồng', error: error.message });
//     }
//   },
//   getModerationLogs: async (req, res) => {
//     try {
//         const { page = 1, limit = 2000 } = req.query;
//         const result = await communityService.getModerationLogs({
//             page: parseInt(page, 10),
//             limit: parseInt(limit, 10)
//         });

//       res.status(200).json({
//         success: true,
//         data: result.data,
//       });
//     } catch (error) {
//       res.status(500).json({ success: false, message: 'Lỗi khi lấy nhật ký kiểm duyệt', error: error.message });
//     }
//   },
//   getUserActivity: async (req, res) => {
//     try {
//       const { userId } = req.params;
//       const { page = 1, limit = 20 } = req.query;

//       const data = await communityService.getUserActivity(userId, { page, limit });

//       const normalizeContent = (post) => {
//         let contentHtml = null, contentText = null, contentImages = [];
//         const stripTags = (html) => (html || '').replace(/<[^>]*>/g, '').trim();
//         const raw = post.content;
//         if (raw && typeof raw === 'object') {
//           contentHtml = raw.html || raw.content || null;
//           contentText = raw.text || stripTags(contentHtml);
//           if (Array.isArray(raw.images)) contentImages = raw.images; else if (raw.image) contentImages = [raw.image];
//         } else if (typeof raw === 'string') {
//           contentHtml = raw;
//           contentText = stripTags(raw);
//         }
//         return { html: contentHtml, text: contentText, images: contentImages };
//       };

//       const mapPost = (p) => ({
//         id: p.id,
//         user_id: p.user_id,
//         title: p.title,
//         content: normalizeContent(p),
//         topic: p.topic,
//         likes: p.likes || 0,
//         views: p.views || 0,
//         created_at: p.created_at,
//         status: p.status,
//         is_pinned: p.is_pinned,
//         is_approved: p.is_approved,
//         auto_flagged: p.auto_flagged,
//         deleted_at: p.deleted_at || null,
//         deleted_by: p.deleted_by || null,
//         deleted_reason: p.deleted_reason || null,
//         user: p.user || null,
//         badge: p.badge || null,
//         comment_count: p.comment_count || 0
//       });

//       const response = {
//         posts: (data.posts || []).map(mapPost),
//         likedPosts: (data.likedPosts || []).map(mapPost),
//         commentedPosts: (data.commentedPosts || []).map(mapPost),
//         viewedPosts: (data.viewedPosts || []).map(mapPost),
//         removedPosts: (data.removedPosts || []).map(mapPost),
//         removedComments: data.removedComments || [],
//         violations: (data.violations || []).map(v => ({
//           id: v.id,
//           user_id: v.user_id,
//           target_type: v.target_type,
//           target_id: v.target_id,
//           severity: v.severity,
//           detected_by: v.detected_by,
//           handled: v.handled,
//           created_at: v.created_at,
//           resolved_at: v.resolved_at,
//           resolution: v.resolution,
//           user: v.user || null,
//           targetContent: v.targetContent || null,
//           rules: v.rules || []
//         })),
//         moderationLogs: data.moderationLogs || []
//       };

//       res.status(200).json(response);
//     } catch (error) {
//       res.status(500).json({ success: false, message: 'Lỗi khi lấy hoạt động người dùng', error: error.message });
//     }
//   },

// };

// module.exports = communityController;


// file: controllers/communityController.js

const communityService = require('../services/communityService');

const communityController = {
  getCommunityStats: async (req, res) => {
    try {
      const stats = await communityService.getStats();
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy thống kê cộng đồng', error: error.message });
    }
  },
  getModerationLogs: async (req, res) => {
    try {
        const { page = 1, limit = 2000 } = req.query;
        const result = await communityService.getModerationLogs({
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        });

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy nhật ký kiểm duyệt', error: error.message });
    }
  },
  getUserActivity: async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const data = await communityService.getUserActivity(userId, { page, limit });

      const normalizeContent = (post) => {
        let contentHtml = null, contentText = null, contentImages = [];
        const stripTags = (html) => (html || '').replace(/<[^>]*>/g, '').trim();
        const raw = post.content;
        if (raw && typeof raw === 'object') {
          contentHtml = raw.html || raw.content || null;
          contentText = raw.text || stripTags(contentHtml);
          if (Array.isArray(raw.images)) contentImages = raw.images; else if (raw.image) contentImages = [raw.image];
        } else if (typeof raw === 'string') {
          contentHtml = raw;
          contentText = stripTags(raw);
        }
        return { html: contentHtml, text: contentText, images: contentImages };
      };

      const mapPost = (p) => ({
        id: p.id,
        user_id: p.user_id,
        title: p.title,
        content: normalizeContent(p),
        topic: p.topic,
        likes: p.likes || 0,
        views: p.views || 0,
        created_at: p.created_at,
        status: p.status,
        is_pinned: p.is_pinned,
        is_approved: p.is_approved,
        auto_flagged: p.auto_flagged,
        deleted_at: p.deleted_at || null,
        deleted_by: p.deleted_by || null,
        deleted_reason: p.deleted_reason || null,
        user: p.user || null,
        badge: p.badge || null,
        comment_count: p.comment_count || 0
      });

      const responseData = {
        posts: (data.posts || []).map(mapPost),
        likedPosts: (data.likedPosts || []).map(mapPost),
        commentedPosts: (data.commentedPosts || []).map(mapPost),
        viewedPosts: (data.viewedPosts || []).map(mapPost),
        removedPosts: (data.removedPosts || []).map(mapPost),
        removedComments: data.removedComments || [],
        violations: (data.violations || []).map(v => ({
          id: v.id,
          user_id: v.user_id,
          target_type: v.target_type,
          target_id: v.target_id,
          severity: v.severity,
          detected_by: v.detected_by,
          handled: v.handled,
          created_at: v.created_at,
          resolved_at: v.resolved_at,
          resolution: v.resolution,
          user: v.user || null,
          targetContent: v.targetContent || null,
          rules: v.rules || []
        })),
        moderationLogs: data.moderationLogs || []
      };

      res.status(200).json({
        success: true,
        data: responseData
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy hoạt động người dùng', error: error.message });
    }
  },

};

module.exports = communityController;