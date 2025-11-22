# 🚀 Quick Start - Push Notification System

## ✅ Đã Hoàn Thành

Hệ thống push notification đã được tích hợp hoàn chỉnh vào backend của bạn!

---

## 📦 Các File Đã Tạo

### Backend Files
- ✅ `migrations/add_device_tokens_table.sql` - Database migration
- ✅ `config/firebase.js` - Firebase Admin SDK config
- ✅ `models/deviceTokenModel.js` - Model quản lý device tokens
- ✅ `services/fcmService.js` - Service gửi push notification
- ✅ `controllers/deviceTokenController.js` - API controllers
- ✅ `routes/deviceTokenRoutes.js` - API routes
- ✅ `examples/testPushNotification.js` - Test script

### Documentation
- ✅ `PUSH_NOTIFICATION_SETUP.md` - Hướng dẫn setup backend
- ✅ `FRONTEND_INTEGRATION_GUIDE.md` - Hướng dẫn tích hợp frontend
- ✅ `config/firebase-service-account.example.json` - Example config

### Updated Files
- ✅ `services/notificationService.js` - Tự động gửi push khi tạo notification
- ✅ `services/postService.js` - Gửi notification khi like bài viết
- ✅ `services/commentService.js` - Gửi notification khi comment
- ✅ `app.js` - Thêm device token routes
- ✅ `.env.example` - Thêm Firebase config
- ✅ `.gitignore` - Bảo vệ Firebase credentials

---

## 🎯 Các Bước Tiếp Theo

### 1️⃣ Setup Firebase (5 phút)

```bash
# 1. Truy cập Firebase Console
https://console.firebase.google.com/

# 2. Tạo project hoặc chọn project có sẵn

# 3. Tải Service Account Key
Project Settings → Service Accounts → Generate New Private Key

# 4. Đổi tên file thành firebase-service-account.json

# 5. Đặt vào thư mục config/
```

### 2️⃣ Cấu Hình Backend (2 phút)

```bash
# Thêm vào file .env
FIREBASE_SERVICE_ACCOUNT_PATH=config/firebase-service-account.json
```

### 3️⃣ Chạy Migration (1 phút)

```bash
# PostgreSQL
psql -U postgres -d DBEChinese -f migrations/add_device_tokens_table.sql

# Hoặc dùng pgAdmin, DBeaver, etc.
```

### 4️⃣ Khởi Động Server (1 phút)

```bash
npm start
# hoặc
npm run dev
```

**Kiểm tra log:**
```
✅ Firebase initialized with Service Account file
Server chạy tại http://localhost:5000
```

---

## 📱 API Endpoints Mới

### Lưu Device Token (Frontend gọi khi login)
```http
POST /api/users/device-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "fcm-token-from-firebase",
  "platform": "android"
}
```

### Xóa Device Token (Frontend gọi khi logout)
```http
DELETE /api/users/device-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "fcm-token-from-firebase"
}
```

### Lấy Danh Sách Device Tokens
```http
GET /api/users/device-tokens
Authorization: Bearer <token>
```

---

## 🔔 Tự Động Gửi Push Notification

Hệ thống đã tự động gửi push notification khi:

### ✅ User Like Bài Viết
```javascript
// services/postService.js - toggleLike()
// Tự động gửi notification đến chủ bài viết
```

### ✅ User Comment Bài Viết
```javascript
// services/commentService.js - createComment()
// Tự động gửi notification đến chủ bài viết
```

### ✅ Admin Tạo Thông Báo Hệ Thống
```javascript
// services/notificationService.js - createNotification()
// Tự động gửi push khi tạo notification mới
```

---

## 🧪 Test Ngay

### Test 1: Gửi Notification Thủ Công

```bash
# Chạy test script
node examples/testPushNotification.js
```

### Test 2: Gửi Qua API

```bash
# Dùng Postman hoặc curl
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "user-uuid",
    "audience": "user",
    "type": "system",
    "title": "Test Notification",
    "content": { "message": "This is a test" },
    "redirect_url": "app://home"
  }'
```

---

## 📲 Frontend Integration

Xem hướng dẫn chi tiết tại: **`FRONTEND_INTEGRATION_GUIDE.md`**

### Tóm tắt nhanh:

