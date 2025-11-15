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
      recipient_id, audience, type, title, content, related_type,
      related_id, data: jsonData, redirect_url, expires_at, priority, from_system
    } = data;
    const queryText = `
      INSERT INTO "Notifications" (
        recipient_id, audience, type, title, content, related_type, 
        related_id, data, redirect_url, expires_at, priority, from_system
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    const values = [
      recipient_id, audience, type, title, content, related_type,
      related_id, jsonData, redirect_url, expires_at, priority, from_system
    ];
    const result = await db.query(queryText, values);
    return result.rows[0];
  },

  // READ (Paginated)
  findAll: async ({ userId, role, limit, offset }) => {
    // Chỉ lấy các thông báo:
    // 1. Dành cho tất cả mọi người (audience = 'all')
    // 2. Dành cho vai trò admin (audience = 'admin' và user là admin)
    // 3. Gửi đích danh cho user đó (recipient_id = userId)
    // 4. Chưa hết hạn
    const whereClauses = `
      WHERE (
        (audience = 'all') OR
        (audience = 'admin' AND $1 = ANY(ARRAY['admin', 'super admin'])) OR
        (recipient_id = $2)
      ) AND (expires_at IS NULL OR expires_at > NOW())
    `;
    const queryParams = [role, userId];

    const countQuery = `SELECT COUNT(*) FROM "Notifications" ${whereClauses}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    const selectQuery = `
      SELECT * FROM "Notifications" ${whereClauses}
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4;
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

};


module.exports = notificationModel;