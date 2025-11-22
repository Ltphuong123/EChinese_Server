# 📬 Hướng Dẫn Chi Tiết Gửi Thông Báo Cho User

## 📋 Mục Lục
1. [Tổng Quan](#1-tổng-quan)
2. [API Gửi Thông Báo](#2-api-gửi-thông-báo)
3. [Các Ví Dụ Cụ Thể](#3-các-ví-dụ-cụ-thể)
4. [Test Bằng Postman](#4-test-bằng-postman)
5. [Test Bằng Code](#5-test-bằng-code)

---

## 1. Tổng Quan

### Luồng Hoạt Động

```
Admin/System tạo notification
         ↓
Backend lưu vào database
         ↓
Backend gửi push qua Firebase
         ↓
Firebase gửi đến thiết bị user
         ↓
User nhận notification
```

### Các Loại Thông Báo

| Loại | Audience | Mô Tả |
|------|----------|-------|
| **Cá nhân** | `user` | Gửi cho 1 user cụ thể |
| **Broadcast** | `all` | Gửi cho tất cả users |
| **Admin** | `admin` | Gửi cho tất cả admins |

---

## 2. API Gửi Thông Báo

### Endpoint

```
POST /api/notifications
```

### Headers

```
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json
```

### Body Parameters

| Field | Type | Required | Mô Tả |
|-------|------|----------|-------|
| `recipient_id` | uuid | Có (nếu audience='user') | ID người nhận |
| `audience` | string | Có | 'user', 'all', hoặc 'admin' |
| `type` | string | Có | Loại thông báo |
| `title` | string | Có | Tiêu đề |
| `content` | object | Có | `{ message: "..." }` |
| `redirect_url` | string | Không | URL để navigate |
| `priority` | number | Không | 1-3 (mặc định: 1) |
| `data` | object | Không | Dữ liệu custom |

### Response Success

```json
{
  "success": true,
  "message": "Tạo và gửi thông báo thành công",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "recipient_id": "user-id",
    "audience": "user",
    "type": "system",
    "title": "Thông báo",
    "is_push_sent": true,
    "created_at": "2024-01-15T12:00:00.000Z"
  }
}
```

---

## 3. Các Ví Dụ Cụ Thể

### ✅ Ví Dụ 1: Gửi Thông Báo Chào Mừng

**Kịch bản:** User mới đăng ký, gửi thông báo chào mừng

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "system",
    "title": "Chào mừng bạn đến với Hán Tự! 🎉",
    "content": {
      "message": "Cảm ơn bạn đã đăng ký. Hãy bắt đầu học tiếng Trung ngay hôm nay!"
    },
    "redirect_url": "app://home",
    "priority": 2
  }'
```

---

### ✅ Ví Dụ 2: Thông Báo Bài Viết Được Duyệt

**Kịch bản:** Admin duyệt bài viết của user

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "community",
    "title": "Bài viết của bạn đã được duyệt ✅",
    "content": {
      "message": "Bài viết \"Cách học tiếng Trung hiệu quả\" đã được phê duyệt và xuất bản"
    },
    "related_type": "post",
    "related_id": "660e8400-e29b-41d4-a716-446655440001",
    "redirect_url": "app://post/660e8400-e29b-41d4-a716-446655440001",
    "data": {
      "post_id": "660e8400-e29b-41d4-a716-446655440001",
      "post_title": "Cách học tiếng Trung hiệu quả"
    },
    "priority": 2
  }'
```

---

### ✅ Ví Dụ 3: Thông Báo Hệ Thống Bảo Trì

**Kịch bản:** Thông báo bảo trì cho tất cả users

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "audience": "all",
    "type": "system",
    "title": "⚠️ Thông báo bảo trì hệ thống",
    "content": {
      "message": "Hệ thống sẽ bảo trì vào 2h sáng ngày 20/01/2024. Thời gian dự kiến: 30 phút."
    },
    "redirect_url": "app://maintenance",
    "priority": 3,
    "from_system": true,
    "expires_at": "2024-01-20T03:00:00Z"
  }'
```

---

### ✅ Ví Dụ 4: Thông Báo Cập Nhật Mới

**Kịch bản:** Có tính năng mới, thông báo cho tất cả

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "audience": "all",
    "type": "system",
    "title": "🎉 Tính năng mới: HSK 3.0",
    "content": {
      "message": "Chúng tôi vừa cập nhật bộ từ vựng HSK 3.0 mới nhất. Hãy khám phá ngay!"
    },
    "redirect_url": "app://vocab/hsk3",
    "priority": 2,
    "from_system": true
  }'
```

---

### ✅ Ví Dụ 5: Nhắc Nhở Học Tập

**Kịch bản:** Nhắc user học bài

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "system",
    "title": "📚 Đã đến giờ học rồi!",
    "content": {
      "message": "Bạn chưa học bài hôm nay. Hãy dành 10 phút để ôn tập nhé!"
    },
    "redirect_url": "app://lessons",
    "priority": 1
  }'
```

---

### ✅ Ví Dụ 6: Thông Báo Thành Tích

**Kịch bản:** User đạt thành tích mới

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "system",
    "title": "🏆 Chúc mừng! Bạn đã đạt cấp độ mới",
    "content": {
      "message": "Bạn vừa đạt cấp độ HSK 3! Tiếp tục phát huy nhé!"
    },
    "redirect_url": "app://achievements",
    "data": {
      "achievement_id": "hsk3",
      "level": 3
    },
    "priority": 2
  }'
```

---

### ✅ Ví Dụ 7: Cảnh Báo Vi Phạm

**Kịch bản:** User vi phạm quy định

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "comment_ban",
    "title": "⚠️ Cảnh báo vi phạm",
    "content": {
      "message": "Bình luận của bạn vi phạm quy định cộng đồng. Bạn bị cấm bình luận trong 24 giờ."
    },
    "redirect_url": "app://community-rules",
    "expires_at": "2024-01-16T12:00:00Z",
    "priority": 3
  }'
```

---

## 4. Test Bằng Postman

### Bước 1: Tạo Request Mới

1. Mở Postman
2. Click **New** → **HTTP Request**
3. Chọn method **POST**
4. URL: `http://localhost:5000/api/notifications`

### Bước 2: Setup Headers

Click tab **Headers**, thêm:

```
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json
```

### Bước 3: Setup Body

Click tab **Body** → Chọn **raw** → Chọn **JSON**

Paste:

```json
{
  "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
  "audience": "user",
  "type": "system",
  "title": "Test Notification",
  "content": {
    "message": "Đây là test notification từ Postman"
  },
  "redirect_url": "app://home",
  "priority": 2
}
```

### Bước 4: Send

Click **Send** và xem response

---

## 5. Test Bằng Code

### JavaScript (Frontend)

```javascript
async function sendNotification(userId, title, message) {
  const authToken = localStorage.getItem('auth_token');
  
  try {
    const response = await fetch('http://localhost:5000/api/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient_id: userId,
        audience: 'user',
        type: 'system',
        title: title,
        content: {
          message: message
        },
        priority: 2
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Đã gửi thông báo thành công!');
      return data;
    } else {
      console.error('❌ Lỗi:', data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

// Sử dụng
sendNotification(
  '550e8400-e29b-41d4-a716-446655440000',
  'Test Notification',
  'Đây là test notification'
);
```

### Node.js (Backend)

```javascript
const axios = require('axios');

async function sendNotification(userId, title, message) {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/notifications',
      {
        recipient_id: userId,
        audience: 'user',
        type: 'system',
        title: title,
        content: {
          message: message
        },
        priority: 2
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Notification sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return null;
  }
}

// Sử dụng
sendNotification(
  '550e8400-e29b-41d4-a716-446655440000',
  'Test Notification',
  'Đây là test notification'
);
```

### Python

```python
import requests
import json

def send_notification(user_id, title, message):
    url = 'http://localhost:5000/api/notifications'
    headers = {
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN',
        'Content-Type': 'application/json'
    }
    data = {
        'recipient_id': user_id,
        'audience': 'user',
        'type': 'system',
        'title': title,
        'content': {
            'message': message
        },
        'priority': 2
    }
    
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 201:
        print('✅ Notification sent successfully!')
        return response.json()
    else:
        print(f'❌ Error: {response.text}')
        return None

# Sử dụng
send_notification(
    '550e8400-e29b-41d4-a716-446655440000',
    'Test Notification',
    'Đây là test notification'
)
```

---

## 📝 Checklist Gửi Thông Báo

### Trước Khi Gửi:

- [ ] User đã có device token trong database
- [ ] Firebase đã được config đúng
- [ ] Admin token hợp lệ
- [ ] User ID đúng

### Kiểm Tra Sau Khi Gửi:

- [ ] API trả về `success: true`
- [ ] Log server có `✅ Push notification sent`
- [ ] User nhận được notification
- [ ] Click notification navigate đúng

---

## 🔍 Debug

### Nếu không nhận được notification:

1. **Kiểm tra user có device token không:**
```sql
SELECT * FROM "DeviceTokens" WHERE user_id = 'USER_ID';
```

2. **Kiểm tra log server:**
```
✅ Push notification sent for: xxx
✅ Sent: 1, Failed: 0
```

3. **Kiểm tra Firebase:**
- Firebase Console → Cloud Messaging → Usage
- Xem có request không

4. **Kiểm tra frontend:**
- Permission = "granted"
- Service Worker đã đăng ký
- FCM token đã lưu

---

## 🎯 Tóm Tắt

**API Endpoint:**
```
POST /api/notifications
```

**Body Tối Thiểu:**
```json
{
  "recipient_id": "user-id",
  "audience": "user",
  "type": "system",
  "title": "Tiêu đề",
  "content": {
    "message": "Nội dung"
  }
}
```

**Test Nhanh:**
```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipient_id":"USER_ID","audience":"user","type":"system","title":"Test","content":{"message":"Test"}}'
```

---

**Chúc bạn thành công! 🚀**
