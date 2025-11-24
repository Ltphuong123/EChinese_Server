// file: config/communityPoints.js
// Cấu hình điểm thưởng cho các hoạt động cộng đồng

const COMMUNITY_POINTS = {
  // Hoạt động tạo nội dung
  POST_CREATED: 5,           // Tạo bài viết mới
  COMMENT_CREATED: 2,        // Tạo bình luận
  
  // Hoạt động tương tác
  POST_LIKED: 1,             // Bài viết được like (người nhận)
  COMMENT_LIKED: 1,          // Bình luận được like (người nhận) - TODO: chưa implement
  
  // Hoạt động đặc biệt
  POST_PINNED: 10,           // Bài viết được ghim bởi admin - TODO
  BEST_ANSWER: 15,           // Bình luận được chọn là câu trả lời hay nhất - TODO
  
  // Hình phạt (số âm)
  POST_REMOVED: -5,          // Bài viết bị gỡ do vi phạm
  COMMENT_REMOVED: -2,       // Bình luận bị gỡ do vi phạm
  VIOLATION_WARNING: -10,    // Nhận cảnh báo vi phạm - TODO
  VIOLATION_BAN: -50,        // Bị cấm do vi phạm nghiêm trọng - TODO
};

module.exports = COMMUNITY_POINTS;
