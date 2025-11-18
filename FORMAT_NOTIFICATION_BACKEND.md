# 📤 Format Notification Từ Backend

## 🔍 Format Hiện Tại Của Backend

### 1. Format Message Gửi Qua FCM

Backend sử dụng Firebase Cloud Messaging với format sau:

```javascript
{
  tokens: ["fcm-token-1", "fcm-token-2"],
  notification: {
    title: "Tiêu đề thông báo",
    body: "Nội dung thông báo"
  },
  data: {
    notification_id: "550e8400-e29b-41d4-a716-446655440000",
    type: "system",
    redirect_url: "app://home",
    // ... custom data khác
  },
  android: {
    priority: "high",
    notification: {
      sound: "default",
      channelId: "default",
      priority: "high",
      defaultSound: true,
      defaultVibrateTimings: true
    }
  },
  apns: {
    payload: {
      aps: {
        sound: "default",
        badge: 1,
        contentAvailable: true
      }
    }
  },
  webpush: {
    notification: {
      icon: "/icon.png",
      badge: "/badge.png"
    }
  }
}
```

---

## 📋 Chi Tiết Từng Phần

### A. Notification Object (Hiển thị)

```javascript
notification: {
  title: "Tiêu đề",      // String - Tiêu đề notification
  body: "Nội dung"       // String - Nội dung notification
}
```

**Ví dụ:**
```javascript
notification: {
  title: "Chào mừng bạn!",
  body: "Cảm ơn bạn đã đăng ký ứng dụng Hán Tự"
}
```

---

### B. Data Object (Dữ liệu custom)

```javascript
data: {
  notification_id: "uuid",    // ID của notification trong database
  type: "system",             // Loại: system, community, comment_ban
  redirect_url: "app://home", // URL để navigate
  // ... các field custom khác
}
```

**⚠️ LƯU Ý:** Tất cả values trong `data` phải là **STRING**

**Ví dụ:**
```javascript
data: {
  notification_id: "550e8400-e29b-41d4-a716-446655440000",
  type: "community",
  redirect_url: "app://post/123",
  post_id: "123",              // String, không phải number
  liker_id: "456",             // String
  liker_name: "John Doe"       // String
}
```

---

### C. Platform-Specific Config

#### Android:
```javascript
android: {
  priority: "high",
  notification: {
    sound: "default",
    channelId: "default",
    priority: "high",
    defaultSound: true,
    defaultVibrateTimings: true
  }
}
```

#### iOS (APNS):
```javascript
apns: {
  payload: {
    aps: {
      sound: "default",
      badge: 1,
      contentAvailable: true
    }
  }
}
```

#### Web:
```javascript
webpush: {
  notification: {
    icon: "/icon.png",
    badge: "/badge.png"
  }
}
```

---

## 🔄 Luồng Xử Lý Trong Backend

### Bước 1: Tạo Notification Record

```javascript
// services/notificationService.js
const notification = await notificationModel.create({
  recipient_id: "user-id",
  audience: "user",
  type: "system",
  title: "Tiêu đề",
  content: { message: "Nội dung" },
  redirect_url: "app://home",
  data: { custom_key: "custom_value" }
});
```

### Bước 2: Build FCM Payload

```javascript
// services/notificationService.js - sendPushNotification()
const payload = {
  title: notification.title,
  body: notification.content?.message || JSON.stringify(notification.content),
  data: {
    notification_id: notification.id,
    type: notification.type,
    redirect_url: notification.redirect_url || '',
    ...notification.data  // Merge custom data
  }
};
```

### Bước 3: Convert Data to Strings

```javascript
// services/fcmService.js - buildMessage()
const stringData = {};
Object.keys(data).forEach(key => {
  stringData[key] = String(data[key]);  // Convert tất cả sang string
});
```

### Bước 4: Build Final Message

```javascript
// services/fcmService.js - buildMessage()
const message = {
  tokens: tokens,
  notification: {
    title: payload.title,
    body: payload.body
  },
  data: stringData,  // Tất cả values đã là string
  android: { ... },
  apns: { ... },
  webpush: { ... }
};
```

### Bước 5: Send via Firebase

```javascript
// services/fcmService.js - sendToTokens()
const response = await messaging.sendEachForMulticast(message);
```

---

## 📱 Format Nhận Được Ở Frontend

### Web (React):

```javascript
// Foreground (app đang mở)
onMessage(messaging, (payload) => {
  console.log('Payload:', payload);
  /*
  {
    notification: {
      title: "Tiêu đề",
      body: "Nội dung"
    },
    data: {
      notification_id: "550e8400-...",
      type: "system",
      redirect_url: "app://home",
      // ... custom data
    },
    from: "...",
    messageId: "..."
  }
  */
});

// Background (app đóng/minimize)
// Service Worker nhận
messaging.onBackgroundMessage((payload) => {
  console.log('Background payload:', payload);
  // Same format như trên
});
```

### Mobile (React Native):

```javascript
// Foreground
messaging().onMessage(async (remoteMessage) => {
  console.log('Message:', remoteMessage);
  /*
  {
    notification: {
      title: "Tiêu đề",
      body: "Nội dung"
    },
    data: {
      notification_id: "550e8400-...",
      type: "system",
      redirect_url: "app://home"
    },
    messageId: "...",
    sentTime: 1234567890
  }
  */
});

// Background
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background message:', remoteMessage);
  // Same format
});
```

---

## 🐛 Debug: Xem Format Thực Tế

### Backend - Xem Log

Thêm log vào `services/fcmService.js`:

