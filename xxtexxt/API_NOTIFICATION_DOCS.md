# 📬 API Thông Báo - Documentation

## 📋 Tổng Quan

API để quản lý thông báo trong hệ thống, bao gồm tạo, gửi, và lấy danh sách thông báo.

**Base URL:** `/api/notifications`

---

## 🔔 1. Lấy Danh Sách Thông Báo

### Endpoint
```
GET /api/notifications
```

### Authentication
✅ Required - Bearer Token

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Số trang (bắt đầu từ 1) |
| `limit` | number | No | 20 | Số lượng thông báo mỗi trang (max: 100) |
| `type` | string | No | null | Lọc theo loại thông báo |
| `unread_only` | boolean | No | false | Chỉ lấy thông báo chưa đọc |

### Type Values
- `system` - Thông báo hệ thống
- `community` - Thông báo cộng đồng (like, comment)
- `comment_ban` - Thông báo cấm bình luận
- Hoặc các type custom khác

### Request Example

```bash
# Lấy trang 1, mỗi trang 20 thông báo
GET /api/notifications?page=1&limit=20

# Lấy chỉ thông báo chưa đọc
GET /api/notifications?unread_only=true

# Lọc theo type
GET /api/notifications?type=community&page=1&limit=10

# Kết hợp nhiều filter
GET /api/notifications?type=system&unread_only=true&limit=50
```

### Response Success (200)

```json
{
  "success": true,
  "message": "Lấy danh sách thông báo thành công",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "community",
      "title": "Ai đó đã thích bài viết của bạn",
      "content": {
        "message": "John Doe đã thích bài viết \"Học tiếng Trung như thế nào?\""
      },
      "related_type": "post",
      "related_id": "660e8400-e29b-41d4-a716-446655440001",
      "redirect_url": "app://post/660e8400-e29b-41d4-a716-446655440001",
      "priority": 1,
      "is_read": false,
      "read_at": null,
      "created_at": "2024-01-15T10:30:00.000Z",
      "expires_at": null,
      "data": {
        "liker_id": "770e8400-e29b-41d4-a716-446655440002",
        "liker_name": "John Doe",
        "post_id": "660e8400-e29b-41d4-a716-446655440001"
      }
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "type": "system",
      "title": "Cập nhật từ Hán Tự",
      "content": {
        "message": "HSK 3.0 đã có mặt trên ứng dụng!"
      },
      "related_type": null,
      "related_id": null,
      "redirect_url": "app://vocab/hsk3",
      "priority": 2,
      "is_read": true,
      "read_at": "2024-01-15T11:00:00.000Z",
      "created_at": "2024-01-15T09:00:00.000Z",
      "expires_at": null,
      "data": {}
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "unreadCount": 12
  }
}
```

### Response Fields

#### Notification Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | ID thông báo |
| `type` | string | Loại thông báo |
| `title` | string | Tiêu đề |
| `content` | object | Nội dung (có field `message`) |
| `related_type` | string\|null | Loại đối tượng liên quan (post, comment) |
| `related_id` | uuid\|null | ID đối tượng liên quan |
| `redirect_url` | string\|null | URL để navigate khi click |
| `priority` | number | Độ ưu tiên (1-3, cao hơn = quan trọng hơn) |
| `is_read` | boolean | Đã đọc chưa |
| `read_at` | timestamp\|null | Thời gian đọc |
| `created_at` | timestamp | Thời gian tạo |
| `expires_at` | timestamp\|null | Thời gian hết hạn |
| `data` | object | Dữ liệu custom |

#### Meta Object

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Tổng số thông báo |
| `page` | number | Trang hiện tại |
| `limit` | number | Số lượng mỗi trang |
| `totalPages` | number | Tổng số trang |
| `unreadCount` | number | Số thông báo chưa đọc |

### Response Error (500)

```json
{
  "success": false,
  "message": "Lỗi khi lấy danh sách thông báo",
  "error": "Database connection failed"
}
```

### Response Error (401)

```json
{
  "success": false,
  "message": "Không có token, truy cập bị từ chối"
}
```

