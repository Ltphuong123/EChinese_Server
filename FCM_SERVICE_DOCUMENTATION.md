# FCM Service Documentation

## Tổng quan

`fcmService.js` là service chịu trách nhiệm gửi push notification thông qua Firebase Cloud Messaging (FCM). Service này hỗ trợ gửi thông báo đến một user, nhiều users, hoặc broadcast đến tất cả users.

---

## Dependencies

```javascript
const { messaging, isFirebaseEnabled } = require('../config/firebase');
const deviceTokenModel = require('../models/deviceTokenModel');
```

- **messaging**: Firebase Admin SDK messaging instance
- **isFirebaseEnabled**: Function kiểm tra Firebase có được cấu hình hay không
- **deviceTokenModel**: Model để quản lý device tokens trong database

---

## Các hàm chính

### 1. `sendToUser(userId, payload)`

**Mục đích:** Gửi push notification đến một user cụ thể

**Parameters:**
- `userId` (string): ID của user cần gửi thông báo
- `payload` (object):
  - `title` (string): Tiêu đề thông báo
  - `body` (string): Nội dung thông báo
  - `data` (object, optional): Dữ liệu custom
  - `imageUrl` (string, optional): URL hình ảnh

**Luồng xử lý:**
1. Kiểm tra Firebase có được enable không
2. Lấy tất cả device tokens của user từ database
3. Nếu không có token → trả về lỗi `no_device_tokens`
4. Gọi `sendToTokens()` để gửi notification
5. Trả về kết quả

**Return:**
```javascript
{
  success: boolean,
  reason?: string,           // Nếu thất bại
  error?: string,            // Nếu có lỗi
  successCount?: number,     // Số lượng gửi thành công
  failureCount?: number,     // Số lượng gửi thất bại
  invalidTokensRemoved?: number
}
```

**Use case:**
- Gửi thông báo cá nhân đến một user
- Thông báo về comment, like, follow
- Thông báo riêng tư từ admin

**Ví dụ:**
```javascript
await fcmService.sendToUser('user-123', {
  title: 'Bạn có tin nhắn mới',
  body: 'Admin đã gửi cho bạn một thông báo',
  data: {
    notification_id: 'notif-456',
    type: 'message',
    redirect_type: 'inbox'
  }
});
```

---

### 2. `sendToUsers(userIds, payload)`

**Mục đích:** Gửi push notification đến nhiều users cùng lúc

**Parameters:**
- `userIds` (string[]): Mảng các user IDs
- `payload` (object): Giống như `sendToUser()`

**Luồng xử lý:**
1. Kiểm tra Firebase có được enable không
2. Lấy tất cả device tokens của các users từ database
3. Nếu không có token nào → trả về lỗi `no_device_tokens`
4. Gọi `sendToTokens()` để gửi notification
5. Trả về kết quả

**Return:** Giống như `sendToUser()`

**Use case:**
- Gửi thông báo đến một nhóm users cụ thể
- Thông báo cho followers của một user
- Thông báo cho members của một group

**Ví dụ:**
```javascript
await fcmService.sendToUsers(['user-1', 'user-2', 'user-3'], {
  title: 'Sự kiện mới',
  body: 'Có một sự kiện quan trọng sắp diễn ra',
  data: {
    event_id: 'event-789',
    type: 'event',
    redirect_type: 'event_detail'
  }
});
```

---

### 3. `sendToAll(payload)`

**Mục đích:** Broadcast notification đến tất cả users có device token active

**Parameters:**
- `payload` (object): Giống như `sendToUser()`

**Luồng xử lý:**
1. Kiểm tra Firebase có được enable không
2. Lấy tất cả device tokens active từ database
3. Nếu không có token nào → trả về lỗi `no_device_tokens`
4. Log số lượng devices sẽ nhận thông báo
5. Gọi `sendToTokens()` để gửi notification
6. Trả về kết quả

**Return:** Giống như `sendToUser()`

**Use case:**
- Thông báo hệ thống quan trọng
- Thông báo bảo trì
- Thông báo cập nhật tính năng mới
- Marketing campaigns

**Ví dụ:**
```javascript
await fcmService.sendToAll({
  title: 'Thông báo bảo trì',
  body: 'Hệ thống sẽ bảo trì từ 2h-4h sáng ngày mai',
  data: {
    type: 'system',
    priority: 'high',
    redirect_type: 'none'
  }
});
```

---

### 4. `sendToTokens(tokens, payload)`

**Mục đích:** Hàm core để gửi notification đến danh sách FCM tokens

