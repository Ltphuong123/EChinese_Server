// file: models/deviceTokenModel.js

const db = require('../config/db');

const deviceTokenModel = {
  
  // Lưu hoặc cập nhật device token
  upsert: async (userId, token, platform, deviceInfo = {}) => {
    const queryText = `
      INSERT INTO "DeviceTokens" (user_id, token, platform, device_info, is_active)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (token) 
      DO UPDATE SET 
        user_id = EXCLUDED.user_id,
        platform = EXCLUDED.platform,
        device_info = EXCLUDED.device_info,
        is_active = true,
        updated_at = NOW()
      RETURNING *;
    `;
    const values = [userId, token, platform, deviceInfo];
    const result = await db.query(queryText, values);
    return result.rows[0];
  },

  // Lấy token của một user (có thể có nhiều thiết bị)
  findByUserId: async (userId) => {
    const queryText = `
      SELECT * FROM "DeviceTokens"
      WHERE user_id = $1 AND is_active = true
      ORDER BY updated_at DESC;
    `;
    const result = await db.query(queryText, [userId]);
    return result.rows;
  },

  // Lấy token của nhiều users (dùng cho broadcast)
  findByUserIds: async (userIds) => {
    const queryText = `
      SELECT * FROM "DeviceTokens"
      WHERE user_id = ANY($1::uuid[]) AND is_active = true;
    `;
    const result = await db.query(queryText, [userIds]);
    return result.rows;
  },

  // Lấy tất cả tokens active (dùng cho broadcast toàn bộ)
  findAllActive: async () => {
    const queryText = `
      SELECT * FROM "DeviceTokens"
      WHERE is_active = true;
    `;
    const result = await db.query(queryText);
    return result.rows;
  },

  // Xóa token (khi user logout hoặc token không hợp lệ)
  deleteByToken: async (token) => {
    const queryText = `
      DELETE FROM "DeviceTokens"
      WHERE token = $1
      RETURNING *;
    `;
    const result = await db.query(queryText, [token]);
    return result.rows[0];
  },

  // Xóa tất cả tokens của user (khi user logout khỏi tất cả thiết bị)
  deleteByUserId: async (userId) => {
    const queryText = `
      DELETE FROM "DeviceTokens"
      WHERE user_id = $1
      RETURNING *;
    `;
    const result = await db.query(queryText, [userId]);
    return result.rowCount;
  },

  // Đánh dấu token không hoạt động (thay vì xóa)
  deactivate: async (token) => {
    const queryText = `
      UPDATE "DeviceTokens"
      SET is_active = false, updated_at = NOW()
      WHERE token = $1
      RETURNING *;
    `;
    const result = await db.query(queryText, [token]);
    return result.rows[0];
  },

  // Xóa các token cũ không hoạt động (cleanup job)
  deleteInactive: async (daysOld = 30) => {
    const queryText = `
      DELETE FROM "DeviceTokens"
      WHERE is_active = false 
        AND updated_at < NOW() - INTERVAL '${daysOld} days'
      RETURNING *;
    `;
    const result = await db.query(queryText);
    return result.rowCount;
  },

};

module.exports = deviceTokenModel;
