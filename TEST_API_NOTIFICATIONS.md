# 🧪 Test API Thông Báo - Dữ Liệu Mẫu

## 📋 Mục Lục

1. [API Đơn Giản](#api-đơn-giản)
2. [API Đầy Đủ](#api-đầy-đủ)
3. [Test Tự Động](#test-tự-động)

---

## 1️⃣ API ĐơN GIẢN

### Test 1: Gửi Thông Báo Cho 1 User

```bash
curl -X POST http://localhost:5000/api/send-notification \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "🎉 Chào mừng bạn!",
    "message": "Cảm ơn bạn đã đăng ký ứng dụng Hán Tự",
    "redirect_type": "onboarding",
    "data": {
      "welcome_bonus": "100",
      "free_trial_days": "7"
    },
    "priority": 2
  }'
```

### Test 2: Gửi Broadcast Cho Tất Cả

```bash
curl -X POST http://localhost:5000/api/send-notification-all \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "⚠️ Thông báo bảo trì hệ thống",
    "message": "Hệ thống sẽ bảo trì vào 2h sáng ngày 20/01/2024. Thời gian dự kiến: 30 phút.",
    "redirect_type": "maintenance",
    "data": {
      "scheduled_at": "2024-01-20T02:00:00Z",
      "scheduled_time": "2h sáng ngày 20/01/2024",
      "duration_minutes": "30",
      "affected_services": "Tất cả dịch vụ"
    },
    "priority": 3
  }'
```

### Test 3: Thông Báo Không Điều Hướng

```bash
curl -X POST http://localhost:5000/api/send-notification \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "🎉 Chúc mừng năm mới!",
    "message": "Chúc bạn một năm mới tràn đầy năng lượng và thành công!",
    "redirect_type": "none",
    "data": {},
    "priority": 1
  }'
```

---

## 2️⃣ API ĐẦY ĐỦ

### Test 4: Like Bài Viết (Giả Lập)

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "community",
    "title": "❤️ John Doe đã thích bài viết của bạn",
    "content": {
      "message": "John Doe đã thích bài viết \"Cách học tiếng Trung hiệu quả\""
    },
    "redirect_type": "post",
    "data": {
      "post_id": "660e8400-e29b-41d4-a716-446655440001",
      "post_title": "Cách học tiếng Trung hiệu quả",
      "liker_id": "770e8400-e29b-41d4-a716-446655440002",
      "liker_name": "John Doe",
      "liker_avatar": "https://example.com/avatar.jpg"
    },
    "priority": 1
  }'
```

### Test 5: Comment Bài Viết (Giả Lập)

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "community",
    "title": "💬 Jane Smith đã bình luận bài viết của bạn",
    "content": {
      "message": "Jane Smith đã bình luận: \"Bài viết rất hay, cảm ơn bạn!\""
    },
    "redirect_type": "post_comment",
    "data": {
      "post_id": "660e8400-e29b-41d4-a716-446655440001",
      "comment_id": "880e8400-e29b-41d4-a716-446655440003",
      "commenter_id": "990e8400-e29b-41d4-a716-446655440004",
      "commenter_name": "Jane Smith",
      "commenter_avatar": "https://example.com/avatar2.jpg",
      "comment_preview": "Bài viết rất hay, cảm ơn bạn!"
    },
    "priority": 1
  }'
```

### Test 6: Cấm Bình Luận

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "comment_ban",
    "title": "⚠️ Bạn đã bị cấm bình luận tạm thời",
    "content": {
      "message": "Bạn bị cấm bình luận trong 7 ngày do vi phạm: Ngôn từ không phù hợp"
    },
    "redirect_type": "community_rules",
    "data": {
      "ban_days": "7",
      "reason": "Ngôn từ không phù hợp",
      "report_id": "bb0e8400-e29b-41d4-a716-446655440007",
      "violation_id": "cc0e8400-e29b-41d4-a716-446655440008",
      "expires_at": "2024-01-23T10:00:00Z"
    },
    "expires_at": "2024-01-23T10:00:00Z",
    "priority": 3,
    "from_system": true
  }'
```

### Test 7: Đạt Thành Tích

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "achievement",
    "title": "🏆 Chúc mừng! Bạn đã đạt thành tích mới",
    "content": {
      "message": "Bạn đã đạt thành tích \"Người Mới Bắt Đầu\" và nhận được 50 điểm!"
    },
    "redirect_type": "achievement",
    "data": {
      "achievement_id": "ee0e8400-e29b-41d4-a716-446655440010",
      "achievement_name": "Người Mới Bắt Đầu",
      "achievement_description": "Tạo 5 bài viết đầu tiên",
      "achievement_icon": "🌟",
      "points": "50",
      "achieved_at": "2024-01-16T10:00:00Z",
      "progress_current": "5",
      "progress_required": "5"
    },
    "priority": 2,
    "from_system": true
  }'
```

### Test 8: Thanh Toán Thành Công

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "payment_success",
    "title": "✅ Thanh toán thành công!",
    "content": {
      "message": "Bạn đã đăng ký gói Premium 6 Tháng thành công. Gói sẽ có hiệu lực đến 16/07/2024."
    },
    "redirect_type": "subscription",
    "data": {
      "subscription_id": "ff0e8400-e29b-41d4-a716-446655440011",
      "package_id": "gg0e8400-e29b-41d4-a716-446655440012",
      "package_name": "Gói Premium 6 Tháng",
      "amount": "599000",
      "currency": "VND",
      "payment_method": "momo",
      "transaction_id": "TXN123456789",
      "activated_at": "2024-01-16T10:00:00Z",
      "expires_at": "2024-07-16T10:00:00Z"
    },
    "priority": 2,
    "from_system": true
  }'
