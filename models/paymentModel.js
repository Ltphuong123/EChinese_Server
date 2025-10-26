// file: models/paymentModel.js

const db = require('../config/db');

const paymentModel = {

 create: async (paymentData, client = db) => {
    const {
      user_id,
      subscription_id,
      amount,
      currency = 'VND',
      status = 'pending',
      payment_method,
      payment_channel = 'manual',
      gateway_transaction_id,
      manual_proof_url = null,
      notes = null,
      processed_by_admin = null
    } = paymentData;

    const queryText = `
      INSERT INTO "Payments" (
        user_id, subscription_id, amount, currency, status, 
        payment_method, payment_channel, gateway_transaction_id, 
        manual_proof_url, notes, processed_by_admin
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const values = [
      user_id, subscription_id, amount, currency, status,
      payment_method, payment_channel, gateway_transaction_id,
      manual_proof_url, notes, processed_by_admin
    ];
    
    const result = await client.query(queryText, values);
    return result.rows[0];
  },
  /**
   * Tìm kiếm, lọc và phân trang các giao dịch thanh toán
   */
  findAllAndPaginate: async (options) => {
    const { page, limit, search, status, method, channel, startDate, endDate } = options;
    const offset = (page - 1) * limit;
    const queryParams = [];

    // --- Xây dựng câu truy vấn động ---
    let baseQuery = `
      FROM "Payments" p
      LEFT JOIN "Users" u ON p.user_id = u.id
      WHERE 1=1
    `;

    if (search) {
      queryParams.push(`%${search}%`);
      const searchIndex = queryParams.length;
      baseQuery += ` AND (u.name ILIKE $${searchIndex} OR u.email ILIKE $${searchIndex} OR p.gateway_transaction_id ILIKE $${searchIndex})`;
    }
    if (status) {
      queryParams.push(status);
      baseQuery += ` AND p.status = $${queryParams.length}`;
    }
    if (method) {
      queryParams.push(method);
      baseQuery += ` AND p.payment_method = $${queryParams.length}`;
    }
    if (channel) {
      queryParams.push(channel);
      baseQuery += ` AND p.payment_channel = $${queryParams.length}`;
    }
    if (startDate) {
      queryParams.push(startDate);
      baseQuery += ` AND p.transaction_date >= $${queryParams.length}`;
    }
    if (endDate) {
      queryParams.push(endDate);
      baseQuery += ` AND p.transaction_date <= $${queryParams.length}`;
    }

    // --- Câu truy vấn COUNT ---
    const countQuery = `SELECT COUNT(p.id) ${baseQuery}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    // --- Câu truy vấn SELECT ---
    const selectQuery = `
      SELECT p.*, u.name as user_name, u.email as user_email
      ${baseQuery}
      ORDER BY p.transaction_date DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    const paymentsResult = await db.query(selectQuery, [...queryParams, limit, offset]);

    return {
      payments: paymentsResult.rows,
      totalItems,
    };
  },

  /**
   * Tìm một giao dịch thanh toán theo ID
   */
  findById: async (paymentId, client = db) => {
    const queryText = `SELECT * FROM "Payments" WHERE id = $1`;
    const result = await client.query(queryText, [paymentId]);
    return result.rows[0];
  },

  /**
   * Cập nhật trạng thái của một giao dịch thanh toán
   */
  updateStatus: async (paymentId, status, adminId, client = db) => {
    const queryText = `
      UPDATE "Payments"
      SET status = $1, processed_by_admin = $2
      WHERE id = $3
      RETURNING *;
    `;
    const result = await client.query(queryText, [status, adminId, paymentId]);
    return result.rows[0];
  },

  /**
   * Cập nhật trạng thái của nhiều giao dịch thanh toán
   */
  bulkUpdateStatus: async (paymentIds, status, adminId) => {
    const queryText = `
      UPDATE "Payments"
      SET status = $1, processed_by_admin = $2
      WHERE id = ANY($3) AND status = 'pending'; -- Chỉ cập nhật những cái đang chờ
    `;
    // result.rowCount chứa số hàng đã được cập nhật
    const result = await db.query(queryText, [status, adminId, paymentIds]);
    return result.rowCount;
  },

  search: async (query, limit = 10) => {
    const searchQuery = `%${query}%`;
    const queryText = `
      SELECT 
        p.id,
        p.user_id,
        p.amount,
        p.status,
        p.gateway_transaction_id,
        u.email as "userEmail"
      FROM "Payments" p
      LEFT JOIN "Users" u ON p.user_id = u.id
      WHERE 
        p.id::text ILIKE $1 OR
        p.user_id::text ILIKE $1 OR
        u.email ILIKE $1 OR
        p.gateway_transaction_id ILIKE $1
      ORDER BY p.transaction_date DESC
      LIMIT $2;
    `;
    const result = await db.query(queryText, [searchQuery, limit]);
    return result.rows;
  },

  findByUserId: async (userId) => {
    const queryText = `
      SELECT p.*, s.name as subscription_name
      FROM "Payments" p
      LEFT JOIN "Subscriptions" s ON p.subscription_id = s.id
      WHERE p.user_id = $1
      ORDER BY p.transaction_date DESC;
    `;
    const result = await db.query(queryText, [userId]);
    return result.rows;
  },

};

module.exports = paymentModel;