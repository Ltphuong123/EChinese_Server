# 📚 API Sổ Tay Mặc Định (Default Notebooks)

## 📋 Tổng Quan

Module này cung cấp các API để quản lý sổ tay mặc định cho user. Mỗi user (không phải admin) sẽ có 4 sổ tay mặc định:
- **đã thuộc** - Lưu từ vựng đã học thuộc
- **chưa thuộc** - Lưu từ vựng chưa học thuộc  
- **yêu thích** - Lưu từ vựng yêu thích
- **không chắc** - Lưu từ vựng chưa chắc chắn

## 🔗 Base URL

```
http://localhost:3000/api
```

---

## 👤 API CHO USER THƯỜNG

### 1. Tạo Sổ Tay Mặc Định Cho Chính Mình

Tạo 4 sổ tay mặc định cho user hiện tại.

**Endpoint:**
```
POST /default-notebooks/create-mine
```

**Headers:**
```json
{
  "Authorization": "Bearer <user_token>",
  "Content-Type": "application/json"
}
```

**Request Body:** Không cần

**Response Success (201):**
```json
{
  "success": true,
  "message": "Đã tạo thành công 4 sổ tay mặc định",
  "data": {
    "userId": "uuid-123",
    "username": "user1",
    "notebooks": [
      {
        "id": "uuid-nb-1",
        "name": "đã thuộc",
        "status": "published",
        "vocab_count": 0,
        "is_premium": false
      },
      {
        "id": "uuid-nb-2",
        "name": "chưa thuộc",
        "status": "published",
        "vocab_count": 0,
        "is_premium": false
      },
      {
        "id": "uuid-nb-3",
        "name": "yêu thích",
        "status": "published",
        "vocab_count": 0,
        "is_premium": false
      },
      {
        "id": "uuid-nb-4",
        "name": "không chắc",
        "status": "published",
        "vocab_count": 0,
        "is_premium": false
      }
    ],
    "count": 4
  }
}
```

**Response Error (400):**
```json
{
  "success": false,
  "message": "User đã có sổ tay mặc định."
}
```

---

### 2. Kiểm Tra Sổ Tay Mặc Định Của Mình

Kiểm tra xem user hiện tại đã có sổ tay mặc định chưa.

**Endpoint:**
```
GET /default-notebooks/check-mine
```

**Headers:**
```json
{
  "Authorization": "Bearer <user_token>"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Lấy thông tin sổ tay mặc định thành công",
  "data": {
    "userId": "uuid-123",
    "username": "user1",
    "hasDefaultNotebooks": true,
    "count": 4,
    "isComplete": true,
    "notebooks": [
      {
        "id": "uuid-nb-1",
        "name": "đã thuộc",
        "vocab_count": 10
      },
      {
        "id": "uuid-nb-2",
        "name": "chưa thuộc",
        "vocab_count": 25
      },
      {
        "id": "uuid-nb-3",
        "name": "yêu thích",
        "vocab_count": 5
      },
      {
        "id": "uuid-nb-4",
        "name": "không chắc",
        "vocab_count": 8
      }
    ]
  }
}
```

---

## 👨‍💼 API CHO ADMIN

### 3. Tạo Sổ Tay Cho Tất Cả User

Tạo sổ tay mặc định cho tất cả user trong hệ thống (trừ admin).

**Endpoint:**
```
POST /admin/default-notebooks/create-all
```

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>",
  "Content-Type": "application/json"
}
```

**Request Body:** Không cần

**Response Success (200):**
```json
{
  "success": true,
  "message": "Hoàn thành! Thành công: 10, Bỏ qua: 5, Thất bại: 0",
  "data": {
    "total": 15,
    "success": [
      {
        "userId": "uuid-1",
        "username": "user1",
        "notebooks": [
          { "id": "uuid-nb-1", "name": "đã thuộc" },
          { "id": "uuid-nb-2", "name": "chưa thuộc" },
          { "id": "uuid-nb-3", "name": "yêu thích" },
          { "id": "uuid-nb-4", "name": "không chắc" }
        ],
        "count": 4
      }
    ],
    "skipped": [
      {
        "userId": "uuid-2",
        "username": "user2",
        "reason": "Đã có sổ tay mặc định"
      }
    ],
    "failed": []
  }
}
```

---

### 4. Tạo Sổ Tay Cho User Cụ Thể

Tạo sổ tay mặc định cho một user cụ thể.

**Endpoint:**
```
POST /admin/default-notebooks/user/:userId
```

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>",
  "Content-Type": "application/json"
}
```

**URL Parameters:**
- `userId` (required): UUID của user

**Response Success (201):**
```json
{
  "success": true,
  "message": "Đã tạo thành công 4 sổ tay mặc định cho user user1",
  "data": {
    "userId": "uuid-123",
    "username": "user1",
    "notebooks": [...],
    "count": 4
  }
}
```

**Response Error (400):**
```json
{
  "success": false,
  "message": "User đã có sổ tay mặc định."
}
```

---

### 5. Kiểm Tra Sổ Tay Của User

Kiểm tra sổ tay mặc định của một user cụ thể.

