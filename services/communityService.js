// file: services/communityService.js

const communityModel = require('../models/communityModel');
const postModel = require('../models/postModel');
const moderationModel = require('../models/moderationModel');
const commentModel = require('../models/commentModel');

const communityService = {
  getStats: async () => {
    return await communityModel.getDashboardStats();
  },
  getModerationLogs: async (options) => {
      const { page, limit } = options;
      const offset = (page - 1) * limit;

      const { logs, totalItems } = await communityModel.findModerationLogs({ limit, offset });
      
      const totalPages = Math.ceil(totalItems / limit);

      return {
          data: logs,
          meta: { page, limit, total: totalItems, totalPages }
      };
  },

  getUserActivity: async (userId, options = {}) => {
    const page = parseInt(options.page || 1, 10);
    const limit = parseInt(options.limit || 20, 10);
    const offset = (page - 1) * limit;

    // Posts authored (including removed)
    const { posts: authoredPosts } = await postModel.findAllByUserIdIncludingRemoved(userId, { limit, offset });

    // Liked posts
    const { posts: likedPosts } = await postModel.findLikedByUserId(userId, { limit, offset });

    // Commented posts
    const { posts: commentedPosts } = await postModel.findCommentedByUserId(userId, { limit, offset });

    // Viewed posts
    const { posts: viewedPosts } = await postModel.findViewedByUserId(userId, { limit, offset });

    // Removed posts authored
    const { posts: removedPosts } = await postModel.findRemovedByUserId(userId, { limit, offset });

    // Removed comments by user (basic fields)
    const removedCommentsQuery = `
      SELECT 
        c.id,
        c.post_id,
        c.user_id,
        c.content,
        c.parent_comment_id,
        c.created_at,
        c.deleted_at,
        c.deleted_by,
        c.deleted_reason
      FROM "Comments" c
      WHERE c.user_id = $1 AND c.deleted_at IS NOT NULL
      ORDER BY c.deleted_at DESC NULLS LAST, c.created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const removedCommentsResult = await require('../config/db').query(removedCommentsQuery, [userId, limit, offset]);
    const removedComments = removedCommentsResult.rows;

    // Violations for this user (enriched)
    const violations = await moderationModel.findViolationsByUserDetailed(userId);

    // Moderation logs for user's content
    const { logs: moderationLogs } = await communityModel.findModerationLogsByUserContent(userId, { limit, offset });

    return {
      posts: authoredPosts,
      likedPosts,
      commentedPosts,
      viewedPosts,
      removedPosts,
      removedComments,
      violations,
      moderationLogs,
    };
  },

  createLog: async (logData) => {
    // Service có thể thêm các bước validation ở đây nếu cần.
    // Ví dụ: kiểm tra xem target_type có hợp lệ không.
    if (!['post', 'comment'].includes(logData.target_type)) {
      throw new Error(`Loại mục tiêu không hợp lệ: ${logData.target_type}`);
    }

    return await communityModel.createModerationLog(logData);
  },

};

module.exports = communityService;