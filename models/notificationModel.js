// file: models/notificationModel.js

const db = require('../config/db');

const notificationModel = {
  countUnread: async (userId) => {
    // Truy vấn này sẽ đếm các thông báo thỏa mãn:
    // 1. Dành riêng cho người dùng này (recipient_id = userId).
    // 2. Dành cho tất cả mọi người (audience = 'all').
    // VÀ
    // 3. Chưa được đọc (read_at IS NULL).
    // 4. Chưa hết hạn (expires_at IS NULL OR expires_at > NOW()).
    const queryText = `
      SELECT COUNT(*) 
      FROM "Notifications"
      WHERE 
        (recipient_id = $1 OR audience = 'all') 
        AND read_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW());
    `;
    
    const result = await db.query(queryText, [userId]);
    
    // parseInt để đảm bảo kết quả trả về là một số
    return parseInt(result.rows[0].count, 10);
  },
  
  // CREATE
  create: async (data) => {
    const {
      recipient_id, audience, type, title, content, redirect_type,
      data: jsonData, expires_at, priority, from_system, created_by
    } = data;
    
    // Validate: Tất cả values trong data phải là string
    if (jsonData && typeof jsonData === 'object') {
      Object.keys(jsonData).forEach(key => {
        if (jsonData[key] !== null && typeof jsonData[key] !== 'string') {
          jsonData[key] = String(jsonData[key]);
        }
      });
    }
    
    const queryText = `
      INSERT INTO "Notifications" (
        recipient_id, audience, type, title, content, redirect_type,
        data, expires_at, priority, from_system, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const values = [
      recipient_id, audience, type, title, content, redirect_type,
      jsonData, expires_at, priority, from_system, created_by
    ];
    const result = await db.query(queryText, values);
    return result.rows[0];
  },

  // READ (Paginated)

  findAll: async ({ userId, role, limit, offset, type, unreadOnly }) => {
    // Base WHERE clause
    let whereClauses = `
      WHERE (
        (audience = 'all') OR
        (audience = 'admin' AND $1 = ANY(ARRAY['admin', 'super admin'])) OR
        (recipient_id = $2)
      ) AND (expires_at IS NULL OR expires_at > NOW())
    `;

    const queryParams = [role, userId];
    let paramIndex = 3;

    // Filter by type
    if (type) {
      whereClauses += ` AND type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    // Filter by unread only
    if (unreadOnly) {
      whereClauses += ` AND read_at IS NULL`;
    }

    // Count query
    const countQuery = `SELECT COUNT(*) FROM "Notifications" ${whereClauses}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);


    // Select query
    const selectQuery = `
      SELECT * FROM "Notifications" ${whereClauses}
      ORDER BY 
        priority DESC,
        created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;
    const result = await db.query(selectQuery, [...queryParams, limit, offset]);

    return { notifications: result.rows, totalItems };
  },

  // BULK ACTIONS
  publishByIds: async (ids) => {
    // 'publish' ở đây có thể hiểu là gửi push notification
    const queryText = `UPDATE "Notifications" SET is_push_sent = true WHERE id = ANY($1::uuid[]);`;
    const result = await db.query(queryText, [ids]);
    return result.rowCount;
  },

  deleteByIds: async (ids) => {
    const queryText = `DELETE FROM "Notifications" WHERE id = ANY($1::uuid[]);`;
    const result = await db.query(queryText, [ids]);
    return result.rowCount;
  },
  
  updateReadStatus: async (notificationIds, userId, asRead) => {
    // Nếu asRead là true, đặt read_at là thời gian hiện tại.
    // Nếu asRead là false, đặt read_at về NULL.
    const readAtValue = asRead ? new Date() : null;

    const queryText = `
      UPDATE "Notifications"
      SET read_at = $1
      WHERE id = ANY($2::uuid[]) AND recipient_id = $3;
    `;
    // ANY($2::uuid[]) là cách hiệu quả trong PostgreSQL để kiểm tra
    // xem một giá trị có nằm trong một mảng hay không.

    const result = await db.query(queryText, [readAtValue, notificationIds, userId]);
    
    // Trả về số lượng hàng đã bị ảnh hưởng
    return result.rowCount;
  },

  // Helper: find active comment ban for a user (latest)
  findActiveBan: async (userId) => {
    const queryText = `
      SELECT * FROM "Notifications"
      WHERE recipient_id = $1
        AND type = 'comment_ban'
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const result = await db.query(queryText, [userId]);
    return result.rows[0] || null;
  },

  /**
   * Lấy tất cả thông báo đã gửi và đã nhận của admin
   * @param {string} adminId - ID của admin
   * @param {object} options - { page, limit }
   * @returns {object} { sent, received, meta }
   */
  findAdminNotifications: async (adminId, options) => {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    // 1. Lấy thông báo đã GỬI (created_by = adminId)
    const sentQuery = `
      SELECT 
        n.*,
        u.username as recipient_username,
        u.email as recipient_email
      FROM "Notifications" n
      LEFT JOIN "Users" u ON n.recipient_id = u.id
      WHERE n.created_by = $1
      ORDER BY n.created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const sentResult = await db.query(sentQuery, [adminId, limit, offset]);

    // Đếm tổng số thông báo đã gửi
    const sentCountQuery = `
      SELECT COUNT(*) FROM "Notifications"
      WHERE created_by = $1;
    `;
    const sentCountResult = await db.query(sentCountQuery, [adminId]);
    const totalSent = parseInt(sentCountResult.rows[0].count, 10);

    // 2. Lấy thông báo đã NHẬN (recipient_id = adminId hoặc audience = 'admin' hoặc 'all')
    const receivedQuery = `
      SELECT 
        n.*,
        sender.username as sender_username,
        sender.email as sender_email
      FROM "Notifications" n
      LEFT JOIN "Users" sender ON n.created_by = sender.id
      WHERE (
        n.recipient_id = $1 OR 
        n.audience = 'admin' OR 
        n.audience = 'all'
      )
      AND (n.expires_at IS NULL OR n.expires_at > NOW())
      ORDER BY n.created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const receivedResult = await db.query(receivedQuery, [adminId, limit, offset]);

    // Đếm tổng số thông báo đã nhận
    const receivedCountQuery = `
      SELECT COUNT(*) FROM "Notifications"
      WHERE (
        recipient_id = $1 OR 
        audience = 'admin' OR 
        audience = 'all'
      )
      AND (expires_at IS NULL OR expires_at > NOW());
    `;
    const receivedCountResult = await db.query(receivedCountQuery, [adminId]);
    const totalReceived = parseInt(receivedCountResult.rows[0].count, 10);

    return {
      sent: sentResult.rows,
      received: receivedResult.rows,
      meta: {
        page,
        limit,
        totalSent,
        totalReceived,
        totalPagesSent: Math.ceil(totalSent / limit),
        totalPagesReceived: Math.ceil(totalReceived / limit)
      }
    };
  },

};


module.exports = notificationModel;