**Endpoint:**
```
GET /admin/default-notebooks/user/:userId/check
```

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>"
}
```

**URL Parameters:**
- `userId` (required): UUID của user

**Response Success (200):**
```json
{
  "success": true,
  "message": "Lấy thông tin sổ tay mặc định thành công",
  "data": {
    "userId": "uuid-123",
    "username": "user1",
    "hasDefaultNotebooks": true,
    "count": 4,
    "isComplete": true,
    "notebooks": [...]
  }
}
```

---

### 6. Lấy Thống Kê Sổ Tay

Lấy thống kê sổ tay mặc định của tất cả user.

**Endpoint:**
```
GET /admin/default-notebooks/statistics
```

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Lấy thống kê thành công",
  "data": {
    "totalUsers": 100,
    "usersWithNotebooks": 80,
    "usersWithoutNotebooks": 15,
    "usersWithIncompleteNotebooks": 5,
    "details": [
      {
        "userId": "uuid-1",
        "username": "user1",
        "notebookCount": 4,
        "status": "complete"
      },
      {
        "userId": "uuid-2",
        "username": "user2",
        "notebookCount": 0,
        "status": "none"
      },
      {
        "userId": "uuid-3",
        "username": "user3",
        "notebookCount": 2,
        "status": "incomplete"
      }
    ]
  }
}
```

**Status Values:**
- `complete`: Có đủ 4 sổ tay
- `none`: Chưa có sổ tay nào
- `incomplete`: Có 1-3 sổ tay (thiếu)

---

### 7. Tạo Lại Sổ Tay Cho User

Xóa sổ tay mặc định cũ và tạo lại mới cho user.

**Endpoint:**
```
POST /admin/default-notebooks/user/:userId/recreate
```

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>",
  "Content-Type": "application/json"
}
```

**URL Parameters:**
- `userId` (required): UUID của user

**Response Success (200):**
```json
{
  "success": true,
  "message": "Đã xóa 4 sổ tay cũ và tạo lại 4 sổ tay mới cho user user1",
  "data": {
    "userId": "uuid-123",
    "username": "user1",
    "deletedCount": 4,
    "notebooks": [...],
    "count": 4
  }
}
```

---

## 🔒 Phân Quyền

### User Thường
- ✅ Tạo sổ tay cho chính mình
- ✅ Kiểm tra sổ tay của chính mình
- ❌ Không thể tạo cho user khác
- ❌ Không thể xem thống kê

### Admin / Super Admin
- ✅ Tạo sổ tay cho bất kỳ user nào
- ✅ Tạo hàng loạt cho tất cả user
- ✅ Kiểm tra sổ tay của bất kỳ user nào
- ✅ Xem thống kê toàn hệ thống
- ✅ Tạo lại sổ tay cho user
- ❌ Không thể tạo sổ tay cho chính mình (admin)

---

## 📊 Use Cases

### 1. User Mới Đăng Ký
```javascript
// Sau khi user đăng ký thành công
POST /default-notebooks/create-mine
```

### 2. Migration Cho User Hiện Tại
```javascript
// Admin chạy một lần để tạo cho tất cả user
POST /admin/default-notebooks/create-all
```

### 3. Kiểm Tra Trước Khi Tạo
```javascript
// User kiểm tra xem đã có sổ tay chưa
GET /default-notebooks/check-mine

// Nếu chưa có, tạo mới
if (!data.hasDefaultNotebooks) {
  POST /default-notebooks/create-mine
}
```

### 4. Admin Theo Dõi
```javascript
// Xem thống kê tổng quan
GET /admin/default-notebooks/statistics

// Kiểm tra user cụ thể
GET /admin/default-notebooks/user/:userId/check

// Tạo lại nếu bị lỗi
POST /admin/default-notebooks/user/:userId/recreate
```

---

## 🧪 Testing

### Test với cURL

**User tạo cho mình:**
```bash
curl -X POST http://localhost:3000/api/default-notebooks/create-mine \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json"
```

**Admin tạo cho tất cả:**
```bash
curl -X POST http://localhost:3000/api/admin/default-notebooks/create-all \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Kiểm tra thống kê:**
```bash
curl -X GET http://localhost:3000/api/admin/default-notebooks/statistics \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## ⚠️ Lưu Ý

1. **Không tạo trùng lặp**: API tự động kiểm tra và bỏ qua user đã có sổ tay
2. **Admin không có sổ tay mặc định**: Chỉ user thường mới có
3. **Transaction safety**: Tất cả thao tác đều dùng transaction để đảm bảo tính toàn vẹn
4. **Soft check**: Chỉ cần có 1 trong 4 sổ tay là coi như đã có (tránh tạo trùng)

---

## 🐛 Error Codes

| Status | Message | Nguyên nhân |
|--------|---------|-------------|
| 400 | User đã có sổ tay mặc định | User đã có ít nhất 1 sổ tay mặc định |
| 400 | Không thể tạo sổ tay mặc định cho admin | Cố tạo cho admin/super admin |
| 401 | Unauthorized | Token không hợp lệ hoặc thiếu |
| 403 | Forbidden | User thường cố truy cập API admin |
| 404 | User không tồn tại | userId không tồn tại trong DB |
| 500 | Internal Server Error | Lỗi database hoặc server |

---

## 📞 Support

Nếu gặp vấn đề, liên hệ team dev hoặc tạo issue.
