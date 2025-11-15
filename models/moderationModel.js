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

    if (status && status !== 'all') { params.push(status); where += ` AND r.status = $${params.length}`; }
    if (targetType && targetType !== 'all') { params.push(targetType); where += ` AND r.target_type = $${params.length}`; }
    if (search) { 
        params.push(`%${search}%`); 
        where += ` AND (r.reason ILIKE $${params.length} OR r.details ILIKE $${params.length} OR reporter.name ILIKE $${params.length})`; 
    }

    const baseQuery = `
      FROM "Reports" r
      -- Join với User để lấy thông tin người báo cáo
      LEFT JOIN "Users" reporter ON r.reporter_id = reporter.id
      -- Left Join với Posts, Comments, Users để lấy thông tin nội dung bị báo cáo
      LEFT JOIN "Posts" p ON r.target_id = p.id AND r.target_type = 'post'
      LEFT JOIN "Comments" c ON r.target_id = c.id AND r.target_type = 'comment'
      LEFT JOIN "Users" target_user ON r.target_id = target_user.id AND r.target_type = 'user'
      ${where}
    `;

    // --- Truy vấn đếm ---
    const countQuery = `SELECT COUNT(r.id) ${baseQuery};`;
    const totalResult = await db.query(countQuery, params);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    // --- Truy vấn lấy dữ liệu ---
    const selectQuery = `
      SELECT 
        r.*,
        
        -- Xây dựng object 'reporter'
        jsonb_build_object(
          'id', reporter.id,
          'name', reporter.name,
          'avatar_url', reporter.avatar_url,
          'email', reporter.email,
          'role', reporter.role
          -- Thêm các trường khác của reporter nếu cần
        ) as reporter,
        
        -- Xây dựng object 'targetContent' một cách linh hoạt
        CASE r.target_type
          WHEN 'post' THEN jsonb_build_object('id', p.id, 'title', p.title, 'content', p.content, 'author_id', p.user_id)
          WHEN 'comment' THEN jsonb_build_object('id', c.id, 'content', c.content, 'author_id', c.user_id, 'post_id', c.post_id)
          WHEN 'user' THEN jsonb_build_object('id', target_user.id, 'name', target_user.name, 'email', target_user.email)
          -- Các trường hợp 'bug', 'other' không có targetContent trong DB, trả về object chứa thông tin từ report
          ELSE jsonb_build_object('id', r.target_id, 'title', r.reason)
        END as "targetContent"
        
      ${baseQuery} 
      ORDER BY r.created_at DESC 
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    const reportsResult = await db.query(selectQuery, [...params, limit, offset]);
    return { reports: reportsResult.rows, totalItems };
  },

  

  findTargetAuthorId: async (targetType, targetId) => {
    let queryText = '';
    switch (targetType) {
      case 'post':
        queryText = `SELECT user_id FROM "Posts" WHERE id = $1;`;
        break;
      case 'comment':
        queryText = `SELECT user_id FROM "Comments" WHERE id = $1;`;
        break;
      case 'user':
        // Nếu đối tượng bị báo cáo là user, thì author chính là user đó
        return targetId; 
      default:
        // 'bug', 'other' không có tác giả
        return null;
    }
    const result = await db.query(queryText, [targetId]);
    return result.rows[0]?.user_id || null;
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
        -- Full user profile
        jsonb_build_object(
          'id', u.id,
          'username', u.username,
          'name', u.name,
          'avatar_url', u.avatar_url,
          'email', u.email,
          'role', u.role,
          'is_active', u.is_active,
          'isVerify', u."isVerify",
          'community_points', u.community_points,
          'level', u.level,
          'badge_level', u.badge_level,
          'language', u.language,
          'created_at', u.created_at,
          'last_login', u.last_login,
          'provider', u.provider
        ) as "user",
        -- Rule details
        (
          SELECT jsonb_agg(cr.*)
          FROM "ViolationRules" vr 
          JOIN "CommunityRules" cr ON vr.rule_id = cr.id
          WHERE vr.violation_id = v.id
        ) as rules,
        -- Target content snapshot
        CASE v.target_type
          WHEN 'post' THEN (
            SELECT jsonb_build_object(
              'id', p.id,
              'user_id', p.user_id,
              'title', p.title,
              'content', p.content,
              'topic', p.topic,
              'likes', p.likes,
              'views', p.views,
              'created_at', p.created_at,
              'status', p.status,
              'is_pinned', p.is_pinned,
              'is_approved', p.is_approved,
              'auto_flagged', p.auto_flagged,
              'deleted_at', p.deleted_at,
              'deleted_by', p.deleted_by,
              'deleted_reason', p.deleted_reason
            ) FROM "Posts" p WHERE p.id = v.target_id
          )
          WHEN 'comment' THEN (
            SELECT jsonb_build_object(
              'id', c.id,
              'post_id', c.post_id,
              'user_id', c.user_id,
              'content', jsonb_build_object('text', c.content->>'html'),
              'parent_comment_id', c.parent_comment_id,
              'created_at', c.created_at,
              'deleted_at', c.deleted_at,
              'deleted_by', c.deleted_by,
              'deleted_reason', c.deleted_reason
            ) FROM "Comments" c WHERE c.id = v.target_id
          )
          ELSE NULL
        END as "targetContent"
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

  findViolationsByUserDetailed: async (userId) => {
    const query = `
      SELECT 
        v.*,
        -- Full user profile for violator
        jsonb_build_object(
          'id', u.id,
          'username', u.username,
          'name', u.name,
          'avatar_url', u.avatar_url,
          'email', u.email,
          'role', u.role,
          'is_active', u.is_active,
          'isVerify', u."isVerify",
          'community_points', u.community_points,
          'level', u.level,
          'badge_level', u.badge_level,
          'language', u.language,
          'created_at', u.created_at,
          'last_login', u.last_login,
          'provider', u.provider
        ) as "user",
        -- Rules detailed
        (
          SELECT jsonb_agg(cr.*)
          FROM "ViolationRules" vr 
          JOIN "CommunityRules" cr ON vr.rule_id = cr.id
          WHERE vr.violation_id = v.id
        ) as rules,
        -- Target content snapshot (only for posts and comments)
        CASE v.target_type
          WHEN 'post' THEN (
            SELECT jsonb_build_object(
              'id', p.id,
              'user_id', p.user_id,
              'title', p.title,
              'content', p.content,
              'topic', p.topic,
              'likes', p.likes,
              'views', p.views,
              'created_at', p.created_at,
              'status', p.status,
              'is_pinned', p.is_pinned,
              'is_approved', p.is_approved,
              'auto_flagged', p.auto_flagged,
              'deleted_at', p.deleted_at,
              'deleted_by', p.deleted_by,
              'deleted_reason', p.deleted_reason
            ) FROM "Posts" p WHERE p.id = v.target_id
          )
          WHEN 'comment' THEN (
            SELECT jsonb_build_object(
              'id', c.id,
              'post_id', c.post_id,
              'user_id', c.user_id,
              'content', c.content,
              'created_at', c.created_at,
              'deleted_at', c.deleted_at,
              'deleted_by', c.deleted_by,
              'deleted_reason', c.deleted_reason
            ) FROM "Comments" c WHERE c.id = v.target_id
          )
          ELSE NULL
        END as "targetContent"
      FROM "Violations" v
      JOIN "Users" u ON v.user_id = u.id
      WHERE v.user_id = $1
      ORDER BY v.created_at DESC;
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
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
    if (search) { params.push(`%${search}%`); where += ` AND (a.reason ILIKELIKE $${params.length} OR u.name ILIKE $${params.length})`; }

    const baseQuery = `
      FROM "Appeals" a
      JOIN "Users" u ON a.user_id = u.id
      JOIN "Violations" v ON a.violation_id = v.id
      JOIN "Users" vu ON v.user_id = vu.id
      ${where}
    `;

    // --- Truy vấn đếm ---
    const countQuery = `SELECT COUNT(a.id) ${baseQuery};`;
    const totalResult = await db.query(countQuery, params);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    // --- Truy vấn lấy dữ liệu ---
    const selectQuery = `
      SELECT 
        a.id,
        a.violation_id,
        a.user_id,
        a.reason,
        a.status,
        a.created_at,
        a.resolved_at,
        a.resolved_by,
        a.notes,
        
        -- Xây dựng object 'user' (người khiếu nại)
        jsonb_build_object(
          'id', u.id,
          'name', u.name,
          'avatar_url', u.avatar_url,
          'email', u.email,
          'role', u.role,
          'level', u.level,
          'badge_level', u.badge_level,
          'community_points', u.community_points
        ) as user,
        
        -- Xây dựng object 'violation'
        jsonb_build_object(
          'id', v.id,
          'user_id', v.user_id,
          'target_type', v.target_type,
          'target_id', v.target_id,
          'severity', v.severity,
          'detected_by', v.detected_by,
          'handled', v.handled,
          'created_at', v.created_at,
          'resolved_at', v.resolved_at,
          'resolution', v.resolution,
          -- violator user object
          'user', jsonb_build_object(
            'id', vu.id,
            'username', vu.username,
            'name', vu.name,
            'avatar_url', vu.avatar_url,
            'email', vu.email,
            'role', vu.role,
            'is_active', vu.is_active,
            'isVerify', vu."isVerify",
            'community_points', vu.community_points,
            'level', vu.level,
            'badge_level', vu.badge_level,
            'language', vu.language,
            'created_at', vu.created_at,
            'last_login', vu.last_login,
            'provider', vu.provider
          ),
          
          -- Subquery để lấy các luật liên quan đến vi phạm
          'rules', (
            SELECT jsonb_agg(cr.*)
            FROM "ViolationRules" vr
            JOIN "CommunityRules" cr ON vr.rule_id = cr.id
            WHERE vr.violation_id = v.id
          ),
          
          -- Subquery để lấy 'targetContent' của vi phạm
          'targetContent', (
            CASE v.target_type
              WHEN 'post' THEN (
                SELECT jsonb_build_object(
                  'id', p.id,
                  'user_id', p.user_id,
                  'title', p.title,
                  'content', jsonb_build_object(
                    'html', COALESCE(p.content->>'html', p.content->>'content'),
                    'text', COALESCE(p.content->>'text', regexp_replace(COALESCE(p.content->>'html', p.content->>'content'), '<[^>]*>', '', 'g')),
                    'images', COALESCE((p.content->'images')::jsonb, '[]'::jsonb)
                  ),
                  'topic', p.topic,
                  'likes', p.likes,
                  'views', p.views,
                  'created_at', p.created_at,
                  'status', p.status,
                  'is_pinned', p.is_pinned,
                  'is_approved', p.is_approved,
                  'auto_flagged', p.auto_flagged,
                  'deleted_at', p.deleted_at,
                  'deleted_by', p.deleted_by,
                  'deleted_reason', p.deleted_reason
                ) FROM "Posts" p WHERE p.id = v.target_id
              )
              WHEN 'comment' THEN (
                SELECT jsonb_build_object(
                  'id', c.id,
                  'post_id', c.post_id,
                  'user_id', c.user_id,
                  'content', jsonb_build_object('text', c.content->>'html'),
                  'parent_comment_id', c.parent_comment_id,
                  'created_at', c.created_at,
                  'deleted_at', c.deleted_at,
                  'deleted_by', c.deleted_by,
                  'deleted_reason', c.deleted_reason
                ) FROM "Comments" c WHERE c.id = v.target_id
              )
              WHEN 'user' THEN (
                SELECT jsonb_build_object(
                  'id', target_u.id,
                  'username', target_u.username,
                  'name', target_u.name,
                  'avatar_url', target_u.avatar_url,
                  'email', target_u.email,
                  'role', target_u.role,
                  'is_active', target_u.is_active,
                  'isVerify', target_u."isVerify",
                  'community_points', target_u.community_points,
                  'level', target_u.level,
                  'badge_level', target_u.badge_level,
                  'language', target_u.language,
                  'created_at', target_u.created_at,
                  'last_login', target_u.last_login,
                  'provider', target_u.provider
                ) FROM "Users" target_u WHERE target_u.id = v.target_id
              )
              ELSE jsonb_build_object('id', v.target_id)
            END
          )
        ) as violation
        
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
  },












  /**
   * --- HÀM HELPER TẬP TRUNG ---
   * Tạo một bản ghi Vi phạm cho người dùng với đầy đủ thông tin.
   * Đây là hàm "lõi" có thể được gọi từ nhiều nơi.
   *
   * @param {object} violationInput - Dữ liệu đầu vào để tạo vi phạm.
   * @param {string} violationInput.userId - ID của người dùng vi phạm.
   * @param {string} violationInput.targetType - Loại nội dung ('post', 'comment', 'user').
   * @param {string} violationInput.targetId - ID của nội dung vi phạm.
   * @param {string} violationInput.severity - Mức độ vi phạm ('low', 'medium', 'high').
   * @param {string[]} violationInput.ruleIds - Mảng các ID của luật đã vi phạm.
   * @param {string} violationInput.detectedBy - Người phát hiện ('admin', 'auto_ai').
   * @param {string} violationInput.resolution - Ghi chú/hành động xử lý.
   * @param {string} [violationInput.relatedReportId] - (Tùy chọn) ID của báo cáo liên quan.
   *
   * @returns {Promise<object>} Bản ghi Violation vừa được tạo.
   */

  createViolationAuto: async (violationInput) => {
    // 1. Validation đầu vào
    const { userId, targetType, targetId, severity, ruleIds, detectedBy, resolution } = violationInput;
    if (!userId || !targetType || !targetId || !severity || !ruleIds || !detectedBy || !resolution) {
      throw new Error("Dữ liệu đầu vào để tạo vi phạm không đầy đủ.");
    }

    // 2. Chuẩn bị dữ liệu để chèn vào DB
    const violationData = {
      user_id: userId,
      target_type: targetType,
      target_id: targetId,
      severity: severity,
      detected_by: detectedBy,
      handled: true, // Khi tạo vi phạm, mặc định là đã xử lý
      resolution: resolution,
    };

    // 3. Gọi model để thực hiện tạo trong transaction
    const newViolation = await moderationModel.createViolationWithRules(violationData, ruleIds);
    if (!newViolation) {
        throw new Error("Tạo vi phạm trong database thất bại.");
    }
    
    // 4. (Tùy chọn) Liên kết vi phạm với báo cáo nếu có
    if (violationInput.relatedReportId) {
        await moderationModel.linkViolationToReport(violationInput.relatedReportId, newViolation.id);
    }

    // 5. (Tùy chọn) Thực hiện các hành động sau khi tạo vi phạm
    // Ví dụ: Gửi thông báo đến người dùng, trừ điểm, v.v.
    // await notificationService.sendViolationNotification(userId, newViolation);
    // await userService.deductCommunityPoints(userId, severity);

    return newViolation;
  },
  
  /**
   * Cập nhật hàm updateReportStatus để sử dụng hàm helper mới.
  //  */
  // updateReportStatus: async (reportId, payload, adminId) => {
  //   // 1. Cập nhật trạng thái báo cáo
  //   const reportUpdateData = { /* ... */ };
  //   const updatedReport = await moderationModel.updateReportStatus(reportId, reportUpdateData);
  //   if (!updatedReport) throw new Error("Không tìm thấy báo cáo.");
    
  //   // 2. Logic tạo vi phạm tự động
  //   if (payload.status === 'resolved' && payload.violation_details) {
  //     const targetAuthorId = await moderationModel.findTargetAuthorId(updatedReport.target_type, updatedReport.target_id);

  //     if (targetAuthorId) {
  //       // Gọi hàm helper tập trung
  //       const newViolation = await moderationService.createViolationForUser({
  //           userId: targetAuthorId,
  //           targetType: updatedReport.target_type,
  //           targetId: updatedReport.target_id,
  //           severity: payload.violation_details.severity,
  //           ruleIds: payload.violation_details.rules,
  //           detectedBy: 'admin',
  //           resolution: payload.resolution,
  //           relatedReportId: reportId // Truyền ID báo cáo để liên kết
  //       });
  //       updatedReport.related_violation_id = newViolation.id;
  //     }
  //   }
  //   return updatedReport;
  // },


  findReportById: async (reportId) => {
    const query = `
      SELECT 
        r.*,
        CASE
          WHEN r.target_type = 'post' THEN p.user_id
          WHEN r.target_type = 'comment' THEN c.user_id
          WHEN r.target_type = 'user' THEN r.target_id
          ELSE NULL
        END as target_user_id
      FROM "Reports" r
      LEFT JOIN "Posts" p ON r.target_id = p.id AND r.target_type = 'post'
      LEFT JOIN "Comments" c ON r.target_id = c.id AND r.target_type = 'comment'
      WHERE r.id = $1;
    `;
    const result = await db.query(query, [reportId]);
    return result.rows[0];
  },


  updateReportStatus: async (reportId, data) => {
    const { status, resolved_by, resolution } = data;
    const query = `
      UPDATE "Reports" 
      SET 
        status = $1, 
        resolved_by = $2, 
        resolution = $3, 
        resolved_at = CURRENT_TIMESTAMP, 
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 
      RETURNING *;`;
    const result = await db.query(query, [status, resolved_by, resolution, reportId]);
    return result.rows[0];
  },

  createViolation: async (violationData) => {
    const { user_id, target_type, target_id, severity, detected_by, handled, resolution } = violationData;
    const query = `
      INSERT INTO "Violations" (user_id, target_type, target_id, severity, detected_by, handled, resolution, resolved_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const values = [user_id, target_type, target_id, severity, detected_by, handled, resolution];
    const result = await db.query(query, values);
    return result.rows[0];
  },


  linkViolationToReport: async (reportId, violationId) => {
    const query = `UPDATE "Reports" SET related_violation_id = $1 WHERE id = $2;`;
    await db.query(query, [violationId, reportId]);
  },





};

module.exports = moderationModel;

