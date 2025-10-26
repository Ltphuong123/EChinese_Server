// file: models/communityModel.js

const db = require('../config/db');

const communityModel = {
  getDashboardStats: async () => {
    // Thực hiện các truy vấn đếm song song để tăng hiệu suất
    const [postCountRes, commentCountRes, moderationCountRes] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM "Posts" WHERE deleted_at IS NULL AND status = 'published'`),
      db.query(`SELECT COUNT(*) FROM "Comments" WHERE deleted_at IS NULL`),
      db.query(`SELECT COUNT(*) FROM "ModerationLogs"`)
    ]);

    return {
      postCount: parseInt(postCountRes.rows[0].count, 10),
      commentCount: parseInt(commentCountRes.rows[0].count, 10),
      moderationCount: parseInt(moderationCountRes.rows[0].count, 10),
    };
  },
  findModerationLogs: async ({ limit, offset }) => {
    // Truy vấn đếm
    const countQuery = `SELECT COUNT(*) FROM "ModerationLogs";`;
    const totalResult = await db.query(countQuery);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    // Truy vấn lấy dữ liệu, join với Users để lấy tên người thực hiện
    const selectQuery = `
      SELECT 
        ml.*,
        u.name as performed_by_name
      FROM "ModerationLogs" ml
      JOIN "Users" u ON ml.performed_by = u.id
      ORDER BY ml.created_at DESC
      LIMIT $1
      OFFSET $2;
    `;
    const logsResult = await db.query(selectQuery, [limit, offset]);
    
    return { logs: logsResult.rows, totalItems };
  },
};

module.exports = communityModel;