---

## 📤 2. Tạo và Gửi Thông Báo (Admin Only)

### Endpoint
```
POST /api/notifications
```

### Authentication
✅ Required - Bearer Token (Admin only)

### Request Body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `recipient_id` | uuid | Conditional | null | ID người nhận (bắt buộc nếu audience='user') |
| `audience` | string | Yes | - | Đối tượng nhận: 'user', 'all', 'admin' |
| `type` | string | Yes | - | Loại thông báo |
| `title` | string | Yes | - | Tiêu đề |
| `content` | object | Yes | - | Nội dung (phải có field `message`) |
| `related_type` | string | No | null | Loại đối tượng liên quan |
| `related_id` | uuid | No | null | ID đối tượng liên quan |
| `data` | object | No | {} | Dữ liệu custom |
| `redirect_url` | string | No | null | URL để navigate |
| `expires_at` | timestamp | No | null | Thời gian hết hạn |
| `priority` | number | No | 1 | Độ ưu tiên (1-3) |
| `from_system` | boolean | No | false | Từ hệ thống hay không |
| `auto_push` | boolean | No | true | Tự động gửi push notification |

### Audience Values
- `user` - Gửi cho một user cụ thể (cần `recipient_id`)
- `all` - Gửi broadcast cho tất cả users (không cần `recipient_id`)
- `admin` - Gửi cho tất cả admins

### Request Examples

#### 1. Gửi thông báo cho một user

```bash
POST /api/notifications
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
  "audience": "user",
  "type": "system",
  "title": "Chào mừng bạn!",
  "content": {
    "message": "Chào mừng bạn đến với ứng dụng Hán Tự"
  },
  "redirect_url": "app://home",
  "priority": 1
}
```

#### 2. Gửi broadcast cho tất cả users

```bash
POST /api/notifications
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "audience": "all",
  "type": "system",
  "title": "Bảo trì hệ thống",
  "content": {
    "message": "Hệ thống sẽ bảo trì vào 2h sáng ngày 20/01/2024"
  },
  "redirect_url": "app://maintenance",
  "priority": 3,
  "from_system": true,
  "expires_at": "2024-01-20T02:00:00Z"
}
```

#### 3. Thông báo liên quan đến bài viết

```bash
POST /api/notifications
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
  "audience": "user",
  "type": "community",
  "title": "Bài viết của bạn đã được duyệt",
  "content": {
    "message": "Bài viết \"Học tiếng Trung\" đã được phê duyệt và xuất bản"
  },
  "related_type": "post",
  "related_id": "660e8400-e29b-41d4-a716-446655440001",
  "redirect_url": "app://post/660e8400-e29b-41d4-a716-446655440001",
  "data": {
    "post_title": "Học tiếng Trung",
    "approved_by": "admin"
  },
  "priority": 2
}
```

#### 4. Tạo thông báo nhưng không gửi push ngay

```bash
POST /api/notifications
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
  "audience": "user",
  "type": "system",
  "title": "Thông báo quan trọng",
  "content": {
    "message": "Bạn có một thông báo quan trọng"
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
    "id": "550e8400-e29b-41d4-a716-446655440005",
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "system",
    "title": "Chào mừng bạn!",
    "content": {
      "message": "Chào mừng bạn đến với ứng dụng Hán Tự"
    },
    "redirect_url": "app://home",
    "priority": 1,
    "is_push_sent": true,
    "created_at": "2024-01-15T12:00:00.000Z"
  }
}
```

### Response Error (400) - Validation

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

### Response Error (403)

```json
{
  "success": false,
  "message": "Truy cập bị từ chối, chỉ dành cho admin"
}
```

### Response Error (500)

```json
{
  "success": false,
  "message": "Lỗi khi tạo thông báo",
  "error": "Database connection failed"
}
```

---

## 🔢 3. Lấy Số Thông Báo Chưa Đọc

### Endpoint
```
GET /api/notifications/unread-count
```

### Authentication
✅ Required - Bearer Token

### Response Success (200)

```json
{
  "success": true,
  "data": {
    "count": 12
  }
}
```

