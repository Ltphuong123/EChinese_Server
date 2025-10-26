// file: models/userSubscriptionModel.js

const db = require('../config/db');

const userSubscriptionModel = {
  findBy: async (field, value, client = db) => {
    // Whitelist các trường được phép tìm kiếm để tăng cường bảo mật
    const allowedFields = ['id', 'user_id', 'subscription_id', 'last_payment_id'];
    if (!allowedFields.includes(field)) {
        throw new Error(`Searching by field "${field}" is not allowed.`);
    }

    // Sử dụng dấu ngoặc kép quanh tên trường để tránh lỗi với các từ khóa SQL
    const queryText = `SELECT * FROM "UserSubscriptions" WHERE "${field}" = $1 LIMIT 1;`;
    const result = await client.query(queryText, [value]);
    return result.rows[0];
  },
  /**
   * Lấy danh sách người dùng đã được phân trang để làm cơ sở
   */
  findAllUsersPaginated: async ({ limit, offset, search }) => {
    const queryParams = [];
    let whereClause = '';

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause = `WHERE u.name ILIKE $1 OR u.email ILIKE $1 OR u.username ILIKE $1`;
    }

    const countQuery = `SELECT COUNT(*) FROM "Users" u ${whereClause}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    const selectQuery = `
      SELECT id, name, email, avatar_url 
      FROM "Users" u 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    const usersResult = await db.query(selectQuery, [...queryParams, limit, offset]);

    return { users: usersResult.rows, totalItems };
  },

  /**
   * Lấy các bản ghi UserSubscription đang hoạt động cho một danh sách user ID
   */
  findActiveSubscriptionsForUsers: async (userIds) => {
    const queryText = `
      SELECT us.*, s.name as "subscription_name"
      FROM "UserSubscriptions" us
      JOIN "Subscriptions" s ON us.subscription_id = s.id
      WHERE us.user_id = ANY($1) AND us.is_active = true;
    `;
    const result = await db.query(queryText, [userIds]);
    return result.rows;
  },
  
  /**
   * Lấy thông tin sử dụng (quotas) cho một danh sách user ID
   */
  findUsagesForUsers: async (userIds) => {
    const queryText = `SELECT user_id, feature, daily_count, last_reset FROM "UserUsage" WHERE user_id = ANY($1);`;
    const result = await db.query(queryText, [userIds]);
    return result.rows;
  },
    /**
   * Lấy toàn bộ lịch sử đăng ký của một người dùng
   */
  findHistoryByUserId: async (userId) => {
    const queryText = `
      SELECT us.*, s.name as "subscriptionName"
      FROM "UserSubscriptions" us
      JOIN "Subscriptions" s ON us.subscription_id = s.id
      WHERE us.user_id = $1
      ORDER BY us.created_at DESC;
    `;
    const result = await db.query(queryText, [userId]);
    return result.rows;
  },

  /**
   * Tìm một bản ghi UserSubscription theo ID của chính nó
   */
  findById: async (userSubId) => {
    const queryText = `SELECT * FROM "UserSubscriptions" WHERE id = $1;`;
    const result = await db.query(queryText, [userSubId]);
    return result.rows[0];
  },

  /**
   * Lấy thông tin chi tiết của một gói theo ID từ bảng "Subscriptions"
   */
  findSubscriptionById: async (subscriptionId) => {
    const queryText = `SELECT * FROM "Subscriptions" WHERE id = $1;`;
    const result = await db.query(queryText, [subscriptionId]);
    return result.rows[0];
  },
  /**
   * Tạo một bản ghi UserSubscription mới
   */
  create: async (data, client = db) => { // Cho phép truyền vào một transaction client
    const { user_id, subscription_id, start_date, expiry_date, is_active, auto_renew, last_payment_id } = data;
    const queryText = `
      INSERT INTO "UserSubscriptions" (user_id, subscription_id, start_date, expiry_date, is_active, auto_renew, last_payment_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [user_id, subscription_id, start_date, expiry_date, is_active, auto_renew, last_payment_id];
    const result = await client.query(queryText, values);
    return result.rows[0];
  },

  /**
   * Cập nhật một bản ghi UserSubscription
   */
  update: async (userSubId, updateData, client = db) => {
    const fields = Object.keys(updateData);
    const setClause = fields.map((field, index) => `"${field}" = $${index + 1}`).join(', ');
    const values = Object.values(updateData);
    
    const queryText = `
      UPDATE "UserSubscriptions"
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fields.length + 1}
      RETURNING *;
    `;
    
    const result = await client.query(queryText, [...values, userSubId]);
    return result.rows[0];
  },

  findActiveSubscriptionByUserId: async (userId, client = db) => {
    const queryText = `
      SELECT * FROM "UserSubscriptions" 
      WHERE user_id = $1 AND is_active = true 
      LIMIT 1;
    `;
    const result = await client.query(queryText, [userId]);
    return result.rows[0];
  },


};

module.exports = userSubscriptionModel;

