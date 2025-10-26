// file: models/commentModel.js

const db = require('../config/db');

const commentModel = {
  /**
   * Tạo một bình luận mới.
   */
  create: async (commentData) => {
    const { post_id, user_id, content, parent_comment_id } = commentData;
    const queryText = `
      INSERT INTO "Comments" (post_id, user_id, content, parent_comment_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [post_id, user_id, content, parent_comment_id];
    const result = await db.query(queryText, values);
    return result.rows[0];
  },

  /**
   * Lấy tất cả các bình luận của một bài viết.
   */
  findAllByPostId: async (postId) => {
    const queryText = `
      SELECT 
        c.*,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'avatar_url', u.avatar_url
        ) as user,
        json_build_object(
            'level', bl.level,
            'name', bl.name,
            'icon', bl.icon
        ) as badge
      FROM "Comments" c
      JOIN "Users" u ON c.user_id = u.id
      LEFT JOIN "BadgeLevels" bl ON u.badge_level = bl.level
      WHERE c.post_id = $1 AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC;
    `;
    const result = await db.query(queryText, [postId]);
    return result.rows;
  },

  /**
   * Cập nhật nội dung của một bình luận.
   */
  update: async (commentId, userId, content) => {
    const queryText = `
      UPDATE "Comments"
      SET content = $1
      WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL
      RETURNING *;
    `;
    const result = await db.query(queryText, [content, commentId, userId]);
    return result.rows[0];
  },
  
  /**
   * Tìm một bình luận theo ID để kiểm tra quyền.
   */
  findById: async (commentId) => {
      const queryText = `SELECT * FROM "Comments" WHERE id = $1 AND deleted_at IS NULL;`;
      const result = await db.query(queryText, [commentId]);
      return result.rows[0];
  },

  findByIdWithDetails: async (commentId) => {
    const queryText = `
      SELECT 
        c.*,
        json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url) as user,
        json_build_object('level', bl.level, 'name', bl.name, 'icon', bl.icon) as badge
      FROM "Comments" c
      JOIN "Users" u ON c.user_id = u.id
      LEFT JOIN "BadgeLevels" bl ON u.badge_level = bl.level
      WHERE c.id = $1 AND c.deleted_at IS NULL;
    `;
    const result = await db.query(queryText, [commentId]);
    return result.rows[0];
  },

  // softDelete: async (commentId, userId, reason) => {
  //   const query = `
  //     UPDATE "Comments" 
  //     SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1, deleted_reason = $2
  //     WHERE id = $3 AND user_id = $1 AND deleted_at IS NULL;
  //   `;
  //   const result = await db.query(query, [userId, reason, commentId]);
  //   return result.rowCount;
  // },

  // updateDeletionStatus: async (commentId, isDeleted, reason = null, adminId = null) => {
  //   const query = `
  //     UPDATE "Comments"
  //     SET 
  //       deleted_at = CASE WHEN $1 = true THEN COALESCE(deleted_at, CURRENT_TIMESTAMP) ELSE NULL END,
  //       deleted_reason = CASE WHEN $1 = true THEN $2 ELSE NULL END,
  //       deleted_by = CASE WHEN $1 = true THEN $3 ELSE NULL END
  //     WHERE id = $4
  //     RETURNING *;
  //   `;
  //   const result = await db.query(query, [isDeleted, reason, adminId, commentId]);
  //   return result.rows[0];
  // },

  
};

module.exports = commentModel;