```

### Test 9: Gói Sắp Hết Hạn

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "subscription_expiring",
    "title": "⏰ Gói Premium 6 Tháng sắp hết hạn",
    "content": {
      "message": "Gói Premium 6 Tháng của bạn sẽ hết hạn vào 16/07/2024. Gia hạn ngay để tiếp tục sử dụng!"
    },
    "redirect_type": "subscription_renew",
    "data": {
      "subscription_id": "ff0e8400-e29b-41d4-a716-446655440011",
      "package_id": "gg0e8400-e29b-41d4-a716-446655440012",
      "package_name": "Gói Premium 6 Tháng",
      "expires_at": "2024-07-16T10:00:00Z",
      "days_remaining": "7",
      "can_renew": "true"
    },
    "priority": 2,
    "from_system": true
  }'
```

### Test 10: Kết Quả Thi - Đỗ

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "exam_result",
    "title": "🎉 Chúc mừng! Bạn đã đỗ kỳ thi HSK 3",
    "content": {
      "message": "Bạn đã đạt 85/100 điểm trong kỳ thi HSK 3 - Đề thi thử. Xuất sắc!"
    },
    "redirect_type": "exam_result",
    "data": {
      "exam_id": "jj0e8400-e29b-41d4-a716-446655440015",
      "exam_name": "HSK 3 - Đề thi thử",
      "attempt_id": "kk0e8400-e29b-41d4-a716-446655440016",
      "score": "85",
      "total": "100",
      "passing_score": "60",
      "passed": "true",
      "rank": "Xuất sắc",
      "completed_at": "2024-01-16T14:30:00Z"
    },
    "priority": 2,
    "from_system": true
  }'
```

### Test 11: Follow User

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "follow",
    "title": "👤 Jane Smith đã theo dõi bạn",
    "content": {
      "message": "Jane Smith đã bắt đầu theo dõi bạn"
    },
    "redirect_type": "profile",
    "data": {
      "user_id": "oo0e8400-e29b-41d4-a716-446655440020",
      "follower_name": "Jane Smith",
      "follower_avatar": "https://example.com/avatar.jpg",
      "follower_level": "5",
      "followed_at": "2024-01-16T10:00:00Z"
    },
    "priority": 1
  }'
```

### Test 12: Lên Cấp Độ

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "level_up",
    "title": "🎉 Chúc mừng! Bạn đã lên cấp 6",
    "content": {
      "message": "Bạn đã đạt cấp độ 6 với 1250 điểm cộng đồng!"
    },
    "redirect_type": "profile",
    "data": {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "old_level": "5",
      "new_level": "6",
      "total_points": "1250",
      "next_level_points": "1500",
      "level_name": "Học Viên Xuất Sắc",
      "unlocked_features": "Tạo poll, Đăng video"
    },
    "priority": 2,
    "from_system": true
  }'
