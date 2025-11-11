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
        c.id,
        c.post_id,
        c.user_id,
        
        -- Xây dựng lại object content với key là 'text'
        jsonb_build_object(
          'text', c.content->>'html' -- Lấy giá trị của key 'html' và gán cho key mới 'text'
        ) as content,
        
        c.parent_comment_id,
        c.created_at,
        c.deleted_at,
        c.deleted_by,
        c.deleted_reason,
        
        -- Xây dựng object 'user'
        jsonb_build_object(
          'id', u.id,
          'name', u.name,
          'avatar_url', u.avatar_url,
          'level', u.level,
          'badge_level', u.badge_level,
          'community_points', u.community_points
        ) as user,
        
        -- Xây dựng object 'badge'
        jsonb_build_object(
            'level', bl.level,
            'name', bl.name,
            'icon', bl.icon,
            'min_points', bl.min_points,
            'rule_description', bl.rule_description,
            'is_active', bl.is_active
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

  findWithPostOwner: async (commentId) => {
    const queryText = `
      SELECT 
        c.*,
        p.user_id as post_owner_id
      FROM "Comments" c
      JOIN "Posts" p ON c.post_id = p.id
      WHERE c.id = $1;
    `;
    const result = await db.query(queryText, [commentId]);
    return result.rows[0];
  },

  /**
   * --- HÀM MỚI ---
   * Thực hiện xóa mềm một bình luận.
   */
  softDelete: async (commentId, data) => {
    const { deleted_at, deleted_by, deleted_reason } = data;
    const queryText = `
      UPDATE "Comments"
      SET 
        deleted_at = $1,
        deleted_by = $2,
        deleted_reason = $3
      WHERE id = $4;
    `;
    await db.query(queryText, [deleted_at, deleted_by, deleted_reason, commentId]);
  },

  restore: async (commentId) => {
    const queryText = `
      UPDATE "Comments"
      SET 
        deleted_at = NULL,
        deleted_by = NULL,
        deleted_reason = NULL
      WHERE id = $1;
    `;
    await db.query(queryText, [commentId]);
  },

  
};

module.exports = commentModel;