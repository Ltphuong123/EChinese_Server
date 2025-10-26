// file: models/postModel.js

const db = require('../config/db');

const postModel = {
 
  create: async (postData) => {
    const {
      user_id,
      title,
      content,
      topic,
      status = 'published',
      is_approved = true,
      auto_flagged = false,
      is_pinned = false
    } = postData;

    const queryText = `
      INSERT INTO "Posts" (user_id, title, content, topic, status, is_approved, auto_flagged, is_pinned)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const values = [user_id, title, content, topic, status, is_approved, auto_flagged, is_pinned];
    const result = await db.query(queryText, values);
    return result.rows[0];
  },

  findAllPublic: async (filters) => {
    const { limit, offset, topic } = filters;
    
    const queryParams = [];
    // Chỉ lấy các bài viết đã được công bố, phê duyệt và chưa bị xóa
    let whereClauses = `WHERE p.status = 'published' AND p.is_approved = true AND p.deleted_at IS NULL`;

    if (topic) {
      queryParams.push(topic);
      whereClauses += ` AND p.topic = $${queryParams.length}`;
    }

    const baseQuery = `
      FROM "Posts" p
      LEFT JOIN "Users" u ON p.user_id = u.id
      ${whereClauses}
    `;

    // Truy vấn đếm
    const countQuery = `SELECT COUNT(p.id) ${baseQuery}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    // Truy vấn lấy dữ liệu
    const selectQuery = `
      SELECT 
        p.id, p.title, p.content, p.topic, p.likes, p.views, p.created_at, p.is_pinned,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'avatar_url', u.avatar_url
        ) as author
      ${baseQuery}
      ORDER BY p.is_pinned DESC, p.created_at DESC
      LIMIT $${queryParams.length + 1}
      OFFSET $${queryParams.length + 2};
    `;
    
    const postsResult = await db.query(selectQuery, [...queryParams, limit, offset]);
    return { posts: postsResult.rows, totalItems };
  },

  findById: async (postId) => {
    const queryText = `
      SELECT 
        p.*,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'avatar_url', u.avatar_url
        ) as author
      FROM "Posts" p
      LEFT JOIN "Users" u ON p.user_id = u.id
      WHERE p.id = $1 AND p.deleted_at IS NULL;
    `;
    const result = await db.query(queryText, [postId]);
    return result.rows[0];
  },

  update: async (postId, userId, updateData) => {
    const fieldsToUpdate = Object.keys(updateData);
    if (fieldsToUpdate.length === 0) return null;

    const setClause = fieldsToUpdate.map((field, index) => `"${field}" = $${index + 1}`).join(', ');
    const values = Object.values(updateData);

    const queryText = `
      UPDATE "Posts"
      SET ${setClause}
      WHERE id = $${fieldsToUpdate.length + 1} AND user_id = $${fieldsToUpdate.length + 2}
      RETURNING *;
    `;
    const result = await db.query(queryText, [...values, postId, userId]);
    return result.rows[0];
  },

  findLike: async (postId, userId) => {
    const queryText = `SELECT id FROM "PostLikes" WHERE post_id = $1 AND user_id = $2;`;
    const result = await db.query(queryText, [postId, userId]);
    return result.rows[0];
  },
  
  addLike: async (postId, userId) => {
    const queryText = `INSERT INTO "PostLikes" (post_id, user_id) VALUES ($1, $2);`;
    await db.query(queryText, [postId, userId]);
  },

  removeLike: async (postId, userId) => {
    const queryText = `DELETE FROM "PostLikes" WHERE post_id = $1 AND user_id = $2;`;
    await db.query(queryText, [postId, userId]);
  },
  
  updateLikesCount: async (postId) => {
    const queryText = `
      WITH like_count AS (
        SELECT COUNT(*) as total_likes FROM "PostLikes" WHERE post_id = $1
      )
      UPDATE "Posts"
      SET likes = (SELECT total_likes FROM like_count)
      WHERE id = $1
      RETURNING likes;
    `;
    const result = await db.query(queryText, [postId]);
    return result.rows[0].likes;
  },

  // --- CÁC HÀM MỚI CHO VIEW ---
  addViewRecord: async (postId, userId) => {
    // userId có thể là null nếu là khách
    const queryText = `INSERT INTO "PostViews" (post_id, user_id) VALUES ($1, $2);`;
    await db.query(queryText, [postId, userId]);
  },

  updateViewsCount: async (postId) => {
    // Đếm lại toàn bộ để đảm bảo chính xác
    const queryText = `
      WITH view_count AS (
        SELECT COUNT(*) as total_views FROM "PostViews" WHERE post_id = $1
      )
      UPDATE "Posts"
      SET views = (SELECT total_views FROM view_count)
      WHERE id = $1
      RETURNING views;
    `;
    const result = await db.query(queryText, [postId]);
    return result.rows[0].views;
  },



  softDelete: async (postId, userId, reason, adminId = null) => {
    let queryText;
    const params = [reason, adminId || userId, postId];
    
    if (userId) { // User tự xóa
      queryText = `UPDATE "Posts" SET deleted_at = CURRENT_TIMESTAMP, deleted_reason = $1, deleted_by = $2 WHERE id = $3 AND user_id = $2;`;
      params.pop(); // Bỏ postId ra
      params.push(postId, userId); // Thêm postId và userId cho điều kiện WHERE
      queryText = `UPDATE "Posts" SET deleted_at = CURRENT_TIMESTAMP, deleted_reason = $1, deleted_by = $2 WHERE id = $3 AND user_id = $4;`;
    } else { // Admin xóa
      queryText = `UPDATE "Posts" SET deleted_at = CURRENT_TIMESTAMP, deleted_reason = $1, deleted_by = $2 WHERE id = $3;`;
    }
    
    const result = await db.query(queryText, params);
    return result.rowCount;
  },

  restore: async (postId) => {
      const queryText = `UPDATE "Posts" SET deleted_at = NULL, deleted_reason = NULL, deleted_by = NULL WHERE id = $1;`;
      const result = await db.query(queryText, [postId]);
      return result.rowCount;
  }
};

module.exports = postModel;