**Parameters:**
- `tokens` (string[]): Mảng FCM device tokens
- `payload` (object): Giống như `sendToUser()`

**Luồng xử lý:**
1. Kiểm tra Firebase có được enable không
2. Kiểm tra tokens có rỗng không
3. Chia tokens thành các batch (500 tokens/batch) - giới hạn của Firebase
4. Với mỗi batch:
   - Build message object bằng `buildMessage()`
   - Gọi Firebase `sendEachForMulticast()`
   - Đếm số lượng thành công/thất bại
   - Thu thập các invalid tokens
5. Xóa các invalid tokens khỏi database
6. Log kết quả và trả về

**Xử lý lỗi:**
- `messaging/invalid-registration-token`: Token không hợp lệ → Xóa
- `messaging/registration-token-not-registered`: Token không tồn tại → Xóa

**Return:**
```javascript
{
  success: true,
  successCount: number,
  failureCount: number,
  invalidTokensRemoved: number
}
```

**Đặc điểm:**
- Xử lý batch tự động (500 tokens/request)
- Tự động cleanup invalid tokens
- Detailed logging
- Error handling cho từng token

**Ví dụ:**
```javascript
const tokens = ['token1', 'token2', 'token3', ...];
await fcmService.sendToTokens(tokens, {
  title: 'Test notification',
  body: 'This is a test',
  data: { test: 'true' }
});
```

---

### 5. `buildMessage(tokens, payload)`

**Mục đích:** Xây dựng message object theo format của Firebase Cloud Messaging

**Parameters:**
- `tokens` (string[]): Mảng FCM tokens
- `payload` (object):
  - `title` (string): Tiêu đề
  - `body` (string): Nội dung
  - `data` (object): Custom data
  - `imageUrl` (string, optional): URL hình ảnh

**Luồng xử lý:**
1. Extract title, body, data, imageUrl từ payload
2. Convert tất cả values trong data object sang string (yêu cầu của FCM)
3. Build message object với cấu hình cho:
   - **Android**: Priority high, sound, channel, vibration
   - **iOS (APNS)**: Sound, badge, content-available
   - **Web Push**: Icon, badge
4. Nếu có imageUrl → thêm vào notification
5. Return message object

**Message Structure:**
```javascript
{
  tokens: ['token1', 'token2', ...],
  notification: {
    title: 'Tiêu đề',
    body: 'Nội dung',
    imageUrl?: 'https://...'  // Optional
  },
  data: {
    // Tất cả values phải là string
    notification_id: '123',
    type: 'system',
    redirect_type: 'none',
    ...customData
  },
  android: {
    priority: 'high',
    notification: {
      sound: 'default',
      channelId: 'default',
      priority: 'high',
      defaultSound: true,
      defaultVibrateTimings: true,
      imageUrl?: 'https://...'
    }
  },
  apns: {
    payload: {
      aps: {
        sound: 'default',
        badge: 1,
        contentAvailable: true,
        mutableContent?: true  // Nếu có image
      }
    },
    fcmOptions?: {
      imageUrl: 'https://...'
    }
  },
  webpush: {
    notification: {
      icon: '/icon.png',
      badge: '/badge.png'
    }
  }
}
```

**Lưu ý quan trọng:**
- FCM yêu cầu tất cả values trong `data` phải là string
- Function tự động convert: `String(data[key])`
- Image handling khác nhau giữa Android, iOS, Web

**Ví dụ:**
```javascript
const message = fcmService.buildMessage(
  ['token1', 'token2'],
  {
    title: 'New Post',
    body: 'Check out this amazing post!',
    data: {
      post_id: '123',
      author_id: '456',
      type: 'post'
    },
    imageUrl: 'https://example.com/image.jpg'
  }
);
```

---

## Cấu hình Platform-Specific

### Android Configuration
```javascript
android: {
  priority: 'high',              // Ưu tiên cao
  notification: {
    sound: 'default',            // Âm thanh mặc định
    channelId: 'default',        // Channel ID
    priority: 'high',
    defaultSound: true,
    defaultVibrateTimings: true, // Rung mặc định
    imageUrl: '...'              // Hình ảnh (nếu có)
  }
}
```

### iOS (APNS) Configuration
```javascript
apns: {
  payload: {
    aps: {
      sound: 'default',          // Âm thanh
      badge: 1,                  // Badge count
      contentAvailable: true,    // Background update
      mutableContent: true       // Cho phép modify (nếu có image)
    }
  },
  fcmOptions: {
    imageUrl: '...'              // Hình ảnh (nếu có)
  }
}
```

