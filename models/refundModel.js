// file: models/refundModel.js

const db = require('../config/db');

const refundModel = {
  /**
   * Tìm kiếm, lọc và phân trang các yêu cầu hoàn tiền
   */
  findAllAndPaginate: async (options) => {
    const { page, limit, search, status, startDate, endDate } = options;
    const offset = (page - 1) * limit;
    const queryParams = [];

    let baseQuery = `
      FROM "Refunds" r
      LEFT JOIN "Users" u ON r.user_id = u.id
      LEFT JOIN "Payments" p ON r.payment_id = p.id
      WHERE 1=1
    `;

    if (search) {
      queryParams.push(`%${search}%`);
      const searchIndex = queryParams.length;
      baseQuery += ` AND (u.name ILIKE $${searchIndex} OR u.email ILIKE $${searchIndex})`;
    }
    if (status && status !== 'all') {
      queryParams.push(status);
      baseQuery += ` AND r.status = $${queryParams.length}`;
    }
    if (startDate) {
      queryParams.push(startDate);
      baseQuery += ` AND r.created_at >= $${queryParams.length}`;
    }
    if (endDate) {
      queryParams.push(endDate);
      baseQuery += ` AND r.created_at <= $${queryParams.length}`;
    }

    const countQuery = `SELECT COUNT(r.id) ${baseQuery}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    const selectQuery = `
      SELECT r.*, u.name as user_name, u.email as user_email, p.amount as payment_amount
      ${baseQuery}
      ORDER BY r.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    const refundsResult = await db.query(selectQuery, [...queryParams, limit, offset]);

    return {
      refunds: refundsResult.rows,
      totalItems,
    };
  },

  /**
   * Tìm một yêu cầu hoàn tiền theo ID
   */
  findById: async (refundId, client = db) => {
    const queryText = `SELECT * FROM "Refunds" WHERE id = $1`;
    const result = await client.query(queryText, [refundId]);
    return result.rows[0];
  },

  /**
   * Cập nhật một yêu cầu hoàn tiền
   */
  update: async (refundId, data, client = db) => {
    const fields = Object.keys(data);
    const setClause = fields.map((field, index) => `"${field}" = $${index + 1}`).join(', ');
    const values = Object.values(data);
    
    const queryText = `
        UPDATE "Refunds" SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *;
    `;
    const result = await client.query(queryText, [...values, refundId]);
    return result.rows[0];
  },
  
  /**
   * Tạo yêu cầu hoàn tiền (dùng cho User)
   */
  create: async (data) => {
      const { payment_id, user_id, reason } = data;
      const queryText = `
        INSERT INTO "Refunds" (payment_id, user_id, reason, refund_amount)
        SELECT id, user_id, $3, amount FROM "Payments" WHERE id = $1 AND user_id = $2
        RETURNING *;
      `;
      // Lấy refund_amount từ chính payment để đảm bảo chính xác
      const result = await db.query(queryText, [payment_id, user_id, reason]);
      return result.rows[0];
  },

  /**
   * Lấy lịch sử yêu cầu hoàn tiền của user
   */
  findByUserId: async (userId) => {
      const queryText = `SELECT * FROM "Refunds" WHERE user_id = $1 ORDER BY created_at DESC`;
      const result = await db.query(queryText, [userId]);
      return result.rows;
  }
};

module.exports = refundModel;