# API Thông Báo (Notifications)

## Mục lục
- [User APIs](#user-apis)
- [Admin APIs](#admin-apis)

---

## User APIs

### 1. Lấy danh sách thông báo
**Endpoint:** `GET /api/notifications`

**Authentication:** Required (Bearer Token)

**Query Parameters:**
| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| page | number | 1 | Số trang |
| limit | number | 20 | Số lượng thông báo mỗi trang (max: 100) |
| type | string | - | Lọc theo loại thông báo ('system', 'community', v.v.) |
| unread_only | boolean | false | Chỉ lấy thông báo chưa đọc |

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách thông báo thành công",
  "data": [
    {
      "id": "uuid",
      "type": "system",
      "title": "Tiêu đề thông báo",
      "content": {
        "message": "Nội dung thông báo"
      },
      "redirect_type": "none",
      "data": {},
      "priority": 1,
      "is_read": false,
      "read_at": null,
      "created_at": "2025-11-22T10:00:00Z",
      "expires_at": null,
      "from_system": true
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "unreadCount": 10
  }
}
```

---

### 2. Lấy chi tiết thông báo
**Endpoint:** `GET /api/notifications/:id`

**Authentication:** Required (Bearer Token)

**Path Parameters:**
| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| id | uuid | ID của thông báo |

**Response:**
```json
{
  "success": true,
  "message": "Lấy chi tiết thông báo thành công",
  "data": {
    "id": "uuid",
    "type": "system",
    "type_display": "Hệ thống",
    "title": "Tiêu đề thông báo",
    "content": {
      "message": "Nội dung thông báo"
    },
    "redirect_type": "none",
    "data": {},
    "priority": 1,
    "is_read": true,
    "read_at": "2025-11-22T10:05:00Z",
    "created_at": "2025-11-22T10:00:00Z",
    "expires_at": null,
    "from_system": true,
    "audience": "all",
    "is_push_sent": true,
    "sender": {
      "id": "uuid",
      "username": "admin",
      "name": "Admin User",
      "email": "[email]",
      "avatar_url": "https://..."
    },
    "recipient": null
  }
}
```

**Lưu ý:** Khi xem chi tiết, thông báo sẽ tự động được đánh dấu là đã đọc.

---

### 3. Đánh dấu đã đọc/chưa đọc
**Endpoint:** `POST /api/notifications/mark-read`

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "ids": ["uuid1", "uuid2"],
  "asRead": true
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| ids | array | ✓ | Mảng ID thông báo cần cập nhật |
| asRead | boolean | ✓ | true = đánh dấu đã đọc, false = đánh dấu chưa đọc |

**Response:**
```json
{
  "success": true,
  "message": "Đã đánh dấu 2 thông báo thành công."
}
```

---

### 4. Lấy số lượng thông báo chưa đọc
**Endpoint:** `GET /api/notifications/unread-count`

**Authentication:** Required (Bearer Token)

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

---

## Admin APIs

### 5. Tạo thông báo mới
**Endpoint:** `POST /api/notifications`

**Authentication:** Required (Bearer Token + Admin Role)

**Request Body:**
```json
{
  "recipient_id": "uuid",
  "audience": "user",
  "type": "system",
  "title": "Tiêu đề thông báo",
  "content": {
    "message": "Nội dung thông báo"
  },
  "data": {},
  "expires_at": "2025-12-31T23:59:59Z",
  "priority": 1,
  "from_system": false,
  "auto_push": true
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| recipient_id | uuid | * | ID người nhận (bắt buộc nếu audience = 'user') |
| audience | string | ✓ | 'user', 'all', hoặc 'admin' |
| type | string | ✓ | Loại thông báo: 'system', 'community', 'comment_ban', v.v. |
| title | string | ✓ | Tiêu đề thông báo |
| content | object | ✓ | Phải có trường 'message' |
| data | object | - | Dữ liệu tùy chỉnh |
| expires_at | timestamp | - | Thời gian hết hạn |
| priority | number | - | Độ ưu tiên (1-3), mặc định: 1 |
| from_system | boolean | - | Thông báo từ hệ thống, mặc định: false |
| auto_push | boolean | - | Tự động gửi push notification, mặc định: true |

**Lưu ý:**
- Nếu `audience = 'user'`: phải có `recipient_id`
- Nếu `audience = 'all'`: không được truyền `recipient_id`
- `redirect_type` luôn là "admin" khi admin tạo

**Response:**
```json
{
  "success": true,
  "message": "Tạo và gửi thông báo thành công",
  "data": {
    "id": "uuid",
    "recipient_id": "uuid",
    "audience": "user",
    "type": "system",
    "title": "Tiêu đề thông báo",
    "content": {
      "message": "Nội dung thông báo"
    },
    "redirect_type": "admin",
    "data": {},
    "priority": 1,
    "is_push_sent": true,
    "created_at": "2025-11-22T10:00:00Z"
  }
}
```

---

### 6. Gửi push notification
**Endpoint:** `POST /api/notifications/publish`

**Authentication:** Required (Bearer Token + Admin Role)

**Request Body:**
```json
{
  "ids": ["uuid1", "uuid2"]
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| ids | array | ✓ | Mảng ID thông báo cần gửi push |

**Response:**
```json
{
  "success": true
}
```

---

### 7. Xóa thông báo
**Endpoint:** `POST /api/notifications/delete`

**Authentication:** Required (Bearer Token + Admin Role)

**Request Body:**
```json
{
  "ids": ["uuid1", "uuid2"]
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| ids | array | ✓ | Mảng ID thông báo cần xóa |

**Response:**
```json
{
  "success": true
}
```

---

### 8. Lấy tất cả thông báo của admin
**Endpoint:** `GET /api/admin/notifications/all`

**Authentication:** Required (Bearer Token + Admin Role)

**Query Parameters:**
| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| page | number | 1 | Số trang |
| limit | number | 20 | Số lượng mỗi trang (max: 100) |

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách thông báo thành công",
  "data": {
    "sent": [
      {
        "id": "uuid",
        "recipient_id": "uuid",
        "recipient_username": "user123",
        "recipient_email": "[email]",
        "audience": "user",
        "type": "system",
        "title": "Tiêu đề",
        "content": {
          "message": "Nội dung"
        },
        "redirect_type": "admin",
        "data": {},
        "priority": 1,
        "is_push_sent": true,
        "created_at": "2025-11-22T10:00:00Z",
        "expires_at": null
      }
    ],
    "received": [
      {
        "id": "uuid",
        "sender_id": "uuid",
        "sender_username": "admin",
        "sender_email": "[email]",
        "type": "system",
        "title": "Tiêu đề",
        "content": {
          "message": "Nội dung"
        },
        "redirect_type": "admin",
        "data": {},
        "priority": 1,
        "is_read": false,
        "read_at": null,
        "created_at": "2025-11-22T10:00:00Z",
        "expires_at": null,
        "from_system": true
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "totalSent": 50,
    "totalReceived": 30,
    "totalPagesSent": 3,
    "totalPagesReceived": 2
  }
}
```

---

## Các loại Audience

| Giá trị | Mô tả |
|---------|-------|
| user | Gửi cho một người dùng cụ thể (cần recipient_id) |
| all | Gửi cho tất cả người dùng |
| admin | Gửi cho tất cả admin |

---

## Các loại Type

| Giá trị (type) | Hiển thị (type_display) | Mô tả |
|----------------|-------------------------|-------|
| system | Hệ thống | Thông báo hệ thống chung |
| community | Cộng đồng | Thông báo về cộng đồng |
| violation | Vi phạm | Thông báo vi phạm chung |
| comment_ban | Cấm bình luận | Thông báo cấm bình luận |
| post_violation | Vi phạm bài viết | Thông báo vi phạm bài viết |
| comment_violation | Vi phạm bình luận | Thông báo vi phạm bình luận |
| account_warning | Cảnh báo tài khoản | Cảnh báo về tài khoản |
| account_suspended | Tạm khóa tài khoản | Thông báo tài khoản bị khóa |
| new_feature | Tính năng mới | Giới thiệu tính năng mới |
| maintenance | Bảo trì | Thông báo bảo trì hệ thống |
| promotion | Khuyến mãi | Thông báo khuyến mãi |
| update | Cập nhật | Thông báo cập nhật |
| achievement | Thành tựu | Thông báo về thành tựu |

**Lưu ý:** Nếu type không có trong danh sách trên, `type_display` sẽ giống với `type`

---

## Các loại Redirect Type

- `none` - Không chuyển hướng
- `admin` - Chuyển đến trang admin
- `post` - Chuyển đến bài viết
- `post_comment` - Chuyển đến bình luận
- Có thể tùy chỉnh thêm

---

## Error Responses

Tất cả các API đều có thể trả về các lỗi sau:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Mô tả lỗi validation"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Token không hợp lệ hoặc đã hết hạn"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Không có quyền truy cập"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Thông báo không tồn tại hoặc không có quyền xem"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Lỗi server",
  "error": "Chi tiết lỗi"
}
```

---

### 9. Lấy danh sách thông báo đã tạo của admin
**Endpoint:** `GET /api/admin/notifications/sent`

**Authentication:** Required (Bearer Token + Admin Role)

**Query Parameters:**
| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| page | number | 1 | Số trang |
| limit | number | 20 | Số lượng mỗi trang (max: 100) |

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách thông báo đã tạo thành công",
  "data": [
    {
      "id": "uuid",
      "recipient_id": "uuid",
      "recipient_username": "user123",
      "recipient_name": "User Name",
      "recipient_email": "[email]",
      "recipient_avatar": "https://...",
      "audience": "user",
      "type": "system",
      "title": "Tiêu đề",
      "content": {
        "message": "Nội dung"
      },
      "redirect_type": "admin",
      "data": {},
      "priority": 1,
      "is_push_sent": true,
      "created_at": "2025-11-22T10:00:00Z",
      "expires_at": null
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### 10. Lấy danh sách thông báo đã nhận của admin
**Endpoint:** `GET /api/admin/notifications/received`

**Authentication:** Required (Bearer Token + Admin Role)

**Query Parameters:**
| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| page | number | 1 | Số trang |
| limit | number | 20 | Số lượng mỗi trang (max: 100) |
| read_status | string | all | Lọc theo trạng thái: 'all', 'read', 'unread' |
| type | string | all | Lọc theo loại: 'all', 'system', 'violation', 'community', v.v. |

**Ví dụ:**
- Lấy tất cả: `/api/admin/notifications/received?page=1&limit=20`
- Chỉ chưa đọc: `/api/admin/notifications/received?read_status=unread`
- Chỉ đã đọc: `/api/admin/notifications/received?read_status=read`
- Lọc theo type: `/api/admin/notifications/received?type=violation`
- Kết hợp: `/api/admin/notifications/received?read_status=unread&type=system`

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách thông báo đã nhận thành công",
  "data": [
    {
      "id": "uuid",
      "sender_id": "uuid",
      "sender_username": "admin",
      "sender_name": "Admin Name",
      "sender_email": "[email]",
      "sender_avatar": "https://...",
      "type": "system",
      "title": "Tiêu đề",
      "content": {
        "message": "Nội dung"
      },
      "redirect_type": "admin",
      "data": {},
      "priority": 1,
      "is_read": false,
      "read_at": null,
      "created_at": "2025-11-22T10:00:00Z",
      "expires_at": null,
      "from_system": true
    }
  ],
  "meta": {
    "total": 30,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

---

## Admin APIs - Nguy hiểm

### 11. Xóa tất cả thông báo trong database
**Endpoint:** `DELETE /api/admin/notifications/delete-all`

**Authentication:** Required (Bearer Token + Admin Role)

**⚠️ CẢNH BÁO:** API này sẽ xóa TẤT CẢ thông báo trong database. Không thể khôi phục!

**Response:**
```json
{
  "success": true,
  "message": "Đã xóa tất cả 150 thông báo trong database",
  "data": {
    "deletedCount": 150
  }
}
```

---

## Admin APIs - Utility

### 12. Lấy thông tin các cột trong bảng Notifications
**Endpoint:** `GET /api/admin/notifications/columns`

**Authentication:** Required (Bearer Token + Admin Role)

**Response:**
```json
{
  "success": true,
  "message": "Lấy thông tin các cột thành công",
  "data": [
    {
      "name": "id",
      "type": "uuid",
      "maxLength": null,
      "nullable": false,
      "default": "gen_random_uuid()"
    },
    {
      "name": "recipient_id",
      "type": "uuid",
      "maxLength": null,
      "nullable": true,
      "default": null
    },
    {
      "name": "audience",
      "type": "character varying",
      "maxLength": 50,
      "nullable": true,
      "default": null
    },
    {
      "name": "type",
      "type": "character varying",
      "maxLength": 100,
      "nullable": false,
      "default": null
    },
    {
      "name": "title",
      "type": "character varying",
      "maxLength": 255,
      "nullable": false,
      "default": null
    },
    {
      "name": "content",
      "type": "jsonb",
      "maxLength": null,
      "nullable": false,
      "default": null
    },
    {
      "name": "redirect_type",
      "type": "character varying",
      "maxLength": 100,
      "nullable": true,
      "default": null
    },
    {
      "name": "data",
      "type": "jsonb",
      "maxLength": null,
      "nullable": true,
      "default": null
    },
    {
      "name": "expires_at",
      "type": "timestamp with time zone",
      "maxLength": null,
      "nullable": true,
      "default": null
    },
    {
      "name": "priority",
      "type": "integer",
      "maxLength": null,
      "nullable": true,
      "default": "1"
    },
    {
      "name": "from_system",
      "type": "boolean",
      "maxLength": null,
      "nullable": true,
      "default": "false"
    },
    {
      "name": "created_by",
      "type": "uuid",
      "maxLength": null,
      "nullable": true,
      "default": null
    },
    {
      "name": "read_at",
      "type": "timestamp with time zone",
      "maxLength": null,
      "nullable": true,
      "default": null
    },
    {
      "name": "is_push_sent",
      "type": "boolean",
      "maxLength": null,
      "nullable": true,
      "default": "false"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone",
      "maxLength": null,
      "nullable": true,
      "default": "CURRENT_TIMESTAMP"
    }
  ]
}
```
