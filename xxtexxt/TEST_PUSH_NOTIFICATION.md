# 🧪 Test Push Notification - Hướng Dẫn Chi Tiết

## 📋 Mục Lục
1. [Test Backend](#1-test-backend)
2. [Test Frontend Setup](#2-test-frontend-setup)
3. [Test Nhận Notification](#3-test-nhận-notification)
4. [Debug Tools](#4-debug-tools)

---

## 1. Test Backend

### ✅ Bước 1.1: Kiểm tra Firebase đã khởi tạo chưa

**Xem log server khi khởi động:**

```bash
npm start
```

**Phải thấy:**
```
✅ Firebase initialized with Service Account file
Server chạy tại http://localhost:5000
```

**Nếu thấy:**
```
⚠️  Firebase not configured. Push notifications will be disabled.
```

→ **Giải pháp:** Kiểm tra file `.env` có `FIREBASE_SERVICE_ACCOUNT_PATH` chưa

---

### ✅ Bước 1.2: Kiểm tra bảng DeviceTokens

**Chạy query:**

```sql
-- Kiểm tra bảng có tồn tại không
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'DeviceTokens'
);

-- Xem tất cả device tokens
SELECT * FROM "DeviceTokens";

-- Đếm số tokens theo platform
SELECT platform, COUNT(*) 
FROM "DeviceTokens" 
WHERE is_active = true 
GROUP BY platform;
```

---

### ✅ Bước 1.3: Test API Tạo Thông Báo

**Dùng curl:**

```bash
# Thay YOUR_ADMIN_TOKEN và USER_ID
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "USER_ID",
    "audience": "user",
    "type": "system",
    "title": "Test Notification",
    "content": {
      "message": "Đây là test notification từ backend"
    },
    "redirect_url": "app://home",
    "priority": 2
  }'
```

**Response mong đợi:**

```json
{
  "success": true,
  "message": "Tạo và gửi thông báo thành công",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "recipient_id": "USER_ID",
    "audience": "user",
    "type": "system",
    "title": "Test Notification",
    "is_push_sent": true,
    "created_at": "2024-01-15T12:00:00.000Z"
  }
}
```

**Kiểm tra log server:**

```
✅ Push notification sent for: 550e8400-e29b-41d4-a716-446655440000
✅ Sent: 1, Failed: 0
```

---

## 2. Test Frontend Setup

### ✅ Bước 2.1: Kiểm tra Permission

**Mở Console trong browser (F12):**

```javascript
// Kiểm tra permission hiện tại
console.log('Notification Permission:', Notification.permission);
// Phải là: "granted"

// Nếu chưa granted, request permission
Notification.requestPermission().then(permission => {
  console.log('Permission result:', permission);
});
```

---

### ✅ Bước 2.2: Kiểm tra Service Worker

**Console:**

```javascript
// Kiểm tra service worker đã đăng ký chưa
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
  console.log('Count:', registrations.length);
  
  registrations.forEach(reg => {
    console.log('Scope:', reg.scope);
    console.log('Active:', reg.active);
  });
});

// Kiểm tra file firebase-messaging-sw.js có accessible không
fetch('/firebase-messaging-sw.js')
  .then(res => {
    console.log('Service Worker file status:', res.status);
    // Phải là 200
  })
  .catch(err => {
    console.error('Service Worker file not found:', err);
  });
```

---

### ✅ Bước 2.3: Kiểm tra FCM Token

**Console:**

```javascript
// Kiểm tra token đã được lưu chưa
const fcmToken = localStorage.getItem('fcm_token');
console.log('FCM Token:', fcmToken);

// Nếu null, thử lấy token mới
import { messaging, getToken, VAPID_KEY } from './firebase/config';

getToken(messaging, { vapidKey: VAPID_KEY })
  .then(token => {
    console.log('New FCM Token:', token);
  })
  .catch(err => {
    console.error('Error getting token:', err);
  });
```

---

### ✅ Bước 2.4: Kiểm tra Token đã gửi lên Server chưa

**Console:**

```javascript
// Kiểm tra trong localStorage
const fcmToken = localStorage.getItem('fcm_token');
const authToken = localStorage.getItem('auth_token');

console.log('FCM Token:', fcmToken);
console.log('Auth Token:', authToken);

// Test gửi token lên server
fetch('http://localhost:5000/api/users/device-token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    token: fcmToken,
    platform: 'web',
    deviceInfo: {
      userAgent: navigator.userAgent,
      language: navigator.language
    }
  })
})
.then(res => res.json())
.then(data => {
  console.log('Register token response:', data);
})
.catch(err => {
  console.error('Error registering token:', err);
});
```

---

## 3. Test Nhận Notification

### ✅ Test 3.1: Gửi Test Notification (Postman/curl)

**Cách 1: Dùng Postman**

```
POST http://localhost:5000/api/notifications
Headers:
  Authorization: Bearer YOUR_ADMIN_TOKEN
  Content-Type: application/json

Body (JSON):
{
  "recipient_id": "YOUR_USER_ID",
  "audience": "user",
  "type": "system",
  "title": "🔔 Test Notification",
  "content": {
    "message": "Nếu bạn thấy thông báo này, hệ thống đã hoạt động!"
  },
  "redirect_url": "app://home",
  "priority": 3
}
```

**Cách 2: Dùng curl**

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "YOUR_USER_ID",
    "audience": "user",
    "type": "system",
    "title": "🔔 Test Notification",
    "content": {
      "message": "Nếu bạn thấy thông báo này, hệ thống đã hoạt động!"
    },
    "redirect_url": "app://home",
    "priority": 3
  }'
```

**Cách 3: Dùng JavaScript trong Console**

```javascript
const authToken = localStorage.getItem('auth_token');
const userId = 'YOUR_USER_ID'; // Thay bằng user ID thật

fetch('http://localhost:5000/api/notifications', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    recipient_id: userId,
    audience: 'user',
    type: 'system',
    title: '🔔 Test Notification',
    content: {
      message: 'Nếu bạn thấy thông báo này, hệ thống đã hoạt động!'
    },
    redirect_url: 'app://home',
    priority: 3
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Notification created:', data);
})
.catch(err => {
  console.error('❌ Error:', err);
});
```

---

### ✅ Test 3.2: Test Broadcast (Gửi cho tất cả)

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "audience": "all",
    "type": "system",
    "title": "📢 Thông báo quan trọng",
    "content": {
      "message": "Đây là thông báo broadcast đến tất cả users"
    },
    "priority": 3,
    "from_system": true
  }'
```

---

### ✅ Test 3.3: Kiểm tra Notification có hiển thị không

**Khi tab đang MỞ (Foreground):**

1. Mở web app
2. Mở Console (F12)
3. Gửi test notification (dùng curl/Postman)
4. Xem Console log:

```
📩 Foreground message: {notification: {...}, data: {...}}
```

5. Notification sẽ hiển thị ở góc màn hình

**Khi tab ĐÓNG hoặc MINIMIZE (Background):**

1. Minimize hoặc chuyển sang tab khác
2. Gửi test notification
3. Notification sẽ hiển thị ở notification center của browser

---

## 4. Debug Tools

### 🔍 Tool 4.1: Script Kiểm Tra Toàn Diện

**Tạo file `public/test-notification.html`:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Push Notification</title>
  <style>
    body { font-family: Arial; padding: 20px; }
    .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
    .success { background: #d4edda; color: #155724; }
    .error { background: #f8d7da; color: #721c24; }
    .warning { background: #fff3cd; color: #856404; }
    button { padding: 10px 20px; margin: 5px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>🧪 Test Push Notification</h1>
  
  <div id="results"></div>
  
  <button onclick="checkAll()">Kiểm Tra Tất Cả</button>
  <button onclick="requestPermission()">Request Permission</button>
  <button onclick="getToken()">Get FCM Token</button>
  <button onclick="sendTestNotification()">Gửi Test Notification</button>

  <script type="module">
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
    import { getMessaging, getToken } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js';

    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_SENDER_ID",
      appId: "YOUR_APP_ID"
    };

    const VAPID_KEY = "YOUR_VAPID_KEY";

    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    window.firebaseMessaging = messaging;
    window.vapidKey = VAPID_KEY;

    function log(message, type = 'info') {
      const div = document.createElement('div');
      div.className = `status ${type}`;
      div.textContent = message;
      document.getElementById('results').appendChild(div);
    }

    window.checkAll = async function() {
      document.getElementById('results').innerHTML = '';
      
      // 1. Check Permission
      log(`1. Permission: ${Notification.permission}`, 
        Notification.permission === 'granted' ? 'success' : 'warning');

      // 2. Check Service Worker
      const regs = await navigator.serviceWorker.getRegistrations();
      log(`2. Service Workers: ${regs.length} registered`, 
        regs.length > 0 ? 'success' : 'error');

      // 3. Check FCM Token
      const fcmToken = localStorage.getItem('fcm_token');
      log(`3. FCM Token: ${fcmToken ? 'Có' : 'Không có'}`, 
        fcmToken ? 'success' : 'warning');

      // 4. Check Auth Token
      const authToken = localStorage.getItem('auth_token');
      log(`4. Auth Token: ${authToken ? 'Có' : 'Không có'}`, 
        authToken ? 'success' : 'warning');

      // 5. Check Service Worker File
      try {
        const res = await fetch('/firebase-messaging-sw.js');
        log(`5. Service Worker File: ${res.status === 200 ? 'OK' : 'Not Found'}`, 
          res.status === 200 ? 'success' : 'error');
      } catch (err) {
        log(`5. Service Worker File: Error - ${err.message}`, 'error');
      }
    }

    window.requestPermission = async function() {
      const permission = await Notification.requestPermission();
      log(`Permission: ${permission}`, permission === 'granted' ? 'success' : 'error');
    }

    window.getToken = async function() {
      try {
        const token = await getToken(messaging, { vapidKey: window.vapidKey });
        log(`FCM Token: ${token}`, 'success');
        localStorage.setItem('fcm_token', token);
      } catch (err) {
        log(`Error: ${err.message}`, 'error');
      }
    }

    window.sendTestNotification = async function() {
      const authToken = localStorage.getItem('auth_token');
      const userId = prompt('Nhập User ID:');

      if (!authToken) {
        log('Chưa có auth token. Vui lòng login trước.', 'error');
        return;
      }

      if (!userId) {
        log('Chưa nhập User ID', 'error');
        return;
      }

      try {
        const res = await fetch('http://localhost:5000/api/notifications', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipient_id: userId,
            audience: 'user',
            type: 'system',
            title: '🧪 Test Notification',
            content: {
              message: 'Đây là test notification. Nếu bạn thấy được thì hệ thống đã hoạt động!'
            },
            priority: 3
          })
        });

        const data = await res.json();
        
        if (data.success) {
          log('✅ Đã gửi test notification thành công!', 'success');
          log('Kiểm tra xem có nhận được notification không...', 'warning');
        } else {
          log(`❌ Lỗi: ${data.message}`, 'error');
        }
      } catch (err) {
        log(`❌ Error: ${err.message}`, 'error');
      }
    }
  </script>
</body>
</html>
```

**Cách dùng:**
1. Thay các config Firebase trong file
2. Mở `http://localhost:3000/test-notification.html`
3. Click "Kiểm Tra Tất Cả"
4. Click "Gửi Test Notification"

---

### 🔍 Tool 4.2: Console Debug Script

**Copy vào Console:**

```javascript
// Script debug toàn diện
(async function debugPushNotification() {
  console.log('🧪 === DEBUG PUSH NOTIFICATION ===\n');

  // 1. Permission
  console.log('1️⃣  Permission:', Notification.permission);
  if (Notification.permission !== 'granted') {
    console.warn('⚠️  Permission chưa được cấp!');
  }

  // 2. Service Worker
  const regs = await navigator.serviceWorker.getRegistrations();
  console.log('2️⃣  Service Workers:', regs.length);
  regs.forEach((reg, i) => {
    console.log(`   [${i}] Scope:`, reg.scope);
    console.log(`   [${i}] Active:`, !!reg.active);
  });

  // 3. FCM Token
  const fcmToken = localStorage.getItem('fcm_token');
  console.log('3️⃣  FCM Token:', fcmToken ? '✅ Có' : '❌ Không có');
  if (fcmToken) {
    console.log('   Token:', fcmToken);
  }

  // 4. Auth Token
  const authToken = localStorage.getItem('auth_token');
  console.log('4️⃣  Auth Token:', authToken ? '✅ Có' : '❌ Không có');

  // 5. Service Worker File
  try {
    const res = await fetch('/firebase-messaging-sw.js');
    console.log('5️⃣  Service Worker File:', res.status === 200 ? '✅ OK' : '❌ Not Found');
  } catch (err) {
    console.log('5️⃣  Service Worker File: ❌ Error -', err.message);
  }

  // 6. Test gửi notification
  console.log('\n📤 Để test gửi notification, chạy:');
  console.log(`
    fetch('http://localhost:5000/api/notifications', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ${authToken}',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient_id: 'YOUR_USER_ID',
        audience: 'user',
        type: 'system',
        title: 'Test',
        content: { message: 'Test message' }
      })
    }).then(r => r.json()).then(console.log);
  `);

  console.log('\n=== END DEBUG ===');
})();
```

---

## ✅ Checklist Test

### Backend:
- [ ] Server log có `✅ Firebase initialized`
- [ ] Bảng `DeviceTokens` đã tồn tại
- [ ] API `/api/notifications` trả về success
- [ ] Log server có `✅ Push notification sent`

### Frontend:
- [ ] `Notification.permission === 'granted'`
- [ ] Service Worker đã đăng ký (count > 0)
- [ ] FCM Token đã được lấy và lưu
- [ ] Token đã gửi lên server thành công
- [ ] File `firebase-messaging-sw.js` accessible (status 200)

### Test Nhận:
- [ ] Gửi test notification qua API
- [ ] Tab đang mở: Thấy log trong Console + notification hiển thị
- [ ] Tab đóng: Notification hiển thị ở notification center
- [ ] Click notification: App mở và navigate đúng

---

## 🎯 Kết Luận

Nếu tất cả checklist đều ✅, hệ thống push notification đã hoạt động hoàn hảo!

**Nếu vẫn không nhận được notification, kiểm tra lại từng bước theo thứ tự.**
