// file: models/achievementModel.js

const db = require('../config/db');

const achievementModel = {
  create: async (achievementData) => {
    const { name, description, criteria, icon, points, is_active } = achievementData;

    const queryText = `
      INSERT INTO "Achievements" (name, description, criteria, icon, points, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    // pg driver sẽ tự động chuyển đổi object criteria thành JSON
    const values = [name, description, criteria, icon, points, is_active];
    
    const result = await db.query(queryText, values);
    return result.rows[0];
  },

  findAllPaginated: async (filters) => {
    const { limit, offset, search, status, sortBy, sortOrder } = filters;
    
    const queryParams = [];
    let whereClauses = 'WHERE 1=1';

    // Lọc theo status
    if (status && status !== 'all') {
      const isActiveValue = status === 'active';
      queryParams.push(isActiveValue);
      whereClauses += ` AND is_active = $${queryParams.length}`;
    }

    // Tìm kiếm theo name hoặc description
    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses += ` AND (name ILIKE $${queryParams.length} OR description ILIKE $${queryParams.length})`;
    }
    
    // --- Truy vấn 1: Đếm tổng số bản ghi ---
    const countQuery = `SELECT COUNT(*) FROM "Achievements" ${whereClauses}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);
    
    // --- Xử lý sắp xếp động một cách an toàn ---
    // Whitelist các cột được phép sắp xếp để tránh SQL Injection
    const allowedSortBy = ['created_at', 'points', 'name'];
    const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'created_at';
    
    // Whitelist các hướng sắp xếp
    const safeSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    const orderByClause = `ORDER BY "${safeSortBy}" ${safeSortOrder}`;

    // --- Truy vấn 2: Lấy dữ liệu đã phân trang ---
    let selectQuery = `SELECT * FROM "Achievements" ${whereClauses} ${orderByClause}`;

    // Thêm LIMIT và OFFSET
    queryParams.push(limit);
    selectQuery += ` LIMIT $${queryParams.length}`;
    
    queryParams.push(offset);
    selectQuery += ` OFFSET $${queryParams.length}`;
    
    const achievementsResult = await db.query(selectQuery, queryParams);

    return {
      achievements: achievementsResult.rows,
      totalItems: totalItems,
    };
  },

  findById: async (id) => {
    const queryText = `SELECT * FROM "Achievements" WHERE id = $1;`;
    const result = await db.query(queryText, [id]);
    return result.rows[0];
  },

  findUsersByAchievementId: async (options) => {
    const { achievementId, limit, offset } = options;

    // --- Truy vấn 1: Đếm tổng số người dùng ---
    const countQuery = `SELECT COUNT(*) FROM "UserAchievements" WHERE achievement_id = $1;`;
    const totalResult = await db.query(countQuery, [achievementId]);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    // --- Truy vấn 2: Lấy dữ liệu chi tiết, có JOIN và phân trang ---
    const selectQuery = `
      SELECT 
        ua.id,
        ua.user_id,
        u.name as user_name,
        u.avatar_url as user_avatar,
        ua.achievement_id,
        a.name as achievement_name,
        ua.achieved_at,
        ua.progress
      FROM "UserAchievements" ua
      JOIN "Users" u ON ua.user_id = u.id
      JOIN "Achievements" a ON ua.achievement_id = a.id
      WHERE ua.achievement_id = $1
      ORDER BY ua.achieved_at DESC
      LIMIT $2
      OFFSET $3;
    `;

    const usersResult = await db.query(selectQuery, [achievementId, limit, offset]);

    return {
      users: usersResult.rows,
      totalItems,
    };
  },

  update: async (id, updateData) => {
    const fieldsToUpdate = Object.keys(updateData);
    if (fieldsToUpdate.length === 0) return null;

    const setClause = fieldsToUpdate.map((field, index) => `"${field}" = $${index + 1}`).join(', ');
    const values = Object.values(updateData);

    const queryText = `
      UPDATE "Achievements" SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fieldsToUpdate.length + 1}
      RETURNING *;
    `;
    const result = await db.query(queryText, [...values, id]);
    return result.rows[0];
  },

  deleteWithRelations: async (id) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Bước 1: Xóa các bản ghi liên quan trong UserAchievements để gỡ ràng buộc
      await client.query(`DELETE FROM "UserAchievements" WHERE achievement_id = $1;`, [id]);

      // Bước 2: Bây giờ mới xóa thành tích chính
      const deleteResult = await client.query(`DELETE FROM "Achievements" WHERE id = $1;`, [id]);

      await client.query('COMMIT');

      return deleteResult.rowCount;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Lỗi trong transaction khi xóa thành tích:', error);
      throw error;
    } finally {
      client.release();
    }
  },



};

module.exports = achievementModel;