---

## ✅ 4. Đánh Dấu Đã Đọc/Chưa Đọc

### Endpoint
```
POST /api/notifications/mark-read
```

### Authentication
✅ Required - Bearer Token

### Request Body

```json
{
  "ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ],
  "asRead": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ids` | array | Yes | Mảng ID thông báo |
| `asRead` | boolean | Yes | true = đánh dấu đã đọc, false = chưa đọc |

### Response Success (200)

```json
{
  "success": true,
  "message": "Đã đánh dấu 2 thông báo thành công."
}
```

---

## 📊 Use Cases

### 1. Hiển thị danh sách thông báo trong app

```javascript
// Lấy trang đầu tiên
const response = await fetch('/api/notifications?page=1&limit=20', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data, meta } = await response.json();

// Hiển thị notifications
data.forEach(notif => {
  console.log(notif.title, notif.is_read);
});

// Hiển thị badge
console.log('Unread:', meta.unreadCount);
```

### 2. Load more (infinite scroll)

```javascript
let currentPage = 1;

async function loadMore() {
  currentPage++;
  const response = await fetch(`/api/notifications?page=${currentPage}&limit=20`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const { data } = await response.json();
  // Append to list
  appendNotifications(data);
}
```

### 3. Lọc chỉ thông báo chưa đọc

```javascript
const response = await fetch('/api/notifications?unread_only=true', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### 4. Admin gửi thông báo hệ thống

```javascript
const response = await fetch('/api/notifications', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    audience: 'all',
    type: 'system',
    title: 'Cập nhật mới',
    content: { message: 'Phiên bản 2.0 đã ra mắt!' },
    redirect_url: 'app://updates',
    priority: 2
  })
});
```

### 5. Đánh dấu đã đọc khi user xem

```javascript
async function markAsRead(notificationIds) {
  await fetch('/api/notifications/mark-read', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ids: notificationIds,
      asRead: true
    })
  });
}
```

---

## 🔐 Authorization

### User Endpoints
- `GET /api/notifications` - Lấy thông báo của chính mình
- `GET /api/notifications/unread-count` - Lấy số thông báo chưa đọc
- `POST /api/notifications/mark-read` - Đánh dấu đã đọc

### Admin Endpoints
- `POST /api/notifications` - Tạo và gửi thông báo
- `POST /api/notifications/publish` - Gửi push cho thông báo đã tạo
- `POST /api/notifications/delete` - Xóa thông báo

---

## 📝 Notes

1. **Pagination:** Mặc định mỗi trang 20 items, tối đa 100 items/page
2. **Sorting:** Thông báo được sắp xếp theo priority (cao → thấp) và created_at (mới → cũ)
3. **Expires:** Thông báo hết hạn sẽ không hiển thị trong danh sách
4. **Push Notification:** Khi tạo thông báo với `auto_push: true`, hệ thống tự động gửi push qua FCM
5. **Audience Logic:**
   - `user`: Chỉ user có `recipient_id` nhận được
   - `all`: Tất cả users nhận được
   - `admin`: Chỉ users có role admin/super admin nhận được

---

## 🧪 Testing với Postman/curl

### Get Notifications
```bash
curl -X GET "http://localhost:5000/api/notifications?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Notification (Admin)
```bash
curl -X POST "http://localhost:5000/api/notifications" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "audience": "all",
    "type": "system",
    "title": "Test Notification",
    "content": { "message": "This is a test" }
  }'
```

### Mark as Read
```bash
curl -X POST "http://localhost:5000/api/notifications/mark-read" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["550e8400-e29b-41d4-a716-446655440000"],
    "asRead": true
  }'
```

---

## ✅ Checklist Integration

- [ ] Hiểu cấu trúc response
- [ ] Implement pagination
- [ ] Hiển thị badge unread count
- [ ] Xử lý click notification → navigate
- [ ] Đánh dấu đã đọc khi xem
- [ ] Filter theo type (optional)
- [ ] Infinite scroll (optional)
- [ ] Pull to refresh (optional)

---

**Happy coding! 🚀**
