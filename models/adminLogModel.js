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
  findAll: async (filters) => {
    const { limit, offset, search, admin_id, action_type, start_date, end_date } = filters;
    
    let whereClauses = 'WHERE 1=1';
    const params = [];

    // Filter by admin_id
    if (admin_id) {
      params.push(admin_id);
      whereClauses += ` AND al.user_id = $${params.length}`;
    }

    // Filter by action_type
    if (action_type) {
      params.push(action_type);
      whereClauses += ` AND al.action_type = $${params.length}`;
    }

    // Search in description, target_id, admin name
    if (search) {
      params.push(`%${search}%`);
      whereClauses += ` AND (
        al.description ILIKE $${params.length}
        OR al.target_id::text ILIKE $${params.length}
        OR u.name ILIKE $${params.length}
        OR u.username ILIKE $${params.length}
      )`;
    }

    // Filter by date range
    if (start_date) {
      params.push(start_date);
      whereClauses += ` AND al.created_at >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      whereClauses += ` AND al.created_at <= $${params.length}`;
    }

    const baseQuery = `
      FROM "AdminLogs" al
      LEFT JOIN "Users" u ON al.user_id = u.id
      ${whereClauses}
    `;

    // Count query
    const countQuery = `SELECT COUNT(al.id) ${baseQuery};`;
    const totalResult = await db.query(countQuery, params);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    // Data query
    const selectQuery = `
      SELECT 
        al.id,
        al.user_id,
        u.name as "adminName",
        u.username as admin_username,
        u.email as admin_email,
        al.action_type,
        al.description,
        al.target_id,
        al.created_at
      ${baseQuery}
      ORDER BY al.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    const result = await db.query(selectQuery, [...params, limit, offset]);
    
    return {
      logs: result.rows,
      totalItems
    };
  },

};

module.exports = adminLogModel;