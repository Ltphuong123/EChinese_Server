# 📬 API Đơn Giản Gửi Thông Báo

## 🎯 2 API Đơn Giản Nhất

### 1️⃣ Gửi Thông Báo Cho 1 User

```
POST /api/send-notification
```

**Body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Tiêu đề thông báo",
  "message": "Nội dung thông báo",
  "url": "app://home",
  "priority": 2
}
```

**Ví dụ curl:**
```bash
curl -X POST http://localhost:5000/api/send-notification \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Chào mừng!",
    "message": "Chào mừng bạn đến với ứng dụng",
    "url": "app://home"
  }'
```

---

### 2️⃣ Gửi Thông Báo Cho Tất Cả Users

```
POST /api/send-notification-all
```

**Body:**
```json
{
  "title": "Thông báo quan trọng",
  "message": "Hệ thống sẽ bảo trì vào 2h sáng mai",
  "url": "app://maintenance",
  "priority": 3
}
```

**Ví dụ curl:**
```bash
curl -X POST http://localhost:5000/api/send-notification-all \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Thông báo bảo trì",
    "message": "Hệ thống sẽ bảo trì vào 2h sáng mai",
    "priority": 3
  }'
```

---

## 📝 Parameters

### API 1: Gửi cho 1 user

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| `user_id` | string | ✅ Có | ID của user nhận thông báo |
| `title` | string | ✅ Có | Tiêu đề thông báo |
| `message` | string | ✅ Có | Nội dung thông báo |
| `url` | string | ❌ Không | URL để navigate (vd: app://home) |
| `priority` | number | ❌ Không | 1-3, mặc định 1 |

### API 2: Gửi cho tất cả

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| `title` | string | ✅ Có | Tiêu đề thông báo |
| `message` | string | ✅ Có | Nội dung thông báo |
| `url` | string | ❌ Không | URL để navigate |
| `priority` | number | ❌ Không | 1-3, mặc định 2 |

---

## ✅ Response Success

```json
{
  "success": true,
  "message": "Đã gửi thông báo thành công",
  "data": {
    "notification_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "660e8400-e29b-41d4-a716-446655440001",
    "title": "Chào mừng!",
    "message": "Chào mừng bạn đến với ứng dụng",
    "sent_at": "2024-01-15T12:00:00.000Z"
  }
}
```

---

## ❌ Response Error

```json
{
  "success": false,
  "message": "Trường 'user_id' là bắt buộc"
}
```

---

## 🧪 Test Nhanh

### Test 1: Gửi cho 1 user

```bash
curl -X POST http://localhost:5000/api/send-notification \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "title": "Test",
    "message": "Đây là test notification"
  }'
```

### Test 2: Gửi cho tất cả

```bash
curl -X POST http://localhost:5000/api/send-notification-all \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Broadcast",
    "message": "Đây là test broadcast notification"
  }'
```

---

## 💡 Ví Dụ Sử Dụng

### JavaScript

```javascript
// Gửi cho 1 user
async function sendNotification(userId, title, message) {
  const response = await fetch('http://localhost:5000/api/send-notification', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: userId,
      title: title,
      message: message
    })
  });
  
  return await response.json();
}

// Gửi cho tất cả
async function sendBroadcast(title, message) {
  const response = await fetch('http://localhost:5000/api/send-notification-all', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: title,
      message: message,
      priority: 3
    })
  });
  
  return await response.json();
}
```

---

## 🎯 Tóm Tắt

**Gửi cho 1 user:**
```
POST /api/send-notification
Body: { user_id, title, message }
```

**Gửi cho tất cả:**
```
POST /api/send-notification-all
Body: { title, message }
```

**Đơn giản vậy thôi! 🚀**
