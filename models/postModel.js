// file: models/postModel.js

const db = require('../config/db');

const postModel = {
  create: async (postData) => {
    const {
      user_id,
      title,
      content,
      topic,
      status = "published",
      is_approved = true,
      auto_flagged = false,
      is_pinned = false,
    } = postData;

    const queryText = `
      INSERT INTO "Posts" (user_id, title, content, topic, status, is_approved, auto_flagged, is_pinned)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const values = [
      user_id,
      title,
      content,
      topic,
      status,
      is_approved,
      auto_flagged,
      is_pinned,
    ];
    const result = await db.query(queryText, values);
    return result.rows[0];
  },

  findAllPublic: async (filters) => {
    const { limit, offset, topic, currentUserId, status } = filters;
    
    // --- Xử lý tham số và điều kiện WHERE ---
    const queryParams = [currentUserId, limit, offset];
    let whereClauses = `WHERE p.deleted_at IS NULL`;

    // Lọc theo topic
    if (topic&& topic !== 'undefined') {
      queryParams.push(topic);
      whereClauses += ` AND p.topic = $${queryParams.length}`;
    }

    // Lọc theo status (trạng thái kiểm duyệt)
    if (status && status !== 'all') {
      queryParams.push(status);
      whereClauses += ` AND p.status = $${queryParams.length}`;
    } else {
      // Mặc định, chỉ lấy các bài 'published' và đã 'approved'
      whereClauses += ` AND p.status = 'published' AND p.is_approved = true`;
    }

    const baseQuery = `
      FROM "Posts" p
      JOIN "Users" u ON p.user_id = u.id
      LEFT JOIN "BadgeLevels" bl ON u.badge_level = bl.level
      ${whereClauses}
    `;

    // --- Truy vấn đếm ---
    const countQuery = `SELECT COUNT(p.id) ${baseQuery}`;
    const countParams = queryParams.slice(3); // Chỉ lấy các param của WHERE
    const totalResult = await db.query(countQuery, countParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    // --- Truy vấn lấy dữ liệu chính ---
    const selectQuery = `
      SELECT 
        p.*, -- Lấy tất cả các trường từ Posts, bao gồm auto_flagged
        
        -- Thông tin người dùng (author)
        jsonb_build_object(
          'id', u.id,
          'name', u.name,
          'avatar_url', u.avatar_url,
          'badge_level', u.badge_level,
          'community_points', u.community_points,
          'level', u.level
          -- Thêm các trường khác của user nếu cần
        ) as "user",
        
        -- Thông tin huy hiệu (badge)
        jsonb_build_object(
            'level', bl.level,
            'name', bl.name,
            'icon', bl.icon
        ) as badge,
        
        -- Đếm số lượng bình luận
        (SELECT COUNT(*) FROM "Comments" cmt WHERE cmt.post_id = p.id AND cmt.deleted_at IS NULL) as comment_count,
        
        -- Trạng thái tương tác của người dùng hiện tại
        EXISTS (SELECT 1 FROM "PostLikes" pl WHERE pl.post_id = p.id AND pl.user_id = $1) as "isLiked",
        EXISTS (SELECT 1 FROM "Comments" c WHERE c.post_id = p.id AND c.user_id = $1 AND c.deleted_at IS NULL) as "isCommented"
        
      ${baseQuery}
      ORDER BY p.is_pinned DESC, p.created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    
    const postsResult = await db.query(selectQuery, queryParams);
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

    const setClause = fieldsToUpdate
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(", ");
    const values = Object.values(updateData);

    const queryText = `
      UPDATE "Posts"
      SET ${setClause}
      WHERE id = $${fieldsToUpdate.length + 1} AND user_id = $${
      fieldsToUpdate.length + 2
    }
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

  getPostViews: async (postId, filters, offset) => {
    const sql = `
      WITH user_views AS (
        SELECT
          user_id,
          COUNT(*) AS view_count,
          MAX(viewed_at) AS last_viewed_at
        FROM "PostViews"
        WHERE post_id = $1 AND user_id IS NOT NULL
        GROUP BY user_id
      )
      SELECT
        u.id                    AS user_id,
        u.name                  AS name,
        u.avatar_url            AS avatar_url,
        u.level                 AS level,
        u.badge_level           AS badge_level_id,
        bl.name                 AS badge_name,
        bl.icon                 AS badge_icon,
        uv.view_count           AS views_count,
        uv.last_viewed_at       AS last_viewed_at
      FROM user_views uv
      JOIN "Users" u ON u.id = uv.user_id
      LEFT JOIN "BadgeLevels" bl ON bl.level = u.badge_level
      ORDER BY uv.last_viewed_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const viewer = await db.query(sql, [postId, filters.limit, offset]);
    const totalSql = `
      SELECT COUNT(DISTINCT user_id) AS total
      FROM "PostViews"
      WHERE post_id = $1 AND user_id IS NOT NULL;
    `;
    const totalResult = await db.query(totalSql, [postId]);
    const totalItems = parseInt(totalResult.rows[0].total, 10);

    return {
      viewer: viewer.rows,
      totalItems,
    };
  },

  getPostLikes: async (postId, filters = {}, offset = 0) => {
    const sql = `
      SELECT  
        u.id                    AS user_id,
        u.name                  AS name,
        u.avatar_url            AS avatar_url,
        u.level                 AS level,
        u.badge_level           AS badge_level_id,
        bl.name                 AS badge_name,
        bl.icon                 AS badge_icon
      FROM "PostLikes" pl
      JOIN  
        "Users" u ON u.id = pl.user_id
      LEFT JOIN "BadgeLevels" bl ON bl.level = u.badge_level
      WHERE pl.post_id = $1 
      ORDER BY pl.created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const likers = await db.query(sql, [postId, filters.limit, offset]);
    const totalSql = `
      SELECT COUNT(*) AS total
      FROM "PostLikes"
      WHERE post_id = $1;
    `;
    const totalResult = await db.query(totalSql, [postId]);
    const totalItems = parseInt(totalResult.rows[0].total, 10);
    return {
      likers: likers.rows,
      totalItems,
    };
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


  findAllByUserId: async (userId, currentUserId, { limit, offset }) => {
    const where = `WHERE p.user_id = $1 AND p.deleted_at IS NULL`;
    const params = [userId, currentUserId, limit, offset];

    const baseQuery = `FROM "Posts" p JOIN "Users" u ON p.user_id = u.id ${where}`;

    const countQuery = `SELECT COUNT(p.id) ${baseQuery};`;
    const totalResult = await db.query(countQuery, [userId]);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    const selectQuery = `
      SELECT 
        p.id, p.title, p.content, p.topic, p.likes, p.views, p.created_at, p.is_pinned,
        json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url) as author,
        EXISTS (SELECT 1 FROM "PostLikes" pl WHERE pl.post_id = p.id AND pl.user_id = $2) as "isLiked",
        EXISTS (SELECT 1 FROM "Comments" c WHERE c.post_id = p.id AND c.user_id = $2) as "isCommented"
      ${baseQuery}
      ORDER BY p.created_at DESC
      LIMIT $3 OFFSET $4;
    `;
    
    const postsResult = await db.query(selectQuery, params);
    return { posts: postsResult.rows, totalItems };
  },

  /**
   * --- HÀM 3: Lấy danh sách bài viết mà người dùng đã tương tác (like hoặc comment) ---
   */
  findInteractedByUserId: async (userId, { limit, offset }) => {
    const params = [userId, limit, offset];
    
    // Điều kiện WHERE để tìm các bài viết đã tương tác
    const whereInteracted = `
      WHERE p.deleted_at IS NULL AND p.id IN (
        SELECT post_id FROM "PostLikes" WHERE user_id = $1
        UNION
        SELECT post_id FROM "Comments" WHERE user_id = $1
      )
    `;

    const baseQuery = `FROM "Posts" p JOIN "Users" u ON p.user_id = u.id ${whereInteracted}`;

    // Truy vấn đếm
    const countQuery = `SELECT COUNT(p.id) ${baseQuery};`;
    const totalResult = await db.query(countQuery, [userId]);
    const totalItems = parseInt(totalResult.rows[0].count, 10);
    
    // Truy vấn lấy dữ liệu đầy đủ
    const selectQuery = `
      SELECT
        p.id, p.title, p.content, p.topic, p.likes, p.views, p.created_at, p.is_pinned,
        json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url) as author,
        EXISTS (SELECT 1 FROM "PostLikes" pl WHERE pl.post_id = p.id AND pl.user_id = $1) as "isLiked",
        EXISTS (SELECT 1 FROM "Comments" c WHERE c.post_id = p.id AND c.user_id = $1) as "isCommented"
      ${baseQuery}
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    
    const postsResult = await db.query(selectQuery, params);
    return { posts: postsResult.rows, totalItems };
  },








  findRawById: async (postId) => {
    const queryText = `SELECT * FROM "Posts" WHERE id = $1;`;
    const result = await db.query(queryText, [postId]);
    return result.rows[0];
  },

  /**
   * --- HÀM MỚI ---
   * Thực hiện xóa mềm một bài viết.
   */
  softDelete: async (postId, data) => {
    const { deleted_at, deleted_by, deleted_reason, status } = data;
    const queryText = `
      UPDATE "Posts"
      SET 
        deleted_at = $1,
        deleted_by = $2,
        deleted_reason = $3,
        status = $4
      WHERE id = $5;
    `;
    await db.query(queryText, [deleted_at, deleted_by, deleted_reason, status, postId]);
  },




};

module.exports = postModel;
