// file: models/adminLogModel.js

const db = require('../config/db');

const adminLogModel = {
  /**
   * Tạo một bản ghi log mới.
   * @param {object} logData - Dữ liệu của log.
   * @returns {Promise<object>} Bản ghi log vừa được tạo.
   */
  create: async (logData) => {
    const { user_id, action_type, target_id, description } = logData;
    const queryText = `
      INSERT INTO "AdminLogs" (user_id, action_type, target_id, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [user_id, action_type, target_id, description];
    const result = await db.query(queryText, values);
    return result.rows[0];
  },

  /**
   * Lấy danh sách các bản ghi log với phân trang và bộ lọc.
   * @param {object} filters - Các tùy chọn lọc và phân trang.
   * @returns {Promise<{logs: Array, totalItems: number}>}
   */
  findAll: async () => {
    const queryText = `
      SELECT 
        al.*,
        u.name as admin_name,
        u.email as admin_email
      FROM "AdminLogs" al
      LEFT JOIN "Users" u ON al.user_id = u.id
      ORDER BY al.created_at DESC;
    `;
    
    const result = await db.query(queryText);
    return result.rows;
  },

};

module.exports = adminLogModel;