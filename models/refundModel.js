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

    // --- Xây dựng phần FROM và JOINs ---
    let baseQuery = `
      FROM "Refunds" r
      LEFT JOIN "Users" u ON r.user_id = u.id
      LEFT JOIN "Users" admin ON r.processed_by_admin = admin.id
      LEFT JOIN "Payments" p ON r.payment_id = p.id
      -- JOIN thêm một lần nữa để lấy tên gói subscription từ payment
      LEFT JOIN "Subscriptions" s ON p.subscription_id = s.id
      WHERE 1=1
    `;

    // --- Xây dựng các điều kiện WHERE động (giữ nguyên) ---
    if (search) {
        queryParams.push(`%${search}%`);
        const searchIndex = queryParams.length;
        // Mở rộng tìm kiếm để bao gồm cả mã giao dịch
        baseQuery += ` AND (u.name ILIKE $${searchIndex} OR u.email ILIKE $${searchIndex} OR p.gateway_transaction_id ILIKE $${searchIndex})`;
    }
    if (status && status !== 'all') {
        queryParams.push(status);
        baseQuery += ` AND r.status = $${queryParams.length}`;
    }
    if (startDate && startDate !== 'null') {
        queryParams.push(startDate);
        baseQuery += ` AND r.created_at >= $${queryParams.length}::date`;
    }
    if (endDate && endDate !== 'null') {
        queryParams.push(endDate);
        baseQuery += ` AND r.created_at < ($${queryParams.length}::date + '1 day'::interval)`;
    }

    // --- Câu truy vấn COUNT (giữ nguyên) ---
    const countQuery = `SELECT COUNT(r.id) ${baseQuery}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    if (totalItems === 0) {
        return { refundRequests: [], totalItems: 0 };
    }

    // --- Câu truy vấn SELECT đã được nâng cấp với json_build_object ---
    const selectQuery = `
      SELECT 
        r.id,
        r.user_id,
        u.name AS "userName",
        r.processed_by_admin,
        admin.name AS "processedByAdminName",
        r.refund_amount,
        r.refund_method,
        r.reason,
        r.status,
        r.created_at,
        r.processed_at,
        r.payment_id,
        
        -- Xây dựng object "payment" lồng nhau
        -- Sử dụng CASE để xử lý trường hợp payment_id là NULL
        CASE
          WHEN p.id IS NOT NULL THEN
            json_build_object(
              'id', p.id,
              'user_id', p.user_id,
              'userName', u.name, -- Tên user đã có sẵn từ join đầu
              'userEmail', u.email, -- Email user
              'subscription_id', p.subscription_id,
              'subscriptionName', s.name, -- Tên gói đăng ký
              'amount', p.amount,
              'currency', p.currency,
              'status', p.status,
              'payment_method', p.payment_method,
              'payment_channel', p.payment_channel,
              'gateway_transaction_id', p.gateway_transaction_id,
              'transaction_date', p.transaction_date
              -- 'processedByAdminName' của payment không có, nên để undefined ở service layer
            )
          ELSE NULL
        END AS payment
        
      ${baseQuery}
      ORDER BY r.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    const refundsResult = await db.query(selectQuery, [...queryParams, limit, offset]);

    return {
        refundRequests: refundsResult.rows,
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
  },


    update: async (id, data, client = db) => {
        const fields = Object.keys(data);
        const setClause = fields.map((field, i) => `"${field}" = $${i + 1}`).join(', ');
        const values = Object.values(data);
        
        const query = `
            UPDATE "Refunds" SET ${setClause}
            WHERE id = $${fields.length + 1} RETURNING *;
        `;
        
        const result = await client.query(query, [...values, id]);
        return result.rows[0];
    },
    
    /**
     * Cập nhật trạng thái của một bản ghi trong bảng Payments.
     */
    updatePaymentStatus: async (paymentId, status, client = db) => {
        const query = 'UPDATE "Payments" SET status = $1 WHERE id = $2;';
        const result = await client.query(query, [status, paymentId]);
        
        // Ném lỗi nếu không tìm thấy payment để cập nhật
        if (result.rowCount === 0) {
            const error = new Error(`Giao dịch thanh toán với ID ${paymentId} không tồn tại.`);
            error.statusCode = 404;
            throw error;
        }
    },



};

module.exports = refundModel;