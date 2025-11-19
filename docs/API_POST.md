# API Bài Viết (Posts) - Tài liệu chi tiết

## Mục lục
1. [Tạo bài viết](#1-tạo-bài-viết)
2. [Lấy danh sách bài viết](#2-lấy-danh-sách-bài-viết)
3. [Lấy chi tiết bài viết](#3-lấy-chi-tiết-bài-viết)
4. [Cập nhật bài viết](#4-cập-nhật-bài-viết)
5. [Like/Unlike bài viết](#5-likeunlike-bài-viết)
6. [Ghi nhận lượt xem](#6-ghi-nhận-lượt-xem)
7. [Lấy danh sách người xem](#7-lấy-danh-sách-người-xem)
8. [Lấy danh sách người thích](#8-lấy-danh-sách-người-thích)
9. [Gỡ bài viết](#9-gỡ-bài-viết)
10. [Khôi phục bài viết (Admin)](#10-khôi-phục-bài-viết-admin)
11. [Kiểm duyệt bài viết (Admin)](#11-kiểm-duyệt-bài-viết-admin)
12. [Xóa toàn bộ bài viết (Super Admin)](#12-xóa-toàn-bộ-bài-viết-super-admin)

---

## 1. Tạo bài viết

### Endpoint
```
POST /api/community/posts
```

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body

#### Các trường bắt buộc:
- `title` (string): Tiêu đề bài viết
- `content` (object hoặc string): Nội dung bài viết
- `topic` (string): Chủ đề bài viết

#### Các trường tùy chọn:
- `status` (string): Trạng thái bài viết (mặc định: "published")
- `is_pinned` (boolean): Ghim bài viết (mặc định: false)


### Format Content

Content có thể là:

**1. Object (khuyến nghị):**
```json
{
  "html": "<p>Nội dung HTML</p>",
  "text": "Nội dung text thuần",
  "images": ["url1.jpg", "url2.jpg"]
}
```

**2. String (tự động convert):**
```json
"<p>Nội dung HTML</p>"
```

### Ví dụ Request

#### 1. Bài viết cơ bản
```json
{
  "title": "Chia sẻ kinh nghiệm học tiếng Trung",
  "content": {
    "html": "<p>Hôm nay mình muốn chia sẻ...</p>",
    "text": "Hôm nay mình muốn chia sẻ...",
    "images": []
  },
  "topic": "learning_tips"
}
```

#### 2. Bài viết có hình ảnh
```json
{
  "title": "Chuyến du lịch Trung Quốc",
  "content": {
    "html": "<p>Những hình ảnh đẹp từ chuyến đi</p>",
    "text": "Những hình ảnh đẹp từ chuyến đi",
    "images": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg"
    ]
  },
  "topic": "travel"
}
```


### Response Success (201)
```json
{
  "success": true,
  "message": "Tạo bài viết thành công.",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Chia sẻ kinh nghiệm học tiếng Trung",
    "topic": "learning_tips",
    "content": {
      "html": "<p>Hôm nay mình muốn chia sẻ...</p>",
      "text": "Hôm nay mình muốn chia sẻ...",
      "images": []
    },
    "is_pinned": false,
    "status": "published",
    "is_approved": true,
    "auto_flagged": false,
    "created_at": "2025-11-19T10:30:00Z",
    "likes": 0,
    "views": 0
  }
}
```

### Lưu ý
- Bài viết sẽ được **tự động kiểm duyệt bằng AI** sau khi tạo
- Nếu AI phát hiện vi phạm, bài viết sẽ bị gỡ tự động và gửi thông báo cho người dùng
- `auto_flagged: true` nghĩa là bài viết đã bị AI đánh dấu

---

## 2. Lấy danh sách bài viết

### Endpoint
```
GET /api/community/posts
```

### Headers
```
Authorization: Bearer <token>
```

### Query Parameters
- `page` (number, optional): Số trang (mặc định: 1)
- `limit` (number, optional): Số lượng mỗi trang (mặc định: 10)
- `topic` (string, optional): Lọc theo chủ đề
- `status` (string, optional): Lọc theo trạng thái ("published", "removed", "all")


### Ví dụ Request

#### 1. Lấy tất cả bài viết
```
GET /api/community/posts?page=1&limit=10
```

#### 2. Lọc theo chủ đề
```
GET /api/community/posts?page=1&limit=10&topic=learning_tips
```

#### 3. Lọc theo trạng thái
```
GET /api/community/posts?page=1&limit=10&status=published
```

### Response Success (200)
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Chia sẻ kinh nghiệm học tiếng Trung",
      "content": {
        "html": "<p>Hôm nay mình muốn chia sẻ...</p>",
        "text": "Hôm nay mình muốn chia sẻ...",
        "images": []
      },
      "topic": "learning_tips",
      "likes": 15,
      "views": 120,
      "created_at": "2025-11-19T10:30:00Z",
      "status": "published",
      "is_pinned": false,
      "is_approved": true,
      "auto_flagged": false,
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Nguyễn Văn A",
        "avatar_url": "https://example.com/avatar.jpg",
        "badge_level": 3,
        "community_points": 1500,
        "level": 5,
        "role": "user"
      },
      "badge": {
        "level": 3,
        "name": "Chuyên gia",
        "icon": "🏆"
      },
      "comment_count": 8,
      "isLiked": true,
      "isCommented": false,
      "isViewed": true
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```


### Giải thích Response

#### Thông tin bài viết:
- `isLiked`: User hiện tại đã like bài viết này chưa
- `isCommented`: User hiện tại đã comment bài viết này chưa
- `isViewed`: User hiện tại đã xem bài viết này chưa
- `comment_count`: Số lượng comment
- `auto_flagged`: Bài viết bị AI đánh dấu vi phạm

#### Thông tin user (tác giả):
- `badge_level`: Cấp độ huy hiệu
- `community_points`: Điểm cộng đồng
- `level`: Level của user

#### Thông tin badge:
- `level`: Cấp độ huy hiệu
- `name`: Tên huy hiệu
- `icon`: Icon huy hiệu

---

## 3. Lấy chi tiết bài viết

### Endpoint
```
GET /api/community/posts/:postId
```

### Headers
```
Authorization: Bearer <token>
```

### Path Parameters
- `postId` (uuid): ID của bài viết

### Ví dụ Request
```
GET /api/community/posts/123e4567-e89b-12d3-a456-426614174000
```

### Response Success (200)
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Chia sẻ kinh nghiệm học tiếng Trung",
  "content": {
    "html": "<p>Hôm nay mình muốn chia sẻ...</p>",
    "text": "Hôm nay mình muốn chia sẻ...",
    "images": []
  },
  "topic": "learning_tips",
  "likes": 15,
  "views": 120,
  "created_at": "2025-11-19T10:30:00Z",
  "status": "published",
  "is_pinned": false,
  "is_approved": true,
  "auto_flagged": false,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
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
    "last_login": "2025-11-19T09:00:00Z",
    "provider": "local"
  },
  "badge": {
    "id": "badge-uuid",
    "level": 3,
    "name": "Chuyên gia",
    "icon": "🏆",
    "min_points": 1000,
    "rule_description": "Đạt 1000 điểm cộng đồng",
    "is_active": true
  },
  "comment_count": 8,
  "isLiked": true,
  "isCommented": false,
  "isViewed": true
}
```

### Response Error (404)
```json
{
  "success": false,
  "message": "Bài viết không tồn tại."
}
```

---

## 4. Cập nhật bài viết

### Endpoint
```
PUT /api/community/posts/:postId
```

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Path Parameters
- `postId` (uuid): ID của bài viết

### Request Body
Chỉ các trường được phép cập nhật:
- `title` (string, optional): Tiêu đề mới
- `content` (object, optional): Nội dung mới
- `topic` (string, optional): Chủ đề mới


### Ví dụ Request
```json
{
  "title": "Chia sẻ kinh nghiệm học tiếng Trung (Cập nhật)",
  "content": {
    "html": "<p>Nội dung đã được cập nhật...</p>",
    "text": "Nội dung đã được cập nhật...",
    "images": ["https://example.com/new-image.jpg"]
  },
  "topic": "learning_tips"
}
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Cập nhật bài viết thành công.",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Chia sẻ kinh nghiệm học tiếng Trung (Cập nhật)",
    "content": {
      "html": "<p>Nội dung đã được cập nhật...</p>",
      "text": "Nội dung đã được cập nhật...",
      "images": ["https://example.com/new-image.jpg"]
    },
    "topic": "learning_tips",
    "likes": 15,
    "views": 120,
    "created_at": "2025-11-19T10:30:00Z",
    "status": "published",
    "is_pinned": false,
    "is_approved": true,
    "auto_flagged": false,
    "user": { ... },
    "badge": { ... },
    "comment_count": 8,
    "isLiked": true,
    "isCommented": false,
    "isViewed": true
  }
}
```

### Response Error
```json
{
  "success": false,
  "message": "Cập nhật thất bại. Bài viết không tồn tại hoặc bạn không có quyền chỉnh sửa."
}
```

### Lưu ý
- Chỉ chủ bài viết mới có quyền cập nhật
- Không thể cập nhật các trường: `status`, `is_pinned`, `is_approved`, `auto_flagged`

---

## 5. Like/Unlike bài viết

### Endpoint
```
POST /api/community/posts/:postId/like
```

### Headers
```
Authorization: Bearer <token>
```

### Path Parameters
- `postId` (uuid): ID của bài viết

### Ví dụ Request
```
POST /api/community/posts/123e4567-e89b-12d3-a456-426614174000/like
```

### Response Success (200)

#### Khi like
```json
{
  "success": true,
  "message": "Đã thích bài viết.",
  "data": {
    "action": "liked",
    "likes": 16
  }
}
```

#### Khi unlike
```json
{
  "success": true,
  "message": "Đã bỏ thích bài viết.",
  "data": {
    "action": "unliked",
    "likes": 15
  }
}
```

### Lưu ý
- Tự động toggle: Nếu đã like thì sẽ unlike, nếu chưa like thì sẽ like
- Gửi thông báo cho chủ bài viết khi có người like (trừ khi tự like bài của mình)
- Cập nhật số lượng like trong bảng Posts

---

## 6. Ghi nhận lượt xem

### Endpoint
```
POST /api/community/posts/:postId/view
```

### Headers
```
Authorization: Bearer <token>
```

### Path Parameters
- `postId` (uuid): ID của bài viết

### Ví dụ Request
```
POST /api/community/posts/123e4567-e89b-12d3-a456-426614174000/view
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Ghi nhận lượt xem thành công.",
  "data": {
    "views": 121
  }
}
```

### Lưu ý
- Ghi nhận vào bảng `PostViews`
- Cập nhật số lượng view trong bảng `Posts`
- Có thể gọi khi user mở bài viết

---

## 7. Lấy danh sách người xem

### Endpoint
```
GET /api/community/posts/:postId/views
```

### Path Parameters
- `postId` (uuid): ID của bài viết

### Query Parameters
- `page` (number, optional): Số trang (mặc định: 1)
- `limit` (number, optional): Số lượng mỗi trang (mặc định: 10)

### Ví dụ Request
```
GET /api/community/posts/123e4567-e89b-12d3-a456-426614174000/views?page=1&limit=10
```


### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy danh sách người xem thành công.",
  "data": {
    "data": [
      {
        "user_id": "user-uuid-1",
        "name": "Nguyễn Văn A",
        "avatar_url": "https://example.com/avatar1.jpg",
        "level": 5,
        "badge_level_id": 3,
        "badge_name": "Chuyên gia",
        "badge_icon": "🏆",
        "views_count": 3,
        "last_viewed_at": "2025-11-19T12:00:00Z"
      },
      {
        "user_id": "user-uuid-2",
        "name": "Trần Thị B",
        "avatar_url": "https://example.com/avatar2.jpg",
        "level": 3,
        "badge_level_id": 2,
        "badge_name": "Người học",
        "badge_icon": "📚",
        "views_count": 1,
        "last_viewed_at": "2025-11-19T11:30:00Z"
      }
    ],
    "meta": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

### Giải thích
- `views_count`: Số lần user này xem bài viết
- `last_viewed_at`: Lần xem gần nhất
- Sắp xếp theo thời gian xem gần nhất

---

## 8. Lấy danh sách người thích

### Endpoint
```
GET /api/community/posts/:postId/likes
```

### Path Parameters
- `postId` (uuid): ID của bài viết

### Query Parameters
- `page` (number, optional): Số trang (mặc định: 1)
- `limit` (number, optional): Số lượng mỗi trang (mặc định: 10)

### Ví dụ Request
```
GET /api/community/posts/123e4567-e89b-12d3-a456-426614174000/likes?page=1&limit=10
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy danh sách người thích thành công.",
  "data": {
    "data": [
      {
        "user_id": "user-uuid-1",
        "name": "Nguyễn Văn A",
        "avatar_url": "https://example.com/avatar1.jpg",
        "level": 5,
        "badge_level_id": 3,
        "badge_name": "Chuyên gia",
        "badge_icon": "🏆"
      },
      {
        "user_id": "user-uuid-2",
        "name": "Trần Thị B",
        "avatar_url": "https://example.com/avatar2.jpg",
        "level": 3,
        "badge_level_id": 2,
        "badge_name": "Người học",
        "badge_icon": "📚"
      }
    ],
    "meta": {
      "total": 15,
      "page": 1,
      "limit": 10,
      "totalPages": 2
    }
  }
}
```

---

## 9. Gỡ bài viết

### Endpoint
```
DELETE /api/community/posts/:postId
```

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Path Parameters
- `postId` (uuid): ID của bài viết

### Request Body (optional)
```json
{
  "reason": "Lý do gỡ bài viết"
}
```

### Ví dụ Request
```
DELETE /api/community/posts/123e4567-e89b-12d3-a456-426614174000
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Gỡ bài viết thành công."
}
```

### Response Error
```json
{
  "success": false,
  "message": "Bạn không có quyền gỡ bài viết này."
}
```

### Phân quyền
- **User**: Chỉ có thể gỡ bài viết của chính mình
- **Admin/Super Admin**: Có thể gỡ bất kỳ bài viết nào

### Lưu ý
- Đây là **xóa mềm** (soft delete)
- Bài viết vẫn còn trong database nhưng có `deleted_at`, `deleted_by`, `deleted_reason`
- Status chuyển thành `"removed"`
- Admin gỡ bài sẽ được ghi log vào `ModerationLogs`

---

## 10. Khôi phục bài viết (Admin)

### Endpoint
```
PUT /api/community/posts/:postId/restore
```

### Headers
```
Authorization: Bearer <admin_token>
```

### Path Parameters
- `postId` (uuid): ID của bài viết

### Ví dụ Request
```
PUT /api/community/posts/123e4567-e89b-12d3-a456-426614174000/restore
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Khôi phục bài viết thành công."
}
```

### Lưu ý
- Chỉ Admin/Super Admin mới có quyền
- Xóa các trường: `deleted_at`, `deleted_by`, `deleted_reason`
- Chuyển status về `"published"`
- Chuyển `is_approved` về `true`


---

## 11. Kiểm duyệt bài viết (Admin)

### Endpoint
```
POST /api/community/posts/:postId/moderation
```

### Headers
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

### Path Parameters
- `postId` (uuid): ID của bài viết

### Request Body

#### Action: Remove (Gỡ bài)
```json
{
  "action": "remove",
  "post_update": {
    "status": "removed",
    "deleted_at": "2025-11-19T12:00:00Z",
    "deleted_by": "admin-uuid",
    "deleted_reason": "Vi phạm quy định cộng đồng"
  },
  "violation": {
    "user_id": "user-uuid",
    "target_type": "post",
    "target_id": "post-uuid",
    "severity": "high",
    "ruleIds": ["rule-uuid-1", "rule-uuid-2"],
    "reason": "Nội dung spam và quảng cáo",
    "resolution": "Gỡ bài và cảnh cáo"
  }
}
```

#### Action: Restore (Khôi phục)
```json
{
  "action": "restore",
  "post_update": {
    "status": "published"
  },
  "restore_reason": "Bài viết đã được xem xét lại và không vi phạm"
}
```

### Ví dụ Request - Gỡ bài với vi phạm

```json
{
  "action": "remove",
  "post_update": {
    "deleted_reason": "Nội dung spam"
  },
  "violation": {
    "severity": "medium",
    "ruleIds": ["rule-uuid-1"],
    "reason": "Bài viết chứa nội dung spam",
    "resolution": "Gỡ bài và cảnh cáo"
  }
}
```

### Response Success (200)
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Tiêu đề bài viết",
  "content": {
    "html": "<p>Nội dung...</p>",
    "text": "Nội dung...",
    "images": []
  },
  "topic": "learning_tips",
  "likes": 15,
  "views": 120,
  "created_at": "2025-11-19T10:30:00Z",
  "status": "removed",
  "is_pinned": false,
  "is_approved": false,
  "auto_flagged": false,
  "deleted_at": "2025-11-19T12:00:00Z",
  "deleted_by": "admin-uuid",
  "deleted_reason": "Nội dung spam",
  "user": { ... },
  "badge": { ... },
  "comment_count": 8,
  "isLiked": false,
  "isCommented": false,
  "isViewed": true
}
```

### Chức năng

#### Khi Remove:
1. Cập nhật trạng thái bài viết (status, deleted_at, deleted_by, deleted_reason)
2. Tạo vi phạm (Violation) cho người dùng
3. Gửi thông báo chi tiết cho người dùng với:
   - Lý do vi phạm
   - Các quy tắc bị vi phạm
   - Mức độ nghiêm trọng
   - Preview nội dung bài viết
4. Không tạo vi phạm nếu người dùng tự gỡ bài

#### Khi Restore:
1. Khôi phục bài viết (xóa deleted_at, deleted_by, deleted_reason)
2. Chuyển status về "published"
3. Xóa tất cả vi phạm liên quan đến bài viết
4. Gửi thông báo khôi phục cho người dùng với lý do
5. Không gửi thông báo nếu người dùng tự khôi phục

### Severity Levels
- `"low"`: Thấp - Cảnh cáo
- `"medium"`: Trung bình - Gỡ bài
- `"high"`: Cao - Gỡ bài + hạn chế tài khoản
- `"critical"`: Nghiêm trọng - Khóa tài khoản

---

## 12. Xóa toàn bộ bài viết (Super Admin)

### ⚠️ CẢNH BÁO: API CỰC KỲ NGUY HIỂM

API này sẽ xóa **VĨNH VIỄN** tất cả:
- Bài viết (Posts)
- Bình luận (Comments)
- Likes (PostLikes)
- Views (PostViews)
- Báo cáo (Reports)
- Vi phạm (Violations)
- Khiếu nại (Appeals)
- Log kiểm duyệt (ModerationLogs)
- Liên kết vi phạm-quy tắc (ViolationRules)

### Endpoint
```
DELETE /api/community/posts/all/permanent
```

### Headers
```
Authorization: Bearer <super_admin_token>
Content-Type: application/json
```

### Request Body
```json
{
  "confirmationCode": "DELETE_ALL_POSTS_PERMANENTLY"
}
```

### Ví dụ Request
```
DELETE /api/community/posts/all/permanent
```

```json
{
  "confirmationCode": "DELETE_ALL_POSTS_PERMANENTLY"
}
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Đã xóa vĩnh viễn TẤT CẢ bài đăng và dữ liệu liên quan thành công.",
  "data": {
    "deleted": {
      "posts": 1250,
      "comments": 5430,
      "likes": 8920,
      "views": 45600,
      "reports": 120,
      "violations": 85,
      "appeals": 15,
      "moderationLogs": 200,
      "violationRules": 95
    },
    "performed_by": "super-admin-uuid",
    "performed_at": "2025-11-19T12:00:00Z"
  }
}
```

### Response Error

#### Không phải Super Admin (403)
```json
{
  "success": false,
  "message": "Chỉ Super Admin mới có quyền thực hiện thao tác này."
}
```

#### Thiếu mã xác nhận (400)
```json
{
  "success": false,
  "message": "Thiếu mã xác nhận. Vui lòng cung cấp confirmationCode trong body."
}
```

#### Mã xác nhận sai (400)
```json
{
  "success": false,
  "message": "Mã xác nhận không đúng. Thao tác bị hủy."
}
```

### Phân quyền
- **Chỉ Super Admin** mới có quyền
- Phải cung cấp mã xác nhận chính xác: `"DELETE_ALL_POSTS_PERMANENTLY"`

### Lưu ý
- Đây là **XÓA VĨNH VIỄN**, không thể khôi phục
- Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
- Nếu có lỗi, toàn bộ thao tác sẽ rollback
- Chỉ sử dụng khi cần reset toàn bộ hệ thống community

---

## Các trạng thái bài viết (Status)

- `"draft"`: Bản nháp (chưa công bố)
- `"published"`: Đã công bố
- `"removed"`: Đã gỡ (xóa mềm)
- `"pending"`: Đang chờ kiểm duyệt

## Các chủ đề (Topics)

Tùy thuộc vào cấu hình hệ thống, ví dụ:
- `"learning_tips"`: Mẹo học tập
- `"grammar"`: Ngữ pháp
- `"vocabulary"`: Từ vựng
- `"culture"`: Văn hóa
- `"travel"`: Du lịch
- `"general"`: Chung

## Lưu ý chung

### Phân quyền
- **User**: Tạo, sửa, xóa bài của mình; Like, view, comment
- **Admin**: Tất cả quyền của User + Kiểm duyệt, khôi phục bài viết
- **Super Admin**: Tất cả quyền + Xóa toàn bộ hệ thống

### Auto Moderation (AI)
- Tất cả bài viết mới sẽ được AI kiểm tra tự động
- Nếu phát hiện vi phạm:
  - Bài viết bị gỡ tự động
  - `auto_flagged = true`
  - Gửi thông báo cho người dùng
  - Tạo vi phạm trong hệ thống

### Thông báo
Hệ thống tự động gửi thông báo khi:
- Có người like bài viết (trừ tự like)
- Bài viết bị gỡ bởi AI
- Bài viết bị gỡ bởi Admin (có vi phạm)
- Bài viết được khôi phục bởi Admin

### Performance
- Sử dụng pagination cho tất cả danh sách
- Limit tối đa: 100 items/page
- Sử dụng index trên các trường thường query
