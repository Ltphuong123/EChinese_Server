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
      whereClause = `WHERE name ILIKE $1 OR email ILIKE $1 OR username ILIKE $1`;
    }

    const countQuery = `SELECT COUNT(*) FROM "Users" ${whereClause}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    if (totalItems === 0) {
      return { users: [], totalItems: 0 };
    }
    
    // Chỉ SELECT các trường cần thiết theo định nghĩa `Pick<User, ...>`
    const selectQuery = `
      SELECT id, name, email, avatar_url 
      FROM "Users"
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    const usersResult = await db.query(selectQuery, [...queryParams, limit, offset]);

    return { users: usersResult.rows, totalItems };
  },

  findSubscriptionsForUsers: async (userIds) => {
    if (userIds.length === 0) return [];
    
    const queryText = `
      SELECT 
        us.user_id,
        json_build_object(
          'id', us.id, 'user_id', us.user_id, 'subscription_id', us.subscription_id,
          'start_date', us.start_date, 'expiry_date', us.expiry_date, 'is_active', us.is_active,
          'auto_renew', us.auto_renew, 'last_payment_id', us.last_payment_id,
          'created_at', us.created_at, 'updated_at', us.updated_at
        ) AS "userSubscription",
        json_build_object(
          'id', s.id, 'name', s.name, 'description', s.description,
          'daily_quota_ai_lesson', s.daily_quota_ai_lesson,
          'daily_quota_translate', s.daily_quota_translate, 'price', s.price,
          'duration_months', s.duration_months, 'is_active', s.is_active,
          'created_at', s.created_at, 'updated_at', s.updated_at
        ) AS "subscription"
      FROM "UserSubscriptions" us
      JOIN "Subscriptions" s ON us.subscription_id = s.id
      WHERE us.user_id = ANY($1) AND us.is_active = true;
    `;
    const result = await db.query(queryText, [userIds]);
    return result.rows;
  },

  /**
   * Tìm thông tin sử dụng tính năng cho một danh sách user IDs.
   */
  findUsagesForUsers: async (userIds) => {
    if (userIds.length === 0) return [];

    const queryText = `SELECT * FROM "UserUsage" WHERE user_id = ANY($1);`;
    const result = await db.query(queryText, [userIds]);
    return result.rows;
  },


  



  findActiveSubscriptionsForUsers: async (userIds) => {
    // Hàm này vẫn giữ nguyên vì nó hoạt động rất tốt
    const queryText = `
      SELECT us.*, s.name as "subscription_name"
      FROM "UserSubscriptions" us
      JOIN "Subscriptions" s ON us.subscription_id = s.id
      WHERE us.user_id = ANY($1) AND us.is_active = true;
    `;
    const result = await db.query(queryText, [userIds]);
    return result.rows;
  },

  findUsagesForUsers: async (userIds) => {
    // Hàm này vẫn giữ nguyên
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




  findById1: async (id, client = db) => {
        const result = await client.query('SELECT * FROM "UserSubscriptions" WHERE id = $1', [id]);
        return result.rows[0];
    },

    findSubscriptionById1: async (id, client = db) => {
        const result = await client.query('SELECT * FROM "Subscriptions" WHERE id = $1', [id]);
        return result.rows[0];
    },

    findActiveSubscriptionByUserId1: async (userId, client = db) => {
        const result = await client.query('SELECT * FROM "UserSubscriptions" WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1', [userId]);
        return result.rows[0];
    },

    create1: async (data, client = db) => {
        const { user_id, subscription_id, start_date, expiry_date, is_active, auto_renew } = data;
        const query = `
            INSERT INTO "UserSubscriptions" (user_id, subscription_id, start_date, expiry_date, is_active, auto_renew)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
        `;
        const result = await client.query(query, [user_id, subscription_id, start_date, expiry_date, is_active, auto_renew]);
        return result.rows[0];
    },

    update1: async (id, data, client = db) => {
        const fieldsToUpdate = Object.keys(data);
        if (fieldsToUpdate.length === 0) return null;

        const setClause = fieldsToUpdate.map((field, i) => `"${field}" = $${i + 1}`).join(', ');
        const values = fieldsToUpdate.map(field => data[field]);

        const query = `
            UPDATE "UserSubscriptions" SET ${setClause}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${fieldsToUpdate.length + 1} RETURNING *;
        `;
        const result = await client.query(query, [...values, id]);
        return result.rows[0];
    },


    

    findActiveWithPlanDetails: async (userId, client = db) => {
        const query = `
            SELECT s.daily_quota_ai_lesson, s.daily_quota_translate
            FROM "UserSubscriptions" us
            JOIN "Subscriptions" s ON us.subscription_id = s.id
            WHERE us.user_id = $1 AND us.is_active = true
            ORDER BY us.created_at DESC
            LIMIT 1;
        `;
        const result = await client.query(query, [userId]);
        return result.rows[0];
    },






    // update: async (id, data, client = db) => {
    //     // Giả sử hàm này đã tồn tại và hoạt động đúng
    //     const fieldsToUpdate = Object.keys(data);
    //     if (fieldsToUpdate.length === 0) return null;
    //     const setClause = fieldsToUpdate.map((field, i) => `"${field}" = $${i + 1}`).join(', ');
    //     const values = fieldsToUpdate.map(field => data[field]);
    //     const query = `
    //         UPDATE "UserSubscriptions" SET ${setClause}, updated_at = CURRENT_TIMESTAMP
    //         WHERE id = $${fieldsToUpdate.length + 1} RETURNING *;
    //     `;
    //     const result = await client.query(query, [...values, id]);
    //     return result.rows[0];
    // },
    
    // findByPaymentId: async (paymentId, client = db) => {
    //     const query = `
    //         SELECT * FROM "UserSubscriptions" 
    //         WHERE last_payment_id = $1 
    //         ORDER BY created_at DESC 
    //         LIMIT 1
    //     `;
    //     const result = await client.query(query, [paymentId]);
    //     return result.rows[0];
    // },



};

module.exports = userSubscriptionModel;

