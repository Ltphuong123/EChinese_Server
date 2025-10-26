const db = require('../config/db');

const moderationModel = {
  // --- Reports ---
  createReport: async (data) => {
    const { reporter_id, target_type, target_id, reason, details } = data;
    const query = `INSERT INTO "Reports" (reporter_id, target_type, target_id, reason, details) VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
    const result = await db.query(query, [reporter_id, target_type, target_id, reason, details]);
    return result.rows[0];
  },

  findReports: async (filters) => {
    const { limit, offset, search, status, targetType } = filters;
    let where = `WHERE 1=1`;
    const params = [];

    if (status && status !== 'all') { params.push(status); where += ` AND status = $${params.length}`; }
    if (targetType && targetType !== 'all') { params.push(targetType); where += ` AND target_type = $${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (reason ILIKE $${params.length} OR details ILIKE $${params.length})`; }

    const countQuery = `SELECT COUNT(*) FROM "Reports" ${where};`;
    const totalResult = await db.query(countQuery, params);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    const selectQuery = `SELECT * FROM "Reports" ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
    const reportsResult = await db.query(selectQuery, [...params, limit, offset]);
    return { reports: reportsResult.rows, totalItems };
  },

  updateReportStatus: async (reportId, data) => {
    const { status, resolved_by, resolution } = data;
    const query = `UPDATE "Reports" SET status = $1, resolved_by = $2, resolution = $3, resolved_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *;`;
    const result = await db.query(query, [status, resolved_by, resolution, reportId]);
    return result.rows[0];
  },
  
  // --- Violations ---
  findViolations: async (filters) => {
    const { limit, offset, search, severity, targetType } = filters;
    
    const queryParams = [];
    let whereClauses = 'WHERE 1=1';

    if (severity && severity !== 'all') {
      queryParams.push(severity);
      whereClauses += ` AND v.severity = $${queryParams.length}`;
    }
    if (targetType && targetType !== 'all') {
      queryParams.push(targetType);
      whereClauses += ` AND v.target_type = $${queryParams.length}`;
    }
    if (search) {
      // Tìm kiếm theo ID người dùng, ID mục tiêu, hoặc lý do giải quyết
      queryParams.push(`%${search}%`);
      whereClauses += ` AND (v.user_id::text ILIKE $${queryParams.length} OR v.target_id::text ILIKE $${queryParams.length} OR v.resolution ILIKE $${queryParams.length})`;
    }

    const baseQuery = `
      FROM "Violations" v
      LEFT JOIN "Users" u ON v.user_id = u.id
      ${whereClauses}
    `;

    // Truy vấn đếm
    const countQuery = `SELECT COUNT(v.id) ${baseQuery}`;
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    // Truy vấn lấy dữ liệu
    const selectQuery = `
      SELECT 
        v.*,
        u.name as user_name,
        (
          SELECT json_agg(cr.title) 
          FROM "ViolationRules" vr 
          JOIN "CommunityRules" cr ON vr.rule_id = cr.id
          WHERE vr.violation_id = v.id
        ) as rules
      ${baseQuery}
      ORDER BY v.created_at DESC
      LIMIT $${queryParams.length + 1}
      OFFSET $${queryParams.length + 2};
    `;
    
    const violationsResult = await db.query(selectQuery, [...queryParams, limit, offset]);
    return { violations: violationsResult.rows, totalItems };
  },

  createViolationWithRules: async (violationData, ruleIds) => {
    const { user_id, target_type, target_id, severity, detected_by, handled, resolution } = violationData;
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Thao tác 1: Tạo bản ghi Violation chính
      const violationQuery = `
        INSERT INTO "Violations" (user_id, target_type, target_id, severity, detected_by, handled, resolution, resolved_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        RETURNING *;
      `;
      const violationResult = await client.query(violationQuery, [
        user_id, target_type, target_id, severity, detected_by, handled, resolution
      ]);
      const newViolation = violationResult.rows[0];

      // Thao tác 2: Tạo các liên kết trong bảng ViolationRules
      if (ruleIds && ruleIds.length > 0) {
        const violationRulesQuery = `
          INSERT INTO "ViolationRules" (violation_id, rule_id)
          SELECT $1, unnest($2::uuid[]);
        `;
        await client.query(violationRulesQuery, [newViolation.id, ruleIds]);
      }

      await client.query('COMMIT');

      // Trả về violation cùng với mảng ruleIds để tiện cho frontend
      return { ...newViolation, rules: ruleIds };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Lỗi transaction khi tạo violation:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  deleteViolation: async (violationId) => {
    const query = `DELETE FROM "Violations" WHERE id = $1;`;
    const result = await db.query(query, [violationId]);
    return result.rowCount;
  },

  
  // --- Appeals ---
   createAppeal: async (data) => {
    const { violation_id, user_id, reason, violation_snapshot } = data;
    const query = `INSERT INTO "Appeals" (violation_id, user_id, reason, violation_snapshot) VALUES ($1, $2, $3, $4) RETURNING *;`;
    const result = await db.query(query, [violation_id, user_id, reason, violation_snapshot]);
    return result.rows[0];
  },

  findAppealsByUserId: async (userId, { limit, offset }) => {
    const where = `WHERE user_id = $1`;
    const countQuery = `SELECT COUNT(*) FROM "Appeals" ${where};`;
    const totalResult = await db.query(countQuery, [userId]);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    const selectQuery = `SELECT * FROM "Appeals" ${where} ORDER BY created_at DESC LIMIT $2 OFFSET $3;`;
    const appealsResult = await db.query(selectQuery, [userId, limit, offset]);
    return { appeals: appealsResult.rows, totalItems };
  },

  findAllAppeals: async (filters) => {
    const { limit, offset, search, status } = filters;
    let where = `WHERE 1=1`;
    const params = [];

    if (status && status !== 'all') { params.push(status); where += ` AND a.status = $${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND (a.reason ILIKE $${params.length} OR u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`; }

    const baseQuery = `
      FROM "Appeals" a
      JOIN "Users" u ON a.user_id = u.id
      ${where}
    `;

    const countQuery = `SELECT COUNT(a.id) ${baseQuery};`;
    const totalResult = await db.query(countQuery, params);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    const selectQuery = `
      SELECT a.*, u.name as user_name, u.avatar_url as user_avatar 
      ${baseQuery} 
      ORDER BY a.created_at DESC 
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;
    const appealsResult = await db.query(selectQuery, [...params, limit, offset]);
    return { appeals: appealsResult.rows, totalItems };
  },

  findAppealById: async (appealId) => {
    const query = `
      SELECT a.*, u.name as user_name, u.avatar_url as user_avatar
      FROM "Appeals" a
      JOIN "Users" u ON a.user_id = u.id
      WHERE a.id = $1;
    `;
    const result = await db.query(query, [appealId]);
    return result.rows[0];
  },

  processAppeal: async (appealId, data) => {
    const { status, resolved_by, notes } = data;
    const query = `
      UPDATE "Appeals" 
      SET status = $1, resolved_by = $2, notes = $3, resolved_at = CURRENT_TIMESTAMP 
      WHERE id = $4 RETURNING *;
    `;
    const result = await db.query(query, [status, resolved_by, notes, appealId]);
    return result.rows[0];
  },
  
  /**
   * Tìm một Violation theo ID (dùng để lấy snapshot).
   */
  findViolationById: async (violationId) => {
    const query = `SELECT * FROM "Violations" WHERE id = $1;`;
    const result = await db.query(query, [violationId]);
    return result.rows[0];
  },

  logAction: async (logData) => {
      const { target_type, target_id, action, reason, performed_by } = logData;
      const query = `INSERT INTO "ModerationLogs" (target_type, target_id, action, reason, performed_by) VALUES ($1, $2, $3, $4, $5);`;
      await db.query(query, [target_type, target_id, action, reason, performed_by]);
  }


};

module.exports = moderationModel;

