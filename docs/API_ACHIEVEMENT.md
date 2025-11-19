# 🏆 Achievement API Documentation

## Base URL
```
/api
```

## Authentication
Các endpoint yêu cầu authentication sử dụng Bearer token trong header:
```
Authorization: Bearer <your_token>
```

---

## 📑 Table of Contents

### Public APIs
1. [Lấy danh sách thành tích công khai](#1-lấy-danh-sách-thành-tích-công-khai)
2. [Lấy chi tiết 1 thành tích](#2-lấy-chi-tiết-1-thành-tích)
3. [Xem thành tích của user khác](#3-xem-thành-tích-của-user-khác)

### User APIs
4. [Lấy thành tích đã đạt được](#4-lấy-thành-tích-đã-đạt-được)
5. [Lấy tiến độ thành tích](#5-lấy-tiến-độ-thành-tích)
6. [Lấy thống kê thành tích](#6-lấy-thống-kê-thành-tích)
7. [Lấy thành tích sắp đạt](#7-lấy-thành-tích-sắp-đạt)

### Admin APIs
8. [Lấy danh sách thành tích (Admin)](#8-lấy-danh-sách-thành-tích-admin)
9. [Tạo thành tích mới](#9-tạo-thành-tích-mới)
10. [Lấy thống kê admin](#10-lấy-thống-kê-admin)
11. [Cập nhật thành tích](#11-cập-nhật-thành-tích)
12. [Toggle trạng thái](#12-toggle-trạng-thái)
13. [Xóa thành tích](#13-xóa-thành-tích)
14. [Lấy users của achievement](#14-lấy-users-của-achievement)
15. [Cập nhật tiến độ thủ công](#15-cập-nhật-tiến-độ-thủ-công)

---


## PUBLIC APIs

### 1. Lấy danh sách thành tích công khai

Lấy tất cả thành tích đang active trong hệ thống.

**Endpoint:** `GET /api/achievements`

**Authentication:** Không yêu cầu

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Người mới",
      "description": "Tạo 5 bài viết đầu tiên",
      "icon": "🎉",
      "points": 100,
      "criteria": {
        "type": "post_created",
        "value": 5
      },
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Lấy chi tiết 1 thành tích

Lấy thông tin chi tiết của một thành tích cụ thể.

**Endpoint:** `GET /api/achievements/:id`

**Authentication:** Không yêu cầu

**Path Parameters:**
- `id` (UUID, required): ID của thành tích

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Người mới",
    "description": "Tạo 5 bài viết đầu tiên",
    "icon": "🎉",
    "points": 100,
    "criteria": {
      "type": "post_created",
      "value": 5
    },
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "message": "Thành tích không tồn tại."
}
```

---

### 3. Xem thành tích của user khác

Xem danh sách thành tích mà một user đã đạt được (public profile).

**Endpoint:** `GET /api/users/:userId/achievements`

**Authentication:** Không yêu cầu

**Path Parameters:**
- `userId` (UUID, required): ID của user

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Người mới",
      "description": "Tạo 5 bài viết đầu tiên",
      "icon": "🎉",
      "points": 100,
      "achieved_at": "2024-01-15T10:30:00.000Z",
      "progress": {
        "current": 5,
        "required": 5
      }
    }
  ]
}
```

**Response Error (404):**
```json
{
  "success": false,
  "message": "Người dùng không tồn tại."
}
```

---


## USER APIs

### 4. Lấy thành tích đã đạt được

Lấy danh sách tất cả thành tích mà user hiện tại đã đạt được.

**Endpoint:** `GET /api/users/me/achievements`

**Authentication:** Required (Bearer token)

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Người mới",
      "description": "Tạo 5 bài viết đầu tiên",
      "icon": "🎉",
      "points": 100,
      "criteria": {
        "type": "post_created",
        "value": 5
      },
      "achieved_at": "2024-01-15T10:30:00.000Z",
      "progress": {
        "current": 5,
        "required": 5
      }
    }
  ]
}
```

---

### 5. Lấy tiến độ thành tích

Lấy tiến độ của các thành tích chưa hoàn thành.

**Endpoint:** `GET /api/users/me/achievements/progress`

**Authentication:** Required (Bearer token)

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Chuyên gia",
      "description": "Tạo 50 bài viết",
      "icon": "⭐",
      "points": 500,
      "criteria": {
        "type": "post_created",
        "value": 50
      },
      "progress": {
        "current": 23
      }
    }
  ]
}
```

---

### 6. Lấy thống kê thành tích

Lấy thống kê tổng quan về thành tích của user.

**Endpoint:** `GET /api/users/me/achievements/statistics`

**Authentication:** Required (Bearer token)

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "total_achievements": 15,
    "achieved_count": 5,
    "unachieved_count": 10,
    "total_points": 750,
    "completion_rate": 33.33,
    "recent_achievements": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Người mới",
        "icon": "🎉",
        "points": 100,
        "achieved_at": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

**Fields:**
- `total_achievements`: Tổng số thành tích trong hệ thống
- `achieved_count`: Số thành tích đã đạt
- `unachieved_count`: Số thành tích chưa đạt
- `total_points`: Tổng điểm từ thành tích
- `completion_rate`: Tỷ lệ hoàn thành (%)
- `recent_achievements`: 5 thành tích gần nhất

---

### 7. Lấy thành tích sắp đạt

Lấy danh sách thành tích có tiến độ >= ngưỡng (mặc định 70%).

**Endpoint:** `GET /api/users/me/achievements/almost-achieved`

**Authentication:** Required (Bearer token)

**Query Parameters:**
- `threshold` (float, optional): Ngưỡng % (0.0 - 1.0), mặc định 0.7

**Example Request:**
```
GET /api/users/me/achievements/almost-achieved?threshold=0.8
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Chuyên gia",
      "description": "Tạo 50 bài viết",
      "icon": "⭐",
      "points": 500,
      "criteria": {
        "type": "post_created",
        "value": 50
      },
      "progress": {
        "current": 45
      }
    }
  ]
}
```

**Note:** Kết quả được sắp xếp theo % tiến độ giảm dần.

---


## ADMIN APIs

### 8. Lấy danh sách thành tích (Admin)

Lấy danh sách thành tích với phân trang, tìm kiếm, lọc và sắp xếp.

**Endpoint:** `GET /api/admin/settings/achievements`

**Authentication:** Required (Admin role)

**Query Parameters:**
- `page` (integer, optional): Trang hiện tại (default: 1)
- `limit` (integer, optional): Số item/trang (default: 10)
- `search` (string, optional): Tìm kiếm theo name/description
- `status` (string, optional): `all` | `active` | `inactive` (default: all)
- `sortBy` (string, optional): `created_at` | `points` | `name` (default: created_at)
- `sortOrder` (string, optional): `asc` | `desc` (default: desc)

**Example Request:**
```
GET /api/admin/settings/achievements?page=1&limit=10&search=người&status=active&sortBy=points&sortOrder=desc
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Lấy danh sách thành tích thành công.",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Người mới",
      "description": "Tạo 5 bài viết đầu tiên",
      "criteria": {
        "type": "post_created",
        "value": 5
      },
      "icon": "🎉",
      "points": 100,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

### 9. Tạo thành tích mới

Tạo một thành tích mới trong hệ thống.

**Endpoint:** `POST /api/admin/settings/achievements`

**Authentication:** Required (Admin role)

**Request Body:**
```json
{
  "name": "Người mới",
  "description": "Tạo 5 bài viết đầu tiên",
  "criteria": {
    "type": "post_created",
    "value": 5
  },
  "icon": "🎉",
  "points": 100,
  "is_active": true
}
```

**Fields:**
- `name` (string, required): Tên thành tích (unique)
- `description` (string, required): Mô tả
- `criteria` (object, required): Điều kiện đạt thành tích
  - `type` (string): Loại điều kiện
  - `value` (number): Giá trị yêu cầu
- `icon` (string, optional): Icon/emoji
- `points` (integer, optional): Điểm thưởng (default: 0)
- `is_active` (boolean, optional): Trạng thái (default: true)

**Criteria Types:**
- `post_created`: Số bài viết đã tạo
- `post_likes_received`: Số like nhận được
- `login_streak`: Số ngày đăng nhập liên tiếp
- `comment_count`: Số bình luận
- `follower_count`: Số người theo dõi

**Response Success (201):**
```json
{
  "success": true,
  "message": "Tạo thành tích thành công.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Người mới",
    "description": "Tạo 5 bài viết đầu tiên",
    "criteria": {
      "type": "post_created",
      "value": 5
    },
    "icon": "🎉",
    "points": 100,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response Error (400):**
```json
{
  "success": false,
  "message": "Các trường 'name', 'description', và 'criteria' là bắt buộc."
}
```

**Response Error (409):**
```json
{
  "success": false,
  "message": "Tên thành tích 'Người mới' đã tồn tại."
}
```

---

### 10. Lấy thống kê admin

Lấy thống kê tổng quan về hệ thống thành tích (dành cho admin dashboard).

**Endpoint:** `GET /api/admin/achievements/statistics`

**Authentication:** Required (Admin role)

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "total_achievements": "25",
    "active_achievements": "20",
    "total_users_with_achievements": "1500",
    "total_achievements_granted": "5000",
    "total_points_distributed": "250000",
    "most_popular_achievements": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Người mới",
        "icon": "🎉",
        "user_count": "1200"
      }
    ]
  }
}
```

**Fields:**
- `total_achievements`: Tổng số thành tích
- `active_achievements`: Số thành tích đang active
- `total_users_with_achievements`: Số user có ít nhất 1 thành tích
- `total_achievements_granted`: Tổng số lần trao thành tích
- `total_points_distributed`: Tổng điểm đã phát
- `most_popular_achievements`: Top 5 thành tích phổ biến nhất

---


### 11. Cập nhật thành tích

Cập nhật thông tin của một thành tích.

**Endpoint:** `PUT /api/admin/settings/achievements/:id`

**Authentication:** Required (Admin role)

**Path Parameters:**
- `id` (UUID, required): ID của thành tích

**Request Body:**
```json
{
  "name": "Người mới (Updated)",
  "description": "Mô tả mới",
  "points": 150,
  "icon": "🎊"
}
```

**Note:** Chỉ gửi các field cần cập nhật. Không thể cập nhật `id` và `created_at`.

**Response Success (200):**
```json
{
  "success": true,
  "message": "Cập nhật thành tích thành công.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Người mới (Updated)",
    "description": "Mô tả mới",
    "criteria": {
      "type": "post_created",
      "value": 5
    },
    "icon": "🎊",
    "points": 150,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-20T10:00:00.000Z"
  }
}
```

**Response Error (400):**
```json
{
  "success": false,
  "message": "Không có dữ liệu để cập nhật."
}
```

**Response Error (404):**
```json
{
  "success": false,
  "message": "Thành tích không tồn tại."
}
```

**Response Error (409):**
```json
{
  "success": false,
  "message": "Tên thành tích 'Người mới (Updated)' đã tồn tại."
}
```

---

### 12. Toggle trạng thái

Kích hoạt hoặc vô hiệu hóa một thành tích.

**Endpoint:** `PATCH /api/admin/settings/achievements/:id/status`

**Authentication:** Required (Admin role)

**Path Parameters:**
- `id` (UUID, required): ID của thành tích

**Request Body:**
```json
{
  "is_active": false
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Thành tích đã được vô hiệu hóa.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Người mới",
    "is_active": false,
    "updated_at": "2024-01-20T10:00:00.000Z"
  }
}
```

**Response Error (400):**
```json
{
  "success": false,
  "message": "Trường 'is_active' phải là boolean."
}
```

**Response Error (404):**
```json
{
  "success": false,
  "message": "Thành tích không tồn tại."
}
```

**Note:** Khi vô hiệu hóa, thành tích sẽ không hiển thị cho user mới và không được trao tự động nữa.

---

### 13. Xóa thành tích

Xóa một thành tích khỏi hệ thống.

**Endpoint:** `DELETE /api/admin/settings/achievements/:id`

**Authentication:** Required (Admin role)

**Path Parameters:**
- `id` (UUID, required): ID của thành tích

**Response Success (200):**
```json
{
  "success": true,
  "message": "thành công"
}
```

**Response Error (404):**
```json
{
  "success": false,
  "message": "Thành tích không tồn tại."
}
```

**⚠️ Warning:** 
- Xóa thành tích sẽ tự động xóa tất cả bản ghi `UserAchievements` liên quan (CASCADE)
- User sẽ mất thành tích đã đạt được
- Điểm đã cộng KHÔNG bị trừ lại
- Hành động này KHÔNG THỂ hoàn tác

---

### 14. Lấy users của achievement

Lấy danh sách user đã đạt được một thành tích cụ thể.

**Endpoint:** `GET /api/admin/settings/achievements/:achievementId/users`

**Authentication:** Required (Admin role)

**Path Parameters:**
- `achievementId` (UUID, required): ID của thành tích

**Query Parameters:**
- `page` (integer, optional): Trang hiện tại (default: 1)
- `limit` (integer, optional): Số item/trang (default: 10)

**Example Request:**
```
GET /api/admin/settings/achievements/550e8400-e29b-41d4-a716-446655440000/users?page=1&limit=10
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Lấy danh sách người dùng thành công.",
  "data": {
    "data": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "user_id": "880e8400-e29b-41d4-a716-446655440003",
        "user_name": "Nguyễn Văn A",
        "user_avatar": "https://example.com/avatar.jpg",
        "achievement_id": "550e8400-e29b-41d4-a716-446655440000",
        "achievement_name": "Người mới",
        "achieved_at": "2024-01-15T10:30:00.000Z",
        "progress": {
          "current": 5,
          "required": 5
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1200,
      "totalPages": 120
    }
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "message": "Thành tích không tồn tại."
}
```

---

### 15. Cập nhật tiến độ thủ công

Admin cập nhật tiến độ thành tích cho user (manual override).

**Endpoint:** `POST /api/admin/achievements/progress`

**Authentication:** Required (Admin role)

**Request Body:**
```json
{
  "userId": "880e8400-e29b-41d4-a716-446655440003",
  "criteriaType": "post_created",
  "value": 2
}
```

**Fields:**
- `userId` (UUID, required): ID của user
- `criteriaType` (string, required): Loại criteria
- `value` (number, required): Giá trị cộng thêm

**Cách hoạt động:**
1. Hệ thống lấy tất cả achievements có `criteria.type = criteriaType` mà user chưa đạt
2. Cộng dồn: `currentProgress + value`
3. Nếu đạt điều kiện → Tự động grant achievement + cộng điểm + gửi notification
4. Nếu chưa đạt → Cập nhật progress

**Ví dụ:**
```
User hiện có: 3 posts
Admin gửi: value = 2
Kết quả: 3 + 2 = 5 posts

Nếu achievement yêu cầu 5 posts → Tự động trao thành tích
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Cập nhật tiến độ thành tích thành công.",
  "data": {
    "newlyAchieved": [
      "550e8400-e29b-41d4-a716-446655440000"
    ],
    "updatedProgress": [
      "660e8400-e29b-41d4-a716-446655440001"
    ]
  }
}
```

**Fields:**
- `newlyAchieved`: Danh sách ID thành tích vừa đạt được
- `updatedProgress`: Danh sách ID thành tích có tiến độ được cập nhật

**Response Error (400):**
```json
{
  "success": false,
  "message": "Các trường 'userId', 'criteriaType', và 'value' là bắt buộc."
}
```

---

## Error Codes

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Thiếu field hoặc dữ liệu không hợp lệ |
| 401 | Unauthorized - Token không hợp lệ hoặc hết hạn |
| 403 | Forbidden - Không có quyền truy cập |
| 404 | Not Found - Resource không tồn tại |
| 409 | Conflict - Dữ liệu trùng lặp (unique constraint) |
| 500 | Internal Server Error |

---

## Rate Limiting

Tất cả API đều áp dụng rate limiting:
- Public APIs: 100 requests/15 minutes
- User APIs: 200 requests/15 minutes
- Admin APIs: 500 requests/15 minutes

---

## Postman Collection

Import collection này vào Postman để test API:

```json
{
  "info": {
    "name": "Achievement API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Public",
      "item": [
        {
          "name": "Get All Achievements",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/api/achievements"
          }
        }
      ]
    }
  ]
}
```

---

**Last updated:** 2024-01-20
