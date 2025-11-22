API Specification - GET /community/posts
Endpoint:
GET /api/community/posts
📥 REQUEST
Headers:
Authorization: Bearer <token>
Query Parameters:
| Parameter | Type | Required | Default | Description | |-----------|------|----------|---------|-------------| | page | number | No | 1 | Số trang hiện tại | | limit | number | No | 15 | Số bài viết mỗi trang (tối đa 100) | | topic | string | No | - | Lọc theo chủ đề (không gửi nếu "all") | | status | string | No | "published" | Lọc theo trạng thái: "published", "removed", "draft", "pending", "all" |

Request Examples:
1. Lấy trang đầu tiên (mặc định):
GET /api/community/posts
2. Lấy trang 2 với 20 bài viết:
GET /api/community/posts?page=2&limit=20
3. Lọc theo chủ đề:
GET /api/community/posts?page=1&limit=15&topic=learning_tips
4. Lọc theo trạng thái:
GET /api/community/posts?page=1&limit=15&status=published
5. Kết hợp nhiều filter:
GET /api/community/posts?page=1&limit=15&topic=grammar&status=published
📤 RESPONSE
Success Response (200 OK):
{
  "data": [
    {
      "id": "p123",
      "user_id": "user_456",
      "title": "Chia sẻ kinh nghiệm học tiếng Trung",
      "content": {
        "html": "<p>Hôm nay mình muốn chia sẻ...</p>",
        "text": "Hôm nay mình muốn chia sẻ...",
        "images": ["https://example.com/image1.jpg"]
      },
      "topic": "learning_tips",
      "status": "published",
      "is_pinned": false,
      "is_approved": true,
      "auto_flagged": false,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "deleted_at": null,
      "deleted_by": null,
      "deleted_reason": null,
      "likes": 15,
      "views": 120,
      "comment_count": 8,
      "user": {
        "id": "user_456",
        "username": "nguyenvana",
        "name": "Nguyễn Văn A",
        "avatar_url": "https://example.com/avatar.jpg",
        "email": "user@example.com",
        "role": "user",
        "is_active": true,
        "isVerify": true,
        "community_points": 1500,
        "level": 5,
        "badge_level": 3,
        "language": "vi",
        "created_at": "2024-01-01T00:00:00Z",
        "last_login": "2024-01-15T09:00:00Z",
        "provider": "local"
      },
      "badge": {
        "id": "badge_3",
        "level": 3,
        "name": "Chuyên gia",
        "icon": "🏆",
        "min_points": 1000,
        "rule_description": "Đạt 1000 điểm cộng đồng",
        "is_active": true
      },
      "isLiked": true,
      "isCommented": false,
      "isViewed": true
    }
  ],
  "meta": {
    "total": 156,
    "page": 1,
    "limit": 15,
    "totalPages": 11
  }
}
Response Fields:
Root Level:
| Field | Type | Description | |-------|------|-------------| | data | array | Mảng các bài viết (Post[]) | | meta | object | Metadata về pagination |

Post Object:
| Field | Type | Description | |-------|------|-------------| | id | string | ID duy nhất của bài viết | | user_id | string | ID của tác giả | | title | string | Tiêu đề bài viết | | content | object | Nội dung bài viết (html, text, images) | | topic | string | Chủ đề bài viết | | status | string | Trạng thái: "published", "removed", "draft", "pending" | | is_pinned | boolean | Bài viết có được ghim không | | is_approved | boolean | Bài viết đã được duyệt chưa | | auto_flagged | boolean | Bài viết bị AI đánh dấu vi phạm | | created_at | string (ISO) | Thời gian tạo | | updated_at | string (ISO) | Thời gian cập nhật | | deleted_at | string/null | Thời gian xóa (nếu có) | | deleted_by | string/null | ID người xóa (nếu có) | | deleted_reason | string/null | Lý do xóa (nếu có) | | likes | number | Số lượt thích | | views | number | Số lượt xem | | comment_count | number | Số lượng bình luận | | user | object | Thông tin tác giả (User object) | | badge | object | Huy hiệu của tác giả (Badge object) | | isLiked | boolean | User hiện tại đã like chưa | | isCommented | boolean | User hiện tại đã comment chưa | | isViewed | boolean | User hiện tại đã xem chưa |

User Object (Tác giả):
| Field | Type | Description | |-------|------|-------------| | id | string | ID người dùng | | username | string | Tên đăng nhập | | name | string | Tên hiển thị | | avatar_url | string | URL avatar | | email | string | Email | | role | string | Vai trò: "user", "admin", "super admin" | | is_active | boolean | Tài khoản có hoạt động không | | isVerify | boolean | Email đã xác thực chưa | | community_points | number | Điểm cộng đồng | | level | number | Cấp độ người dùng | | badge_level | number | Cấp độ huy hiệu | | language | string | Ngôn ngữ: "vi", "en", "zh" | | created_at | string (ISO) | Ngày tạo tài khoản | | last_login | string (ISO) | Lần đăng nhập cuối | | provider | string | Nhà cung cấp: "local", "google", "facebook" |

Badge Object:
| Field | Type | Description | |-------|------|-------------| | id | string | ID huy hiệu | | level | number | Cấp độ huy hiệu (1-5) | | name | string | Tên huy hiệu | | icon | string | Icon emoji | | min_points | number | Điểm tối thiểu để đạt | | rule_description | string | Mô tả quy tắc | | is_active | boolean | Huy hiệu có hoạt động không |

Meta Object:
| Field | Type | Description | |-------|------|-------------| | total | number | Tổng số bài viết (sau khi filter) | | page | number | Trang hiện tại | | limit | number | Số bài viết mỗi trang | | totalPages | number | Tổng số trang |

🎯 Topics (Chủ đề)
'learning_tips'    // Mẹo học tập
'grammar'          // Ngữ pháp
'vocabulary'       // Từ vựng
'pronunciation'    // Phát âm
'culture'          // Văn hóa
'travel'           // Du lịch
'hsk'              // HSK
'conversation'     // Giao tiếp
'general'          // Chung
'all'              // Tất cả (không filter)
📊 Status (Trạng thái)
'published'  // Đã xuất bản (hiển thị công khai)
'draft'      // Bản nháp (chưa công bố)
'removed'    // Đã gỡ (xóa mềm)
'pending'    // Đang chờ kiểm duyệt
'all'        // Tất cả (chỉ admin)
🔴 Error Responses
400 Bad Request:
{
  "success": false,
  "message": "Tham số không hợp lệ",
  "errors": {
    "page": "Số trang phải là số nguyên dương",
    "limit": "Limit phải từ 1 đến 100"
  }
}
401 Unauthorized:
{
  "success": false,
  "message": "Chưa đăng nhập hoặc token hết hạn"
}
500 Internal Server Error:
{
  "success": false,
  "message": "Lỗi server, vui lòng thử lại sau"
}
