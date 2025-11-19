# API Notification cho Admin

## Mục lục
1. [Tạo thông báo](#1-tạo-thông-báo)
2. [Lấy tất cả thông báo (đã gửi + đã nhận)](#2-lấy-tất-cả-thông-báo-đã-gửi--đã-nhận)
3. [Lấy danh sách thông báo đã nhận](#3-lấy-danh-sách-thông-báo-đã-nhận)

---

## 1. Tạo thông báo

### Endpoint
```
POST /api/notifications
```

### Headers
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

### Request Body

#### Các trường bắt buộc:
- `audience` (string): Đối tượng nhận thông báo
  - `"user"`: Gửi cho 1 user cụ thể (cần có `recipient_id`)
  - `"admin"`: Gửi cho tất cả admin
  - `"all"`: Gửi cho tất cả người dùng (user + admin)

- `type` (string): Loại thông báo
  - `"system"`: Thông báo hệ thống
  - `"community"`: Thông báo cộng đồng
  - `"comment_ban"`: Thông báo cấm bình luận
  - Hoặc custom type khác

- `title` (string): Tiêu đề thông báo (không được để trống)

- `content` (object): Nội dung thông báo
  - `message` (string): Nội dung chính (bắt buộc)
  ```json
  {
    "message": "Nội dung thông báo của bạn"
  }
  ```

#### Các trường tùy chọn:
- `recipient_id` (uuid): ID người nhận (bắt buộc nếu `audience = "user"`)
- `data` (object): Dữ liệu bổ sung (tất cả values phải là string)
  ```json
  {
    "post_id": "123",
    "comment_id": "456",
    "custom_field": "value"
  }
  ```
- `expires_at` (timestamp): Thời gian hết hạn thông báo
- `priority` (number): Độ ưu tiên (1-3, mặc định: 1)
  - `1`: Thấp
  - `2`: Trung bình
  - `3`: Cao
- `from_system` (boolean): Thông báo từ hệ thống (mặc định: false)
- `auto_push` (boolean): Tự động gửi push notification (mặc định: true)

### Ví dụ Request

#### 1. Gửi thông báo cho 1 user cụ thể
```json
{
  "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
  "audience": "user",
  "type": "system",
  "title": "Chào mừng bạn đến với hệ thống",
  "content": {
    "message": "Cảm ơn bạn đã đăng ký tài khoản. Chúc bạn có trải nghiệm tốt!"
  },
  "priority": 2,
  "from_system": true
}
```

#### 2. Gửi thông báo cho tất cả admin
```json
{
  "audience": "admin",
  "type": "system",
  "title": "Cập nhật hệ thống",
  "content": {
    "message": "Hệ thống sẽ bảo trì vào 2h sáng ngày mai"
  },
  "priority": 3,
  "expires_at": "2025-12-31T23:59:59Z"
}
```

#### 3. Gửi thông báo broadcast cho tất cả
```json
{
  "audience": "all",
  "type": "community",
  "title": "Thông báo quan trọng",
  "content": {
    "message": "Chúng tôi vừa ra mắt tính năng mới!"
  },
  "data": {
    "feature_id": "new_feature_123",
    "url": "https://example.com/features/new"
  },
  "priority": 2
}
```

#### 4. Gửi thông báo cấm bình luận
```json
{
  "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
  "audience": "user",
  "type": "comment_ban",
  "title": "Tài khoản bị hạn chế bình luận",
  "content": {
    "message": "Bạn đã vi phạm quy định cộng đồng. Tài khoản của bạn bị cấm bình luận trong 7 ngày."
  },
  "data": {
    "reason": "Spam",
    "ban_duration": "7"
  },
  "expires_at": "2025-11-26T00:00:00Z",
  "priority": 3
}
```

#### 5. Tạo thông báo nhưng không gửi push ngay
```json
{
  "audience": "all",
  "type": "system",
  "title": "Thông báo sắp tới",
  "content": {
    "message": "Nội dung thông báo"
  },
  "auto_push": false
}
```

### Response Success (201)
```json
{
  "success": true,
  "message": "Tạo và gửi thông báo thành công",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "system",
    "title": "Chào mừng bạn đến với hệ thống",
    "content": {
      "message": "Cảm ơn bạn đã đăng ký tài khoản. Chúc bạn có trải nghiệm tốt!"
    },
    "redirect_type": "admin",
    "data": {},
    "priority": 2,
    "is_push_sent": true,
    "created_at": "2025-11-19T10:30:00Z"
  }
}
```

### Response Error (400)
```json
{
  "success": false,
  "message": "Trường 'audience' là bắt buộc. Giá trị: 'user', 'all', hoặc 'admin'"
}
```

```json
{
  "success": false,
  "message": "Khi audience là 'user', trường 'recipient_id' là bắt buộc"
}
```

```json
{
  "success": false,
  "message": "Trường 'content' là bắt buộc và phải có 'message'. Ví dụ: { message: 'Nội dung thông báo' }"
}
```

---

## 2. Lấy tất cả thông báo (đã gửi + đã nhận)

### Endpoint
```
GET /api/admin/notifications/all
```

### Headers
```
Authorization: Bearer <admin_token>
```

### Query Parameters
- `page` (number, optional): Số trang (mặc định: 1)
- `limit` (number, optional): Số lượng mỗi trang (mặc định: 20, tối đa: 100)

### Ví dụ Request
```
GET /api/admin/notifications/all?page=1&limit=20
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy danh sách thông báo thành công",
  "data": {
    "sent": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
        "recipient_username": "user123",
        "recipient_email": "user@example.com",
        "audience": "user",
        "type": "system",
        "title": "Chào mừng bạn",
        "content": {
          "message": "Cảm ơn bạn đã đăng ký"
        },
        "redirect_type": "admin",
        "data": {},
        "priority": 2,
        "is_push_sent": true,
        "created_at": "2025-11-19T10:30:00Z",
        "expires_at": null
      },
      {
        "id": "223e4567-e89b-12d3-a456-426614174001",
        "recipient_id": null,
        "recipient_username": null,
        "recipient_email": null,
        "audience": "all",
        "type": "community",
        "title": "Thông báo chung",
        "content": {
          "message": "Nội dung broadcast"
        },
        "redirect_type": "admin",
        "data": {
          "url": "https://example.com"
        },
        "priority": 1,
        "is_push_sent": true,
        "created_at": "2025-11-19T09:00:00Z",
        "expires_at": "2025-12-31T23:59:59Z"
      }
    ],
    "received": [
      {
        "id": "323e4567-e89b-12d3-a456-426614174002",
        "sender_id": "660e8400-e29b-41d4-a716-446655440001",
        "sender_username": "super_admin",
        "sender_email": "admin@example.com",
        "type": "system",
        "title": "Thông báo từ Super Admin",
        "content": {
          "message": "Vui lòng kiểm tra báo cáo"
        },
        "redirect_type": "admin",
        "data": {
          "report_id": "789"
        },
        "priority": 3,
        "is_read": false,
        "read_at": null,
        "created_at": "2025-11-19T11:00:00Z",
        "expires_at": null,
        "from_system": false
      },
      {
        "id": "423e4567-e89b-12d3-a456-426614174003",
        "sender_id": null,
        "sender_username": null,
        "sender_email": null,
        "type": "system",
        "title": "Thông báo hệ thống",
        "content": {
          "message": "Hệ thống sẽ bảo trì"
        },
        "redirect_type": "admin",
        "data": {},
        "priority": 2,
        "is_read": true,
        "read_at": "2025-11-19T11:30:00Z",
        "created_at": "2025-11-19T08:00:00Z",
        "expires_at": null,
        "from_system": true
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "totalSent": 45,
    "totalReceived": 23,
    "totalPagesSent": 3,
    "totalPagesReceived": 2
  }
}
```

### Giải thích Response

#### `data.sent` - Thông báo đã gửi
Danh sách các thông báo mà admin này đã tạo và gửi đi:
- `recipient_id`: ID người nhận (null nếu broadcast)
- `recipient_username`: Username người nhận
- `recipient_email`: Email người nhận
- `audience`: Đối tượng nhận ("user", "admin", "all")
- `is_push_sent`: Đã gửi push notification chưa

#### `data.received` - Thông báo đã nhận
Danh sách các thông báo mà admin này nhận được:
- `sender_id`: ID admin đã tạo thông báo (null nếu từ hệ thống)
- `sender_username`: Username admin gửi
- `sender_email`: Email admin gửi
- `is_read`: Đã đọc chưa
- `read_at`: Thời gian đọc
- `from_system`: Thông báo từ hệ thống

#### `meta` - Metadata
- `totalSent`: Tổng số thông báo đã gửi
- `totalReceived`: Tổng số thông báo đã nhận
- `totalPagesSent`: Tổng số trang của thông báo đã gửi
- `totalPagesReceived`: Tổng số trang của thông báo đã nhận

---

## 3. Lấy danh sách thông báo đã nhận

### Endpoint
```
GET /api/notifications
```

### Headers
```
Authorization: Bearer <admin_token>
```

### Query Parameters
- `page` (number, optional): Số trang (mặc định: 1)
- `limit` (number, optional): Số lượng mỗi trang (mặc định: 20, tối đa: 100)
- `type` (string, optional): Lọc theo loại thông báo ("system", "community", etc.)
- `unread_only` (boolean, optional): Chỉ lấy thông báo chưa đọc (true/false hoặc 1/0)

### Ví dụ Request

#### 1. Lấy tất cả thông báo đã nhận
```
GET /api/notifications?page=1&limit=20
```

#### 2. Lấy chỉ thông báo chưa đọc
```
GET /api/notifications?page=1&limit=20&unread_only=true
```

#### 3. Lọc theo loại thông báo
```
GET /api/notifications?page=1&limit=20&type=system
```

#### 4. Kết hợp nhiều filter
```
GET /api/notifications?page=1&limit=10&type=community&unread_only=true
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy danh sách thông báo thành công",
  "data": [
    {
      "id": "323e4567-e89b-12d3-a456-426614174002",
      "type": "system",
      "title": "Thông báo từ Super Admin",
      "content": {
        "message": "Vui lòng kiểm tra báo cáo"
      },
      "redirect_type": "admin",
      "data": {
        "report_id": "789"
      },
      "priority": 3,
      "is_read": false,
      "read_at": null,
      "created_at": "2025-11-19T11:00:00Z",
      "expires_at": null,
      "from_system": false
    },
    {
      "id": "423e4567-e89b-12d3-a456-426614174003",
      "type": "system",
      "title": "Thông báo hệ thống",
      "content": {
        "message": "Hệ thống sẽ bảo trì vào 2h sáng"
      },
      "redirect_type": "none",
      "data": {},
      "priority": 2,
      "is_read": true,
      "read_at": "2025-11-19T11:30:00Z",
      "created_at": "2025-11-19T08:00:00Z",
      "expires_at": "2025-11-20T02:00:00Z",
      "from_system": true
    },
    {
      "id": "523e4567-e89b-12d3-a456-426614174004",
      "type": "community",
      "title": "Bài viết mới từ cộng đồng",
      "content": {
        "message": "Có 5 bài viết mới trong tuần này"
      },
      "redirect_type": "admin",
      "data": {
        "post_count": "5"
      },
      "priority": 1,
      "is_read": false,
      "read_at": null,
      "created_at": "2025-11-19T07:00:00Z",
      "expires_at": null,
      "from_system": false
    }
  ],
  "meta": {
    "total": 23,
    "page": 1,
    "limit": 20,
    "totalPages": 2,
    "unreadCount": 15
  }
}
```

### Giải thích Response

#### `data` - Danh sách thông báo
Mảng các thông báo mà admin nhận được, bao gồm:
- Thông báo gửi riêng cho admin này (`recipient_id = admin_id`)
- Thông báo gửi cho tất cả admin (`audience = "admin"`)
- Thông báo broadcast (`audience = "all"`)

#### Các trường quan trọng:
- `is_read`: Trạng thái đã đọc (true/false)
- `read_at`: Thời gian đọc (null nếu chưa đọc)
- `priority`: Độ ưu tiên (1: thấp, 2: trung bình, 3: cao)
- `expires_at`: Thời gian hết hạn (null nếu không hết hạn)
- `from_system`: Thông báo từ hệ thống hay từ admin khác

#### `meta` - Metadata
- `total`: Tổng số thông báo
- `unreadCount`: Số lượng thông báo chưa đọc

---

## Các API bổ sung

### 4. Đánh dấu đã đọc/chưa đọc
```
POST /api/notifications/mark-read
```

**Request Body:**
```json
{
  "ids": ["id1", "id2", "id3"],
  "asRead": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã đánh dấu 3 thông báo thành công."
}
```

### 5. Lấy số lượng thông báo chưa đọc
```
GET /api/notifications/unread-count
```

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 15
  }
}
```

### 6. Xóa thông báo (Admin only)
```
POST /api/notifications/delete
```

**Request Body:**
```json
{
  "ids": ["id1", "id2", "id3"]
}
```

**Response:**
```json
{
  "success": true
}
```