```javascript
// Trong hàm buildMessage()
buildMessage: (tokens, payload) => {
  const { title, body, data = {}, imageUrl } = payload;

  const stringData = {};
  Object.keys(data).forEach(key => {
    stringData[key] = String(data[key]);
  });

  const message = {
    tokens,
    notification: { title, body },
    data: stringData,
    // ...
  };

  // 🔍 LOG ĐỂ DEBUG
  console.log('📤 FCM Message Format:');
  console.log(JSON.stringify(message, null, 2));

  return message;
}
```

### Frontend - Xem Payload

**Web:**
```javascript
// src/firebase/config.js hoặc App.js
onMessage(messaging, (payload) => {
  console.log('📩 Received payload:');
  console.log('Notification:', payload.notification);
  console.log('Data:', payload.data);
  console.log('Full payload:', JSON.stringify(payload, null, 2));
});
```

**React Native:**
```javascript
messaging().onMessage(async (remoteMessage) => {
  console.log('📩 Received message:');
  console.log('Notification:', remoteMessage.notification);
  console.log('Data:', remoteMessage.data);
  console.log('Full message:', JSON.stringify(remoteMessage, null, 2));
});
```

---

## ✅ Format Đúng - Ví Dụ Hoàn Chỉnh

### Backend Gửi:

```javascript
// API call
POST /api/notifications
{
  "recipient_id": "user-123",
  "audience": "user",
  "type": "community",
  "title": "Ai đó đã thích bài viết",
  "content": {
    "message": "John Doe đã thích bài viết của bạn"
  },
  "related_type": "post",
  "related_id": "post-456",
  "redirect_url": "app://post/456",
  "data": {
    "liker_id": "user-789",
    "liker_name": "John Doe",
    "post_id": "post-456"
  },
  "priority": 2
}
```

### FCM Message (Backend Build):

```javascript
{
  "tokens": ["fcm-token-abc123"],
  "notification": {
    "title": "Ai đó đã thích bài viết",
    "body": "John Doe đã thích bài viết của bạn"
  },
  "data": {
    "notification_id": "notif-111",
    "type": "community",
    "redirect_url": "app://post/456",
    "liker_id": "user-789",
    "liker_name": "John Doe",
    "post_id": "post-456"
  },
  "android": {
    "priority": "high",
    "notification": {
      "sound": "default",
      "channelId": "default"
    }
  },
  "apns": {
    "payload": {
      "aps": {
        "sound": "default",
        "badge": 1
      }
    }
  },
  "webpush": {
    "notification": {
      "icon": "/icon.png"
    }
  }
}
```

### Frontend Nhận:

```javascript
{
  "notification": {
    "title": "Ai đó đã thích bài viết",
    "body": "John Doe đã thích bài viết của bạn"
  },
  "data": {
    "notification_id": "notif-111",
    "type": "community",
    "redirect_url": "app://post/456",
    "liker_id": "user-789",
    "liker_name": "John Doe",
    "post_id": "post-456"
  },
  "messageId": "0:1234567890",
  "from": "123456789012"
}
```

---

## ❌ Lỗi Thường Gặp

### 1. Data values không phải string

**❌ Sai:**
```javascript
data: {
  post_id: 123,        // Number
  is_read: false,      // Boolean
  count: 5             // Number
}
```

**✅ Đúng:**
```javascript
data: {
  post_id: "123",      // String
  is_read: "false",    // String
  count: "5"           // String
}
```

Backend đã tự động convert, nhưng nếu bạn gửi trực tiếp qua FCM thì phải chú ý.

---

### 2. Content không có message

**❌ Sai:**
```javascript
content: "Nội dung"  // String trực tiếp
```

**✅ Đúng:**
```javascript
content: {
  message: "Nội dung"  // Object với field message
}
```

---

### 3. Redirect URL sai format

**❌ Sai:**
```javascript
redirect_url: "/post/123"           // Web path
redirect_url: "https://app.com"     // HTTP URL
```

**✅ Đúng:**
```javascript
redirect_url: "app://post/123"      // Deep link format
redirect_url: "app://home"
redirect_url: "app://notifications"
```

---

## 🧪 Test Format

### Script Test Backend Format:

```javascript
// test-format.js
const notificationService = require('./services/notificationService');

async function testFormat() {
  const notification = await notificationService.createNotification({
    recipient_id: 'test-user-id',
    audience: 'user',
    type: 'system',
    title: 'Test Format',
    content: { message: 'Testing notification format' },
    redirect_url: 'app://test',
    data: {
      test_key: 'test_value',
      number_key: 123,
      boolean_key: true
    },
    priority: 2
  });

  console.log('Created notification:', notification);
}

testFormat();
```

Chạy:
```bash
node test-format.js
```

Xem log để kiểm tra format.

---

## 📝 Checklist Format

### Backend:
- [ ] `notification.title` là string
- [ ] `notification.body` là string
- [ ] `data` object có `notification_id`
- [ ] `data` object có `type`
- [ ] `data` object có `redirect_url`
- [ ] Tất cả values trong `data` là string
- [ ] `content` là object với field `message`

### Frontend:
- [ ] Listener nhận được `payload.notification`
- [ ] Listener nhận được `payload.data`
- [ ] `payload.data.redirect_url` có giá trị
- [ ] Parse `redirect_url` để navigate đúng

---

## 🎯 Tóm Tắt

**Format Backend Gửi:**
```javascript
{
  notification: { title, body },
  data: { notification_id, type, redirect_url, ...custom }
}
```

**Format Frontend Nhận:**
```javascript
{
  notification: { title, body },
  data: { notification_id, type, redirect_url, ...custom },
  messageId, from
}
```

**Tất cả data values phải là STRING!**

---

**Nếu vẫn không nhận được, kiểm tra log backend và frontend để xem format thực tế!** 🔍
