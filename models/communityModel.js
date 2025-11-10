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