```

---

## 3️⃣ TEST TỰ ĐỘNG

### Postman Collection

Tạo file `notifications_test.postman_collection.json`:

```json
{
  "info": {
    "name": "Notifications API Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Send to User - Welcome",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{admin_token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"user_id\": \"{{test_user_id}}\",\n  \"title\": \"🎉 Chào mừng bạn!\",\n  \"message\": \"Cảm ơn bạn đã đăng ký ứng dụng Hán Tự\",\n  \"redirect_type\": \"onboarding\",\n  \"data\": {\n    \"welcome_bonus\": \"100\",\n    \"free_trial_days\": \"7\"\n  },\n  \"priority\": 2\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/send-notification",
          "host": ["{{base_url}}"],
          "path": ["api", "send-notification"]
        }
      }
    },
    {
      "name": "2. Send to All - Maintenance",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{admin_token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"title\": \"⚠️ Thông báo bảo trì hệ thống\",\n  \"message\": \"Hệ thống sẽ bảo trì vào 2h sáng ngày 20/01/2024\",\n  \"redirect_type\": \"maintenance\",\n  \"data\": {\n    \"scheduled_at\": \"2024-01-20T02:00:00Z\",\n    \"duration_minutes\": \"30\"\n  },\n  \"priority\": 3\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/send-notification-all",
          "host": ["{{base_url}}"],
          "path": ["api", "send-notification-all"]
        }
      }
    },
    {
      "name": "3. Get Notifications",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{user_token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/notifications?page=1&limit=10",
          "host": ["{{base_url}}"],
          "path": ["api", "notifications"],
          "query": [
            {
              "key": "page",
              "value": "1"
            },
            {
              "key": "limit",
              "value": "10"
            }
          ]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:5000"
    },
    {
      "key": "admin_token",
      "value": "YOUR_ADMIN_TOKEN"
    },
    {
      "key": "user_token",
      "value": "YOUR_USER_TOKEN"
    },
    {
      "key": "test_user_id",
      "value": "550e8400-e29b-41d4-a716-446655440000"
    }
  ]
}
```

### Node.js Test Script

Tạo file `test-notifications.js`:

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const ADMIN_TOKEN = 'YOUR_ADMIN_TOKEN';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testNotifications() {
  console.log('🧪 Starting notification tests...\n');

  // Test 1: Welcome notification
  try {
    console.log('Test 1: Welcome notification');
    const response1 = await api.post('/api/send-notification', {
      user_id: TEST_USER_ID,
      title: '🎉 Chào mừng bạn!',
      message: 'Cảm ơn bạn đã đăng ký ứng dụng Hán Tự',
      redirect_type: 'onboarding',
      data: {
        welcome_bonus: '100',
        free_trial_days: '7'
      },
      priority: 2
    });
    console.log('✅ Success:', response1.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }

  console.log('\n---\n');

  // Test 2: Achievement notification
  try {
    console.log('Test 2: Achievement notification');
    const response2 = await api.post('/api/notifications', {
      recipient_id: TEST_USER_ID,
      audience: 'user',
      type: 'achievement',
      title: '🏆 Chúc mừng! Bạn đã đạt thành tích mới',
      content: {
        message: 'Bạn đã đạt thành tích "Người Mới Bắt Đầu" và nhận được 50 điểm!'
      },
      redirect_type: 'achievement',
      data: {
        achievement_id: 'ee0e8400-e29b-41d4-a716-446655440010',
        achievement_name: 'Người Mới Bắt Đầu',
        points: '50'
      },
      priority: 2,
      from_system: true
    });
    console.log('✅ Success:', response2.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }

  console.log('\n---\n');

  // Test 3: Broadcast notification
  try {
    console.log('Test 3: Broadcast notification');
    const response3 = await api.post('/api/send-notification-all', {
      title: '⚠️ Thông báo bảo trì hệ thống',
      message: 'Hệ thống sẽ bảo trì vào 2h sáng ngày 20/01/2024',
      redirect_type: 'maintenance',
      data: {
        scheduled_at: '2024-01-20T02:00:00Z',
        duration_minutes: '30'
      },
      priority: 3
    });
    console.log('✅ Success:', response3.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }

  console.log('\n🎉 Tests completed!');
}

testNotifications();
```

Chạy test:
```bash
node test-notifications.js
```

---

## 📊 Verify Results

### Kiểm tra trong Database:

```sql
-- Xem thông báo vừa tạo
SELECT 
  id,
  type,
  title,
  redirect_type,
  data,
  created_at
FROM "Notifications"
ORDER BY created_at DESC
LIMIT 10;

-- Kiểm tra theo redirect_type
SELECT 
  redirect_type,
  COUNT(*) as count
FROM "Notifications"
GROUP BY redirect_type
ORDER BY count DESC;

-- Xem chi tiết một thông báo
SELECT 
  id,
  type,
  title,
  content,
  redirect_type,
  data,
  priority,
  created_at
FROM "Notifications"
WHERE id = 'YOUR_NOTIFICATION_ID';
```

### Kiểm tra qua API:

```bash
# Lấy danh sách thông báo
curl -X GET "http://localhost:5000/api/notifications?page=1&limit=10" \
  -H "Authorization: Bearer USER_TOKEN"

# Lấy số thông báo chưa đọc
curl -X GET "http://localhost:5000/api/notifications/unread-count" \
  -H "Authorization: Bearer USER_TOKEN"
```

---

## ✅ Expected Response

### Success Response:

```json
{
  "success": true,
  "message": "Đã gửi thông báo thành công",
  "data": {
    "notification_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "🎉 Chào mừng bạn!",
    "message": "Cảm ơn bạn đã đăng ký ứng dụng Hán Tự",
    "redirect_type": "onboarding",
    "sent_at": "2024-01-16T10:00:00.000Z"
  }
}
```

### Error Response:

```json
{
  "success": false,
  "message": "Trường 'user_id' là bắt buộc"
}
```

---

**Happy Testing! 🚀**
