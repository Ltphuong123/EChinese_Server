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

  // Helper: find recent notifications to prevent duplicates
  findRecent: async (recipientId, type, withinSeconds = 2) => {
    const queryText = `
      SELECT * FROM "Notifications"
      WHERE recipient_id = $1
        AND type = $2
        AND created_at > NOW() - INTERVAL '${withinSeconds} seconds'
      ORDER BY created_at DESC;
    `;
    const result = await db.query(queryText, [recipientId, type]);
    return result.rows;
  },

  /**
   * Lấy chi tiết một thông báo cụ thể
   * @param {string} notificationId - ID của thông báo
   * @param {string} userId - ID của user đang xem
   * @returns {object} Thông tin chi tiết thông báo
   */
  findById: async (notificationId, userId) => {
    const queryText = `
      SELECT 
        n.*,
        sender.id as sender_id,
        sender.username as sender_username,
        sender.name as sender_name,
        sender.email as sender_email,
        sender.avatar_url as sender_avatar,
        recipient.id as recipient_id,
        recipient.username as recipient_username,
        recipient.name as recipient_name,
        recipient.email as recipient_email,
        recipient.avatar_url as recipient_avatar
      FROM "Notifications" n
      LEFT JOIN "Users" sender ON n.created_by = sender.id
      LEFT JOIN "Users" recipient ON n.recipient_id = recipient.id
      WHERE n.id = $1
        AND (
          n.recipient_id = $2 OR 
          n.audience = 'all' OR 
          (n.audience = 'admin' AND $2 IN (SELECT id FROM "Users" WHERE role IN ('admin', 'super admin')))
        );
    `;
    
    const result = await db.query(queryText, [notificationId, userId]);
    return result.rows[0] || null;
  },

  /**
   * Xóa tất cả thông báo trong database
   * @returns {number} Số lượng thông báo đã xóa
   */
  deleteAll: async () => {
    const queryText = `DELETE FROM "Notifications";`;
    const result = await db.query(queryText);
    return result.rowCount;
  },

  /**
   * Lấy thông tin các cột trong bảng Notifications
   * @returns {array} Danh sách các cột với thông tin chi tiết
   */
  getTableColumns: async () => {
    const queryText = `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'Notifications'
      ORDER BY ordinal_position;
    `;
    const result = await db.query(queryText);
    return result.rows;
  },

  /**
   * Lấy danh sách thông báo đã tạo của admin
   * @param {string} adminId - ID của admin
   * @param {object} options - { page, limit, status, audience, type }
   * @returns {object} { notifications, totalItems }
   */
  findAdminSentNotifications: async (adminId, options) => {
    const { page = 1, limit = 15, status, audience, type } = options;
    const offset = (page - 1) * limit;

    // Build WHERE clauses
    let whereClauses = `WHERE n.created_by = $1`;
    const queryParams = [adminId];
    let paramIndex = 2;

    // Filter by status (draft = chưa gửi push, published = đã gửi push)
    if (status === 'draft') {
      whereClauses += ` AND n.is_push_sent = false`;
    } else if (status === 'published') {
      whereClauses += ` AND n.is_push_sent = true`;
    }

    // Filter by audience
    if (audience) {
      whereClauses += ` AND n.audience = $${paramIndex}`;
      queryParams.push(audience);
      paramIndex++;
    }

    // Filter by type
    if (type) {
      whereClauses += ` AND n.type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    // Lấy thông báo đã GỬI (created_by = adminId)
    const sentQuery = `
      SELECT 
        n.*,
        u.username as recipient_username,
        u.name as recipient_name,
        u.email as recipient_email,
        u.avatar_url as recipient_avatar
      FROM "Notifications" n
      LEFT JOIN "Users" u ON n.recipient_id = u.id
      ${whereClauses}
      ORDER BY n.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;
    const sentResult = await db.query(sentQuery, [...queryParams, limit, offset]);

    // Đếm tổng số thông báo đã gửi
    const sentCountQuery = `
      SELECT COUNT(*) FROM "Notifications" n
      ${whereClauses};
    `;
    const sentCountResult = await db.query(sentCountQuery, queryParams);
    const totalItems = parseInt(sentCountResult.rows[0].count, 10);

    return {
      notifications: sentResult.rows,
      totalItems
    };
  },

  /**
   * Lấy danh sách thông báo đã tạo của admin
   * @param {string} adminId - ID của admin
   * @param {object} options - { page, limit, status, audience, type }
   * @returns {object} { notifications, totalItems }
   */
  findAdminSentNotifications: async (adminId, options) => {
    const { page = 1, limit = 15, status, audience, type } = options;
    const offset = (page - 1) * limit;

    // Build WHERE clauses
    let whereClauses = `WHERE n.created_by = $1`;
    const queryParams = [adminId];
    let paramIndex = 2;

    // Filter by status (draft = chưa gửi push, published = đã gửi push)
    if (status === 'draft') {
      whereClauses += ` AND n.is_push_sent = false`;
    } else if (status === 'published') {
      whereClauses += ` AND n.is_push_sent = true`;
    }

    // Filter by audience
    if (audience) {
      whereClauses += ` AND n.audience = $${paramIndex}`;
      queryParams.push(audience);
      paramIndex++;
    }

    // Filter by type
    if (type) {
      whereClauses += ` AND n.type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    // Lấy thông báo đã GỬI (created_by = adminId)
    const sentQuery = `
      SELECT 
        n.*,
        u.username as recipient_username,
        u.name as recipient_name,
        u.email as recipient_email,
        u.avatar_url as recipient_avatar
      FROM "Notifications" n
      LEFT JOIN "Users" u ON n.recipient_id = u.id
      ${whereClauses}
      ORDER BY n.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;
    const sentResult = await db.query(sentQuery, [...queryParams, limit, offset]);

    // Đếm tổng số thông báo đã gửi
    const sentCountQuery = `
      SELECT COUNT(*) FROM "Notifications" n
      ${whereClauses};
    `;
    const sentCountResult = await db.query(sentCountQuery, queryParams);
    const totalItems = parseInt(sentCountResult.rows[0].count, 10);

    return {
      notifications: sentResult.rows,
      totalItems
    };
  },

  /**
   * Lấy danh sách thông báo đã nhận của admin
   * @param {string} adminId - ID của admin
   * @param {object} options - { page, limit, readStatus, type }
   * @returns {object} { notifications, totalItems }
   */
  findAdminReceivedNotifications: async (adminId, options) => {
    const { page = 1, limit = 15, readStatus, type } = options;
    const offset = (page - 1) * limit;

    // Build WHERE clauses
    let whereClauses = `
      WHERE (
        n.recipient_id = $1 OR 
        n.audience = 'admin' OR 
        n.audience = 'all'
      )
      AND (n.expires_at IS NULL OR n.expires_at > NOW())
    `;

    const queryParams = [adminId];
    let paramIndex = 2;

    // Filter by read status (chỉ chấp nhận 'read' hoặc 'unread')
    if (readStatus === 'read') {
      whereClauses += ` AND n.read_at IS NOT NULL`;
    } else if (readStatus === 'unread') {
      whereClauses += ` AND n.read_at IS NULL`;
    }

    // Filter by type
    if (type) {
      whereClauses += ` AND n.type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    // Lấy thông báo đã NHẬN
    const receivedQuery = `
      SELECT 
        n.*,
        sender.username as sender_username,
        sender.name as sender_name,
        sender.email as sender_email,
        sender.avatar_url as sender_avatar
      FROM "Notifications" n
      LEFT JOIN "Users" sender ON n.created_by = sender.id
      ${whereClauses}
      ORDER BY n.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;
    const receivedResult = await db.query(receivedQuery, [...queryParams, limit, offset]);

    // Đếm tổng số thông báo đã nhận
    const receivedCountQuery = `
      SELECT COUNT(*) FROM "Notifications" n
      ${whereClauses};
    `;
    const receivedCountResult = await db.query(receivedCountQuery, queryParams);
    const totalItems = parseInt(receivedCountResult.rows[0].count, 10);

    return {
      notifications: receivedResult.rows,
      totalItems
    };
  },

};


module.exports = notificationModel;