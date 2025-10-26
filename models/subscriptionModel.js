// file: models/subscriptionModel.js

const db = require('../config/db');

const subscriptionModel = {
  /**
   * Tìm và phân trang các gói đăng ký với nhiều tùy chọn lọc và sắp xếp.
   */
  findAllAndPaginate: async (options) => {
    const { page, limit, search, status, sortBy, sortOrder } = options;
    const offset = (page - 1) * limit;
    const queryParams = [];

    // --- Xây dựng các điều kiện WHERE ---
    let whereClause = 'WHERE 1=1';
    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND name ILIKE $${queryParams.length}`;
    }
    if (status && status !== 'all') {
      queryParams.push(status === 'active'); // 'active' -> true, 'inactive' -> false
      whereClause += ` AND is_active = $${queryParams.length}`;
    }
    
    // --- Xây dựng ORDER BY ---
    // Whitelist để tránh SQL Injection
    const validSortBy = ['price', 'created_at'];
    const validSortOrder = ['asc', 'desc'];
    const orderBy = validSortBy.includes(sortBy) ? sortBy : 'created_at';
    const order = validSortOrder.includes(sortOrder) ? sortOrder.toUpperCase() : 'DESC';
    const orderByClause = `ORDER BY "${orderBy}" ${order}`;

    // --- Câu truy vấn COUNT ---
    const countQuery = `SELECT COUNT(*) FROM "Subscriptions" ${whereClause}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    // --- Câu truy vấn SELECT ---
    const selectQuery = `SELECT * FROM "Subscriptions" ${whereClause} ${orderByClause} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    const subscriptionsResult = await db.query(selectQuery, [...queryParams, limit, offset]);

    return {
      subscriptions: subscriptionsResult.rows,
      totalItems,
    };
  },
  
  /**
   * Đếm số lượng người dùng đang hoạt động của một gói
   */
  countActiveUsers: async (subscriptionId) => {
    const queryText = `
      SELECT COUNT(*) 
      FROM "UserSubscriptions" 
      WHERE subscription_id = $1 AND is_active = true;
    `;
    const result = await db.query(queryText, [subscriptionId]);
    return parseInt(result.rows[0].count, 10);
  },

  /**
   * Tạo một gói mới
   */
  create: async (payload) => {
    const { name, description, daily_quota_ai_lesson, daily_quota_translate, price, duration_months, is_active } = payload;
    const queryText = `
      INSERT INTO "Subscriptions" (name, description, daily_quota_ai_lesson, daily_quota_translate, price, duration_months, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [name, description, daily_quota_ai_lesson, daily_quota_translate, price, duration_months, is_active];
    const result = await db.query(queryText, values);
    return result.rows[0];
  },
  
  /**
   * Tìm một gói theo ID
   */
  findById: async (id) => {
    const queryText = 'SELECT * FROM "Subscriptions" WHERE id = $1';
    const result = await db.query(queryText, [id]);
    return result.rows[0];
  },
  
  /**
   * Cập nhật một gói
   */
  update: async (id, payload) => {
    const fieldsToUpdate = Object.keys(payload);
    if (fieldsToUpdate.length === 0) return null;

    const setClause = fieldsToUpdate.map((field, index) => `"${field}" = $${index + 1}`).join(', ');
    const values = Object.values(payload);

    const queryText = `
      UPDATE "Subscriptions" SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fieldsToUpdate.length + 1}
      RETURNING *;
    `;
    const result = await db.query(queryText, [...values, id]);
    return result.rows[0];
  },
  
  /**
   * Xóa một gói
   */
  delete: async (id) => {
    const queryText = 'DELETE FROM "Subscriptions" WHERE id = $1';
    await db.query(queryText, [id]);
  },
};

module.exports = subscriptionModel;

