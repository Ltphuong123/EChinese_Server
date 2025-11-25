// file: services/userActivityService.js
// Service xử lý logic lấy hoạt động của user trong cộng đồng

const postModel = require('../models/postModel');
const db = require('../config/db');

/**
 * Helper: Normalize post content cho response
 */
const normalizeContent = (post) => {
  let contentHtml = null, contentText = null, contentImages = [];
  const stripTags = (html) => (html || '').replace(/<[^>]*>/g, '').trim();
  const raw = post.content;
  
  if (raw && typeof raw === 'object') {
    contentHtml = raw.html || raw.content || null;
    contentText = raw.text || stripTags(contentHtml);
    if (Array.isArray(raw.images)) contentImages = raw.images;
    else if (raw.image) contentImages = [raw.image];
  } else if (typeof raw === 'string') {
    contentHtml = raw;
    contentText = stripTags(raw);
  }
  
  return { html: contentHtml, text: contentText, images: contentImages };
};

/**
 * Helper: Map post data cho response FE
 */
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

/**
 * Helper: Map comment data cho response FE
 */
const mapComment = (c) => ({
  id: c.id,
  post_id: c.post_id,
  user_id: c.user_id,
  content: c.content,
  parent_comment_id: c.parent_comment_id || null,
  created_at: c.created_at,
  deleted_at: c.deleted_at || null,
  deleted_by: c.deleted_by || null,
  deleted_reason: c.deleted_reason || null,
  user: c.user || null,
  badge: c.badge || null
});

const userActivityService = {
  /**
   * Lấy bài viết của user (không bao gồm draft và removed)
   */
  getUserPosts: async (userId, options = {}) => {
    const page = parseInt(options.page || 1, 10);
    const limit = parseInt(options.limit || 20, 10);
    const offset = (page - 1) * limit;

    // Sử dụng query riêng để lấy bài viết published của user
    const queryText = `
      SELECT 
        p.*,
        jsonb_build_object(
          'id', u.id,
          'name', u.name,
          'avatar_url', u.avatar_url,
          'badge_level', u.badge_level,
          'role', u.role
        ) as "user",
        jsonb_build_object(
          'level', bl.level,
          'name', bl.name,
          'icon', bl.icon
        ) as badge,
        (SELECT COUNT(*) FROM "Comments" cmt WHERE cmt.post_id = p.id AND cmt.deleted_at IS NULL) as comment_count
      FROM "Posts" p
      JOIN "Users" u ON p.user_id = u.id
      LEFT JOIN "BadgeLevels" bl ON u.badge_level = bl.level
      WHERE p.user_id = $1 
        AND p.status != 'draft' 
        AND p.status != 'removed'
        AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    
    const countQuery = `
      SELECT COUNT(*) FROM "Posts" 
      WHERE user_id = $1 AND status != 'draft' AND status != 'removed' AND deleted_at IS NULL;
    `;

    const [postsResult, countResult] = await Promise.all([
      db.query(queryText, [userId, limit, offset]),
      db.query(countQuery, [userId])
    ]);

    const totalItems = parseInt(countResult.rows[0].count, 10);

    return {
      data: postsResult.rows.map(mapPost),
      meta: {
        page,
        limit,
        total: totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    };
  },

  /**
   * Lấy bài viết user đã thích
   */
  getUserLikedPosts: async (userId, options = {}) => {
    const page = parseInt(options.page || 1, 10);
    const limit = parseInt(options.limit || 20, 10);
    const offset = (page - 1) * limit;

    const { posts, totalItems } = await postModel.findLikedByUserId(userId, { limit, offset });

    return {
      data: posts.map(mapPost),
      meta: {
        page,
        limit,
        total: totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    };
  },

  /**
   * Lấy bài viết user đã bình luận
   */
  getUserCommentedPosts: async (userId, options = {}) => {
    const page = parseInt(options.page || 1, 10);
    const limit = parseInt(options.limit || 20, 10);
    const offset = (page - 1) * limit;

    const { posts, totalItems } = await postModel.findCommentedByUserId(userId, { limit, offset });

    return {
      data: posts.map(mapPost),
      meta: {
        page,
        limit,
        total: totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    };
  },

  /**
   * Lấy bài viết user đã xem
   */
  getUserViewedPosts: async (userId, options = {}) => {
    const page = parseInt(options.page || 1, 10);
    const limit = parseInt(options.limit || 20, 10);
    const offset = (page - 1) * limit;

    const { posts, totalItems } = await postModel.findViewedByUserId(userId, { limit, offset });

    return {
      data: posts.map(mapPost),
      meta: {
        page,
        limit,
        total: totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    };
  },

  /**
   * Lấy bài viết của user đã bị gỡ
   */
  getUserRemovedPosts: async (userId, options = {}) => {
    const page = parseInt(options.page || 1, 10);
    const limit = parseInt(options.limit || 20, 10);
    const offset = (page - 1) * limit;

    const { posts, totalItems } = await postModel.findRemovedByUserId(userId, { limit, offset });

    return {
      data: posts.map(mapPost),
      meta: {
        page,
        limit,
        total: totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    };
  },

  /**
   * Lấy bình luận của user đã bị gỡ
   */
  getUserRemovedComments: async (userId, options = {}) => {
    const page = parseInt(options.page || 1, 10);
    const limit = parseInt(options.limit || 20, 10);
    const offset = (page - 1) * limit;

    const queryText = `
      SELECT 
        c.id,
        c.post_id,
        c.user_id,
        c.content,
        c.parent_comment_id,
        c.created_at,
        c.deleted_at,
        c.deleted_by,
        c.deleted_reason,
        jsonb_build_object(
          'id', u.id,
          'name', u.name,
          'avatar_url', u.avatar_url,
          'badge_level', u.badge_level,
          'role', u.role
        ) as "user",
        jsonb_build_object(
          'level', bl.level,
          'name', bl.name,
          'icon', bl.icon
        ) as badge
      FROM "Comments" c
      JOIN "Users" u ON c.user_id = u.id
      LEFT JOIN "BadgeLevels" bl ON u.badge_level = bl.level
      WHERE c.user_id = $1 AND c.deleted_at IS NOT NULL
      ORDER BY c.deleted_at DESC NULLS LAST, c.created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const countQuery = `
      SELECT COUNT(*) FROM "Comments" 
      WHERE user_id = $1 AND deleted_at IS NOT NULL;
    `;

    const [commentsResult, countResult] = await Promise.all([
      db.query(queryText, [userId, limit, offset]),
      db.query(countQuery, [userId])
    ]);

    const totalItems = parseInt(countResult.rows[0].count, 10);

    return {
      data: commentsResult.rows.map(mapComment),
      meta: {
        page,
        limit,
        total: totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    };
  }
};

module.exports = userActivityService;