### Web Push Configuration
```javascript
webpush: {
  notification: {
    icon: '/icon.png',           // Icon hiển thị
    badge: '/badge.png'          // Badge icon
  }
}
```

---

## Error Handling

### Các loại lỗi được xử lý:

1. **Firebase Not Configured**
   - Return: `{ success: false, reason: 'firebase_not_configured' }`
   - Không throw error, chỉ log warning

2. **No Device Tokens**
   - Return: `{ success: false, reason: 'no_device_tokens' }`
   - User chưa đăng ký device token

3. **Invalid Registration Token**
   - Error code: `messaging/invalid-registration-token`
   - Action: Tự động xóa token khỏi database

4. **Token Not Registered**
   - Error code: `messaging/registration-token-not-registered`
   - Action: Tự động xóa token khỏi database

5. **General Errors**
   - Return: `{ success: false, error: error.message }`
   - Log chi tiết error

---

## Best Practices

### 1. Batch Processing
```javascript
// Firebase giới hạn 500 tokens/request
const batchSize = 500;
for (let i = 0; i < tokens.length; i += batchSize) {
  const batch = tokens.slice(i, i + batchSize);
  // Process batch
}
```

### 2. Data Validation
```javascript
// Convert tất cả data values sang string
const stringData = {};
Object.keys(data).forEach(key => {
  stringData[key] = String(data[key]);
});
```

### 3. Token Cleanup
```javascript
// Tự động xóa invalid tokens
if (invalidTokens.length > 0) {
  for (const token of invalidTokens) {
    await deviceTokenModel.deleteByToken(token);
  }
}
```

### 4. Graceful Degradation
```javascript
// Không throw error nếu Firebase chưa config
if (!isFirebaseEnabled()) {
  console.log('⚠️  Firebase not enabled, skipping push notification');
  return { success: false, reason: 'firebase_not_configured' };
}
```

---

## Use Cases & Examples

### Use Case 1: Thông báo cá nhân
```javascript
// User nhận được comment mới
await fcmService.sendToUser(userId, {
  title: 'Bình luận mới',
  body: 'John đã bình luận về bài viết của bạn',
  data: {
    notification_id: 'notif-123',
    type: 'comment',
    redirect_type: 'post_comment',
    post_id: 'post-456',
    comment_id: 'comment-789'
  }
});
```

### Use Case 2: Thông báo nhóm
```javascript
// Gửi đến tất cả followers
const followerIds = await getFollowerIds(authorId);
await fcmService.sendToUsers(followerIds, {
  title: 'Bài viết mới',
  body: 'Jane vừa đăng một bài viết mới',
  data: {
    type: 'new_post',
    redirect_type: 'post',
    post_id: 'post-999',
    author_id: authorId
  },
  imageUrl: 'https://example.com/post-thumbnail.jpg'
});
```

### Use Case 3: Broadcast hệ thống
```javascript
// Thông báo bảo trì
await fcmService.sendToAll({
  title: '🔧 Thông báo bảo trì',
  body: 'Hệ thống sẽ bảo trì từ 2h-4h sáng ngày 25/11',
  data: {
    type: 'system',
    priority: 'high',
    redirect_type: 'none',
    maintenance_start: '2025-11-25T02:00:00Z',
    maintenance_end: '2025-11-25T04:00:00Z'
  }
});
```

### Use Case 4: Thông báo với hình ảnh
```javascript
// Thông báo sự kiện với banner
await fcmService.sendToUser(userId, {
  title: '🎉 Sự kiện đặc biệt',
  body: 'Tham gia sự kiện Black Friday - Giảm giá 50%',
  data: {
    type: 'event',
    redirect_type: 'event_detail',
    event_id: 'event-blackfriday-2025'
  },
  imageUrl: 'https://example.com/events/blackfriday-banner.jpg'
});
```

---

## Performance Considerations

### 1. Batch Size
- Firebase giới hạn: **500 tokens/request**
- Service tự động chia batch
- Không cần xử lý manual

### 2. Database Queries
- `findByUserId()`: Query 1 user → Fast
- `findByUserIds()`: Query nhiều users → Có thể chậm nếu list lớn
- `findAllActive()`: Query tất cả → Có thể rất chậm
- **Recommendation**: Sử dụng pagination hoặc queue cho broadcast lớn

### 3. Token Cleanup
- Tự động xóa invalid tokens
- Giảm database size
- Cải thiện delivery rate

