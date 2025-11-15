// file: models/communityModel.js

const db = require('../config/db');

const communityModel = {
getDashboardStats: async () => {
    // Định nghĩa các câu truy vấn
    const publishedPostCountQuery = `
      SELECT COUNT(*) FROM "Posts" 
      WHERE status = 'published' AND deleted_at IS NULL;
    `;
    
    const activeCommentCountQuery = `
      SELECT COUNT(*) FROM "Comments" 
      WHERE deleted_at IS NULL;
    `;

    // "Nội dung đã gỡ" có thể hiểu là tổng số bài viết và bình luận có status = 'removed' hoặc bị xóa mềm.
    // Cách tiếp cận 1: Đếm các bản ghi có status = 'removed' (do admin gỡ)
        const removedPostCountQuery = `
      SELECT COUNT(*) FROM "Posts" WHERE status = 'removed';
    `;
    
    // Câu truy vấn để đếm số bình luận đã gỡ
    const removedCommentCountQuery = `
      SELECT COUNT(*) FROM "Comments" WHERE deleted_by IS NOT NULL;
    `;


    // Thực hiện các truy vấn song song để tăng hiệu suất
    // Chúng ta sẽ dùng Cách 2 vì nó có thể chính xác hơn và nhanh hơn
    const [
      postCountRes, 
      commentCountRes, 
      removedPostCountRes,
      removedCommentCountRes
    ] = await Promise.all([
      db.query(publishedPostCountQuery),
      db.query(activeCommentCountQuery),
      db.query(removedPostCountQuery),
      db.query(removedCommentCountQuery)
    ]);

    // Lấy kết quả từ mỗi truy vấn
    const removedPostCount = parseInt(removedPostCountRes.rows[0].count, 10);
    const removedCommentCount = parseInt(removedCommentCountRes.rows[0].count, 10);

    // Cộng kết quả lại trong code JavaScript
    const totalRemovedContent = removedPostCount + removedCommentCount;

    return {
      // Số lượng Bài viết (Đã đăng)
      postCount: parseInt(postCountRes.rows[0].count, 10),
      
      // Số lượng Bình luận (Hoạt động)
      commentCount: parseInt(commentCountRes.rows[0].count, 10),
      
      // Số lượng Nội dung đã gỡ
      moderationCount: totalRemovedContent
    };
  },


  findModerationLogs: async ({ limit, offset }) => {
    // Truy vấn đếm tổng số bản ghi
    const countQuery = `SELECT COUNT(*) FROM "ModerationLogs";`;
    const totalResult = await db.query(countQuery);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    // Truy vấn lấy dữ liệu chi tiết
    const selectQuery = `
      SELECT 
        ml.id,
        ml.target_type,
        ml.target_id,
        ml.action,
        ml.reason,
        ml.performed_by,
        ml.created_at,
        
        -- Lấy tên của admin nếu performed_by là một UUID hợp lệ,
        -- nếu không thì trả về chính giá trị performed_by (ví dụ: 'auto_ai')
        COALESCE(u.name, ml.performed_by::text) as performed_by_name
        
      FROM "ModerationLogs" ml
      -- Dùng LEFT JOIN để không bị mất các log có performed_by là 'auto_ai'
      LEFT JOIN "Users" u ON ml.performed_by = u.id
      
      ORDER BY ml.created_at DESC
      LIMIT $1
      OFFSET $2;
    `;
    const logsResult = await db.query(selectQuery, [limit, offset]);
    
    return { logs: logsResult.rows, totalItems };
  },

  findModerationLogsByUserContent: async (userId, { limit, offset }) => {
    // Logs for posts owned by the given user
    const countQuery = `
      SELECT COUNT(*)
      FROM "ModerationLogs" ml
      JOIN "Posts" p ON ml.target_type = 'post' AND ml.target_id = p.id
      WHERE p.user_id = $1;
    `;
    const totalResult = await db.query(countQuery, [userId]);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    const selectQuery = `
      SELECT 
        ml.id,
        ml.target_type,
        ml.target_id,
        ml.action,
        ml.reason,
        ml.performed_by,
        ml.created_at
      FROM "ModerationLogs" ml
      JOIN "Posts" p ON ml.target_type = 'post' AND ml.target_id = p.id
      WHERE p.user_id = $1
      ORDER BY ml.created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const logsResult = await db.query(selectQuery, [userId, limit, offset]);
    return { logs: logsResult.rows, totalItems };
  },

  createModerationLog: async (logData) => {
    const {
      target_type,
      target_id,
      action,
      reason,
      performed_by,
    } = logData;

    const queryText = `
      INSERT INTO "ModerationLogs" (target_type, target_id, action, reason, performed_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [target_type, target_id, action, reason, performed_by];
    const result = await db.query(queryText, values);
    return result.rows[0];
  },


};

module.exports = communityModel;

