// file: models/notificationModel.js

const db = require('../config/db');

const notificationModel = {
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
  
  markReadByIds: async (ids, userId, asRead) => {
    const readAtValue = asRead ? 'CURRENT_TIMESTAMP' : 'NULL';
    const queryText = `
      UPDATE "Notifications"
      SET read_at = ${readAtValue}
      WHERE id = ANY($1::uuid[]) AND recipient_id = $2;
    `;
    const result = await db.query(queryText, [ids, userId]);
    return result.rowCount;
  },
};


module.exports = notificationModel;