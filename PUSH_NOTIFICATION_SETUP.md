# 🔔 Hướng Dẫn Setup Push Notification

## 📋 Tổng Quan

Hệ thống push notification đã được tích hợp vào backend sử dụng Firebase Cloud Messaging (FCM).

## 🚀 Các Bước Setup

### 1. Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Vào **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Tải file JSON về và đổi tên thành `firebase-service-account.json`
6. Đặt file vào thư mục `config/`

### 2. Cấu Hình Backend

#### Option 1: Dùng Service Account File (Khuyến nghị)

```bash
# Thêm vào file .env
FIREBASE_SERVICE_ACCOUNT_PATH=config/firebase-service-account.json
```

#### Option 2: Dùng Environment Variables

```bash
# Thêm vào file .env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key\n-----END PRIVATE KEY-----\n"
```

### 3. Chạy Migration Database

```bash
# PostgreSQL
psql -U postgres -d DBEChinese -f migrations/add_device_tokens_table.sql

# Hoặc dùng tool khác (pgAdmin, DBeaver, etc.)
```

### 4. Khởi Động Server

```bash
npm start
# hoặc
npm run dev
```

Nếu thấy log: `✅ Firebase initialized` → Setup thành công!

---

## 📱 API Endpoints

### 1. Lưu Device Token (Gọi khi user login)

```http
POST /api/users/device-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "fcm-token-from-firebase",
  "platform": "android",
  "deviceInfo": {
    "model": "Samsung Galaxy S21",
    "osVersion": "Android 12"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã lưu device token thành công",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "token": "fcm-token...",
    "platform": "android",
    "is_active": true
  }
}
```

### 2. Xóa Device Token (Gọi khi user logout)

```http
DELETE /api/users/device-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "fcm-token-from-firebase"
}
```

### 3. Xóa Tất Cả Device Tokens (Logout khỏi tất cả thiết bị)

```http
DELETE /api/users/device-tokens/all
Authorization: Bearer <token>
```

### 4. Lấy Danh Sách Device Tokens

```http
GET /api/users/device-tokens
Authorization: Bearer <token>
```

---

## 🔧 Cách Sử Dụng Trong Code

### Gửi Notification Khi Có Sự Kiện

```javascript
// Ví dụ: User A thích bài viết của User B
const notificationService = require('./services/notificationService');

async function likePost(postId, likerId) {
  // ... logic like post ...

  // Tạo notification (tự động gửi push)
  await notificationService.createNotification({
    recipient_id: post.user_id,
    audience: 'user',
    type: 'community',
    title: 'Ai đó đã thích bài viết',
    content: { message: `${liker.name} đã thích bài "${post.title}"` },
    redirect_url: `app://post/${postId}`,
    data: { post_id: postId, liker_id: likerId },
    priority: 1
  });
}
```

### Gửi Broadcast (Admin)

```javascript
// Gửi thông báo hệ thống đến tất cả users
await notificationService.createNotification({
  recipient_id: null,  // NULL = gửi tất cả
  audience: 'all',
  type: 'system',
  title: 'Cập nhật từ Hán Tự',
  content: { message: 'HSK 3.0 đã có mặt!' },
  redirect_url: 'app://vocab/hsk3',
  from_system: true,
  priority: 2
});
```

### Gửi Push Thủ Công (Không tạo notification record)

```javascript
const fcmService = require('./services/fcmService');

// Gửi đến một user
await fcmService.sendToUser(userId, {
  title: 'Tiêu đề',
  body: 'Nội dung',
  data: { custom_key: 'custom_value' }
});

// Gửi đến nhiều users
await fcmService.sendToUsers([userId1, userId2], payload);

// Broadcast đến tất cả
await fcmService.sendToAll(payload);
```

---

## 📲 Frontend Setup (React Native)

### 1. Cài Đặt Thư Viện

```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

### 2. Cấu Hình Firebase

- **Android**: Đặt `google-services.json` vào `android/app/`
- **iOS**: Đặt `GoogleService-Info.plist` vào `ios/`

### 3. Code Mẫu

```javascript
// App.tsx
import messaging from '@react-native-firebase/messaging';
import axios from 'axios';

// Request permission
async function requestPermission() {
  const authStatus = await messaging().requestPermission();
  return authStatus === messaging.AuthorizationStatus.AUTHORIZED;
}

// Lấy token và gửi lên server
async function registerToken() {
  const token = await messaging().getToken();
  
  await axios.post('/api/users/device-token', {
    token,
    platform: Platform.OS
  }, {
    headers: { Authorization: `Bearer ${yourAuthToken}` }
  });
}

// Nhận notification khi app đang mở
messaging().onMessage(async (remoteMessage) => {
  console.log('Notification:', remoteMessage);
  // Hiển thị local notification
});

// Xử lý khi click notification
messaging().onNotificationOpenedApp((remoteMessage) => {
  const { redirect_url } = remoteMessage.data;
  // Navigate đến màn hình tương ứng
});

// Background handler (đặt ở index.js)
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background notification:', remoteMessage);
});
```

---

## 🧪 Test Push Notification

### Cách 1: Dùng Postman

```http
POST /api/notifications
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "recipient_id": "user-uuid",
  "audience": "user",
  "type": "system",
  "title": "Test Notification",
  "content": { "message": "This is a test" },
  "redirect_url": "app://home"
}
```

### Cách 2: Dùng Firebase Console

1. Vào **Firebase Console** → **Cloud Messaging**
2. Click **Send your first message**
3. Nhập tiêu đề, nội dung
4. Chọn target (device token hoặc topic)
5. Click **Send**

---

## 🔍 Troubleshooting

### Firebase không khởi tạo được

```
⚠️  Firebase not configured
```

**Giải pháp:**
- Kiểm tra file `config/firebase-service-account.json` có tồn tại không
- Hoặc kiểm tra biến môi trường `FIREBASE_PROJECT_ID` trong `.env`

### Token không hợp lệ

```
❌ messaging/registration-token-not-registered
```

**Giải pháp:**
- Token đã bị xóa tự động khỏi database
- User cần login lại để lấy token mới

### Không nhận được notification

**Kiểm tra:**
1. User đã lưu device token chưa? → Gọi `GET /api/users/device-tokens`
2. Firebase config đúng chưa?
3. App có permission notification chưa?
4. Kiểm tra log server: `✅ Sent: X, Failed: Y`

---

## 📊 Database Schema

```sql
Table "DeviceTokens" {
  id uuid [pk]
  user_id uuid [ref: > Users.id]
  token text [unique, not null]
  platform varchar(20) [note: 'ios | android | web']
  device_info jsonb
  is_active boolean [default: true]
  created_at timestamptz
  updated_at timestamptz
}
```

---

## 🎯 Tính Năng Đã Triển Khai

- ✅ Lưu/cập nhật device tokens
- ✅ Gửi push notification đến user cụ thể
- ✅ Gửi broadcast đến tất cả users
- ✅ Tự động xóa token không hợp lệ
- ✅ Hỗ trợ iOS, Android, Web
- ✅ Tích hợp với hệ thống notification hiện có
- ✅ API đầy đủ cho frontend

---

## 📚 Tài Liệu Tham Khảo

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase](https://rnfirebase.io/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

---

## 🆘 Hỗ Trợ

Nếu gặp vấn đề, kiểm tra:
1. Log server khi khởi động
2. Log khi gửi notification
3. Firebase Console → Cloud Messaging → Usage

Hoặc liên hệ team dev để được hỗ trợ.