```bash
# 1. Cài đặt
npm install @react-native-firebase/app @react-native-firebase/messaging

# 2. Thêm Firebase config files
# - Android: google-services.json
# - iOS: GoogleService-Info.plist

# 3. Request permission và lấy token
const token = await messaging().getToken();

# 4. Gửi token lên server
POST /api/users/device-token { token, platform }

# 5. Lắng nghe notifications
messaging().onMessage(...)
messaging().onNotificationOpenedApp(...)
```

---

## 🎨 Các Tính Năng

### ✅ Đã Triển Khai
- [x] Lưu/cập nhật device tokens
- [x] Gửi push đến user cụ thể
- [x] Gửi broadcast đến tất cả users
- [x] Tự động xóa token không hợp lệ
- [x] Hỗ trợ iOS, Android, Web
- [x] Tích hợp với notification system hiện có
- [x] Auto push khi like/comment
- [x] API đầy đủ cho frontend

### 🔮 Có Thể Mở Rộng
- [ ] Socket.IO cho realtime (khi user online)
- [ ] Notification scheduling (gửi vào thời gian cụ thể)
- [ ] Rich notifications (hình ảnh, buttons)
- [ ] Notification topics (subscribe theo chủ đề)
- [ ] Analytics (tracking open rate, click rate)

---

## 🔍 Troubleshooting

### Firebase không khởi tạo được
```
⚠️  Firebase not configured
```
**Giải pháp:** Kiểm tra file `config/firebase-service-account.json` hoặc biến môi trường

### Token không được lưu
**Giải pháp:** Kiểm tra migration đã chạy chưa, xem log server

### Không nhận được notification
**Kiểm tra:**
1. User đã lưu device token chưa?
2. Firebase config đúng chưa?
3. App có permission không?

---

## 📚 Tài Liệu Chi Tiết

- **Backend Setup:** `PUSH_NOTIFICATION_SETUP.md`
- **Frontend Integration:** `FRONTEND_INTEGRATION_GUIDE.md`
- **Test Script:** `examples/testPushNotification.js`

---

## 🎯 Luồng Hoạt Động

```
1. User mở app → Request permission
   ↓
2. App lấy FCM token từ Firebase
   ↓
3. App gửi token lên server (POST /api/users/device-token)
   ↓
4. Server lưu vào bảng DeviceTokens
   ↓
5. Khi có sự kiện (like, comment, etc.)
   ↓
6. Server tạo notification record
   ↓
7. notificationService tự động gửi push qua FCM
   ↓
8. Firebase gửi đến thiết bị
   ↓
9. User nhận notification
   ↓
10. User click → App mở và navigate đến màn hình tương ứng
```

---

## ✨ Ví Dụ Sử Dụng

### Gửi notification đến một user
```javascript
const fcmService = require('./services/fcmService');

await fcmService.sendToUser(userId, {
  title: 'Thông báo mới',
  body: 'Bạn có một tin nhắn mới',
  data: { type: 'message', message_id: '123' }
});
```

### Gửi broadcast
```javascript
await fcmService.sendToAll({
  title: 'Bảo trì hệ thống',
  body: 'Hệ thống sẽ bảo trì vào 2h sáng mai'
});
```

### Tạo notification (tự động gửi push)
```javascript
const notificationService = require('./services/notificationService');

await notificationService.createNotification({
  recipient_id: userId,
  audience: 'user',
  type: 'system',
  title: 'Chào mừng',
  content: { message: 'Chào mừng bạn đến với ứng dụng!' },
  redirect_url: 'app://home'
});
```

---

## 🆘 Cần Hỗ Trợ?

Nếu gặp vấn đề:
1. Kiểm tra log server khi khởi động
2. Kiểm tra log khi gửi notification
3. Xem Firebase Console → Cloud Messaging → Usage
4. Đọc tài liệu chi tiết trong `PUSH_NOTIFICATION_SETUP.md`

---

## 🎉 Hoàn Thành!

Hệ thống push notification đã sẵn sàng sử dụng. Bây giờ bạn có thể:

1. ✅ Gửi push notification đến users
2. ✅ Tự động thông báo khi có like/comment
3. ✅ Broadcast thông báo hệ thống
4. ✅ Quản lý device tokens
5. ✅ Tích hợp với frontend

**Chúc bạn thành công! 🚀**