### 4. Error Handling
- Không block execution nếu một số tokens fail
- Continue processing các tokens còn lại
- Log chi tiết để debug

---

## Logging

Service sử dụng emoji để dễ đọc logs:

- `⚠️` - Warning (Firebase not enabled)
- `ℹ️` - Info (No tokens found)
- `📢` - Broadcasting
- `✅` - Success
- `❌` - Error
- `🗑️` - Cleanup (removing invalid tokens)

**Ví dụ logs:**
```
⚠️  Firebase not enabled, skipping push notification
ℹ️  User user-123 has no device tokens
📢 Broadcasting to 1500 devices
✅ Sent: 1450, Failed: 50
🗑️  Removing 50 invalid tokens
❌ Failed to send to token: messaging/invalid-registration-token
```

---

## Integration với Notification Service

```javascript
// Trong notificationService.js
const sendPushNotification = async (notification) => {
  const { recipient_id, audience, title, content, data } = notification;

  const payload = {
    title,
    body: content?.message || JSON.stringify(content),
    data: {
      notification_id: notification.id,
      type: notification.type,
      redirect_type: notification.redirect_type || 'none',
      ...data
    }
  };

  // Gửi theo audience
  if (audience === 'all' || audience === 'admin' || audience === 'user') {
    await fcmService.sendToAll(payload);
  } else if (recipient_id) {
    await fcmService.sendToUser(recipient_id, payload);
  }

  // Đánh dấu đã gửi
  await notificationModel.publishByIds([notification.id]);
};
```

---

## Testing

### Test với một user
```javascript
const result = await fcmService.sendToUser('test-user-id', {
  title: 'Test Notification',
  body: 'This is a test message',
  data: { test: 'true' }
});

console.log(result);
// { success: true, successCount: 2, failureCount: 0, invalidTokensRemoved: 0 }
```

### Test broadcast
```javascript
const result = await fcmService.sendToAll({
  title: 'Test Broadcast',
  body: 'Testing broadcast to all users',
  data: { test: 'true', broadcast: 'true' }
});

console.log(result);
// { success: true, successCount: 1500, failureCount: 50, invalidTokensRemoved: 50 }
```

---

## Troubleshooting

### Problem: Không nhận được notification

**Checklist:**
1. ✅ Firebase có được config đúng không?
2. ✅ User có device token trong database không?
3. ✅ Token có còn valid không?
4. ✅ App có permission notification không?
5. ✅ Device có kết nối internet không?

### Problem: Một số users không nhận được

**Possible causes:**
- Token đã expired
- User đã uninstall app
- User đã tắt notification
- Token bị invalid

**Solution:** Service tự động cleanup invalid tokens

### Problem: Broadcast quá chậm

**Solution:**
- Implement queue system (Bull, BullMQ)
- Process batch async
- Use background jobs

---

## Future Improvements

### 1. Queue System
```javascript
// Sử dụng Bull Queue
const notificationQueue = new Queue('notifications');

notificationQueue.process(async (job) => {
  const { userIds, payload } = job.data;
  await fcmService.sendToUsers(userIds, payload);
});
```

### 2. Retry Logic
```javascript
// Retry failed notifications
const sendWithRetry = async (userId, payload, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    const result = await fcmService.sendToUser(userId, payload);
    if (result.success) return result;
    await sleep(1000 * Math.pow(2, i)); // Exponential backoff
  }
};
```

### 3. Analytics
```javascript
// Track delivery metrics
const trackDelivery = async (notificationId, result) => {
  await analytics.track({
    notification_id: notificationId,
    success_count: result.successCount,
    failure_count: result.failureCount,
    delivery_rate: result.successCount / (result.successCount + result.failureCount)
  });
};
```

### 4. Scheduling
```javascript
// Schedule notifications
const scheduleNotification = async (userId, payload, sendAt) => {
  await scheduler.schedule(sendAt, async () => {
    await fcmService.sendToUser(userId, payload);
  });
};
```

---

## Summary

`fcmService.js` là một service hoàn chỉnh để gửi push notifications với các tính năng:

✅ Gửi đến 1 user, nhiều users, hoặc broadcast
✅ Hỗ trợ Android, iOS, Web
✅ Batch processing tự động
✅ Token cleanup tự động
✅ Error handling toàn diện
✅ Graceful degradation
✅ Detailed logging
✅ Platform-specific configuration

Service này có thể scale tốt cho hầu hết use cases, nhưng nên consider thêm queue system cho broadcast lớn (>10,000 users).
