# 📱 Hướng Dẫn Tích Hợp Push Notification - ReactJS (Web)

## 🎯 Tổng Quan

Hướng dẫn này giúp frontend ReactJS tích hợp push notification với backend đã setup sẵn.

---

## 📦 Bước 1: Cài Đặt Firebase

```bash
npm install firebase
# hoặc
yarn add firebase
```

---

## 🔧 Bước 2: Lấy Firebase Config

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Chọn project của bạn
3. Vào **Project Settings** (⚙️) → **General**
4. Scroll xuống phần **Your apps**
5. Click vào **Web app** (</>) hoặc **Add app** nếu chưa có
6. Copy **Firebase configuration**

Bạn sẽ nhận được config như này:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

---

## 🔑 Bước 3: Lấy VAPID Key

1. Vẫn ở **Firebase Console** → **Project Settings**
2. Chọn tab **Cloud Messaging**
3. Scroll xuống phần **Web configuration**
4. Click **Generate key pair** (nếu chưa có)
5. Copy **Key pair** (VAPID key)

```
Key pair: BPXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx
```

---

## 📝 Bước 4: Tạo Firebase Config File

### Tạo file `src/firebase/config.js`:

```javascript
// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase configuration từ Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// VAPID key từ Firebase Console
const VAPID_KEY = "BPXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = getMessaging(app);

export { messaging, getToken, onMessage, VAPID_KEY };
```

---

## 🔔 Bước 5: Tạo Service Worker

### Tạo file `public/firebase-messaging-sw.js`:

```javascript
// public/firebase-messaging-sw.js

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration (giống với config ở trên)
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'Thông báo mới';
  const notificationOptions = {
    body: payload.notification?.body || 'Bạn có một thông báo mới',
    icon: '/logo192.png', // Icon của app
    badge: '/badge.png',
    data: payload.data,
    tag: payload.data?.notification_id || 'default',
    requireInteraction: false,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);
  
  event.notification.close();

  // Lấy URL từ notification data
  const urlToOpen = event.notification.data?.redirect_url || '/';
  
  // Mở hoặc focus vào tab
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Nếu đã có tab mở, focus vào tab đó
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Nếu chưa có, mở tab mới
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
```

---

## 🛠️ Bước 6: Tạo Notification Helper

### Tạo file `src/utils/notificationHelper.js`:

```javascript
// src/utils/notificationHelper.js
import { messaging, getToken, onMessage, VAPID_KEY } from '../firebase/config';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      return true;
    } else if (permission === 'denied') {
      console.log('❌ Notification permission denied');
      return false;
    } else {
      console.log('⚠️ Notification permission dismissed');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Get FCM token
 */
export async function getFCMToken() {
  try {
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    if (currentToken) {
      console.log('📱 FCM Token:', currentToken);
      return currentToken;
    } else {
      console.log('⚠️ No registration token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Register device token with backend
 */
export async function registerDeviceToken(authToken) {
  try {
    // 1. Request permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('No notification permission');
      return null;
    }

    // 2. Get FCM token
    const fcmToken = await getFCMToken();
    if (!fcmToken) {
      console.log('Failed to get FCM token');
      return null;
    }

    // 3. Check if token already saved
    const savedToken = localStorage.getItem('fcm_token');
    if (savedToken === fcmToken) {
      console.log('✅ Token already registered');
      return fcmToken;
    }

    // 4. Send token to backend
    const response = await axios.post(
      `${API_URL}/users/device-token`,
      {
        token: fcmToken,
        platform: 'web',
        deviceInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      // 5. Save token to localStorage
      localStorage.setItem('fcm_token', fcmToken);
      console.log('✅ Device token registered successfully');
      return fcmToken;
    }
  } catch (error) {
    console.error('❌ Error registering device token:', error);
    return null;
  }
}

/**
 * Unregister device token (call on logout)
 */
export async function unregisterDeviceToken(authToken) {
  try {
    const fcmToken = localStorage.getItem('fcm_token');

    if (fcmToken) {
      await axios.delete(
        `${API_URL}/users/device-token`,
        {
          data: { token: fcmToken },
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      localStorage.removeItem('fcm_token');
      console.log('✅ Device token unregistered');
    }
  } catch (error) {
    console.error('❌ Error unregistering token:', error);
  }
}

/**
 * Setup foreground message listener
 */
export function setupForegroundListener(callback) {
  return onMessage(messaging, (payload) => {
    console.log('📩 Foreground message received:', payload);
    
    // Call callback function
    if (callback) {
      callback(payload);
    }

    // Show browser notification
    if (Notification.permission === 'granted') {
      const notificationTitle = payload.notification?.title || 'Thông báo mới';
      const notificationOptions = {
        body: payload.notification?.body || 'Bạn có một thông báo mới',
        icon: '/logo192.png',
        badge: '/badge.png',
        data: payload.data,
        tag: payload.data?.notification_id || 'default',
      };

      new Notification(notificationTitle, notificationOptions);
    }
  });
}
```

---

## 🚀 Bước 7: Tích Hợp Vào App Component

### Cập nhật `src/App.js`:

```javascript
// src/App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import {
  registerDeviceToken,
  unregisterDeviceToken,
  setupForegroundListener
} from './utils/notificationHelper';

function App() {
  const [authToken, setAuthToken] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    // Lấy auth token từ localStorage
    const token = localStorage.getItem('auth_token');
    if (token) {
      setAuthToken(token);
      
      // Register device token khi user đã login
      registerDeviceToken(token);
    }

    // Setup foreground message listener
    const unsubscribe = setupForegroundListener((payload) => {
      console.log('Received notification:', payload);
      
      // Cập nhật notification count
      setNotificationCount(prev => prev + 1);
      
      // Có thể show toast notification
      // toast.success(payload.notification?.title);
    });

    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <Router>
      <div className="App">
        <Header notificationCount={notificationCount} />
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login setAuthToken={setAuthToken} />} />
          <Route path="/post/:id" element={<PostDetail />} />
          {/* Other routes */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
```

---

## 🔐 Bước 8: Xử Lý Login/Logout

### Login Component:

```javascript
// src/components/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { registerDeviceToken } from '../utils/notificationHelper';

function Login({ setAuthToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      // 1. Login API
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      const { token } = response.data;

      // 2. Save token
      localStorage.setItem('auth_token', token);
      setAuthToken(token);

      // 3. Register device token for push notifications
      await registerDeviceToken(token);

      // 4. Navigate to home
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
      alert('Đăng nhập thất bại');
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Đăng nhập</button>
    </form>
  );
}

export default Login;
```

### Logout Function:

```javascript
// src/utils/auth.js
import { unregisterDeviceToken } from './notificationHelper';

export async function handleLogout() {
  try {
    const authToken = localStorage.getItem('auth_token');

    // 1. Unregister device token
    if (authToken) {
      await unregisterDeviceToken(authToken);
    }

    // 2. Clear localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('fcm_token');

    // 3. Redirect to login
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout failed:', error);
  }
}
```

---

## 🔔 Bước 9: Hiển Thị Notification Badge

```javascript
// src/components/Header.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bell } from 'lucide-react'; // hoặc icon library khác

function Header() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();

    // Poll mỗi 30 giây (hoặc dùng WebSocket)
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUnreadCount(response.data.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  return (
    <header>
      <nav>
        <div className="notification-icon">
          <Bell size={24} />
          {unreadCount > 0 && (
            <span className="badge">{unreadCount}</span>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Header;
```

**CSS cho badge:**

```css
/* src/components/Header.css */
.notification-icon {
  position: relative;
  cursor: pointer;
}

.notification-icon .badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #ff4444;
  color: white;
  border-radius: 50%;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: bold;
  min-width: 20px;
  text-align: center;
}
```

---

## 🎨 Bước 10: Xử Lý Navigation Khi Click Notification

```javascript
// src/utils/notificationHelper.js (thêm vào)

/**
 * Handle notification click navigation
 */
export function handleNotificationClick(payload, navigate) {
  const { redirect_url, type, post_id } = payload.data || {};

  if (redirect_url) {
    // Parse URL: app://post/123 → /post/123
    const path = redirect_url.replace('app:/', '');
    navigate(path);
  } else if (type === 'community' && post_id) {
    navigate(`/post/${post_id}`);
  } else {
    navigate('/notifications');
  }
}
```

**Sử dụng trong App.js:**

```javascript
import { useNavigate } from 'react-router-dom';
import { handleNotificationClick } from './utils/notificationHelper';

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = setupForegroundListener((payload) => {
      // Show notification
      console.log('Received:', payload);
      
      // Có thể tự động navigate hoặc show modal
      // handleNotificationClick(payload, navigate);
    });

    return () => unsubscribe && unsubscribe();
  }, [navigate]);

  // ...
}
```

---

## 🧪 Bước 11: Test Notification

### Test 1: Request Permission

Mở browser console và chạy:

```javascript
Notification.requestPermission().then(permission => {
  console.log('Permission:', permission);
});
```

### Test 2: Gửi Test Notification Từ Backend

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "your-user-uuid",
    "audience": "user",
    "type": "system",
    "title": "Test Notification",
    "content": { "message": "This is a test from backend" },
    "redirect_url": "app://home"
  }'
```

### Test 3: Gửi Từ Firebase Console

1. Vào Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Nhập title, body
4. Click "Send test message"
5. Paste FCM token (lấy từ console.log)
6. Click "Test"

---

## 🔍 Troubleshooting

### Không nhận được notification

**Kiểm tra:**

1. ✅ Permission đã được cấp chưa?
```javascript
console.log('Permission:', Notification.permission);
```

2. ✅ Service Worker đã đăng ký chưa?
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});
```

3. ✅ FCM token đã được lấy chưa?
```javascript
const token = localStorage.getItem('fcm_token');
console.log('FCM Token:', token);
```

4. ✅ Token đã được gửi lên server chưa?
```bash
# Check trong database
SELECT * FROM "DeviceTokens" WHERE platform = 'web';
```

### Lỗi: "Messaging: We are unable to register the default service worker"

**Giải pháp:** Đảm bảo file `firebase-messaging-sw.js` nằm trong thư mục `public/`

### Lỗi: "Messaging: This browser doesn't support the API's required"

**Giải pháp:** Dùng browser hỗ trợ (Chrome, Firefox, Edge). Safari không hỗ trợ FCM.

### Notification không hiển thị khi tab đang mở

**Giải pháp:** Dùng `onMessage` handler để hiển thị notification thủ công:

```javascript
onMessage(messaging, (payload) => {
  new Notification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/logo192.png'
  });
});
```

---

## 📋 Checklist

- [ ] Cài đặt Firebase
- [ ] Lấy Firebase config và VAPID key
- [ ] Tạo file `src/firebase/config.js`
- [ ] Tạo file `public/firebase-messaging-sw.js`
- [ ] Tạo notification helper
- [ ] Tích hợp vào App component
- [ ] Xử lý login/logout
- [ ] Hiển thị notification badge
- [ ] Test notification
- [ ] Deploy và test trên production

---

## 🌐 Deploy Lên Production

### Cập nhật `.env.production`:

```bash
REACT_APP_API_URL=https://your-api.com/api
```

### Build:

```bash
npm run build
```

### Đảm bảo Service Worker hoạt động:

1. Service Worker chỉ hoạt động trên HTTPS (hoặc localhost)
2. File `firebase-messaging-sw.js` phải accessible tại `/firebase-messaging-sw.js`
3. Kiểm tra trong DevTools → Application → Service Workers

---

## 📚 API Endpoints

### Lưu Device Token
```http
POST /api/users/device-token
Authorization: Bearer <token>

{
  "token": "fcm-token",
  "platform": "web"
}
```

### Xóa Device Token
```http
DELETE /api/users/device-token
Authorization: Bearer <token>

{
  "token": "fcm-token"
}
```

### Lấy Số Thông Báo Chưa Đọc
```http
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

---

## 🎯 Tính Năng Nâng Cao (Optional)

### 1. Toast Notification với react-toastify

```bash
npm install react-toastify
```

```javascript
import { toast } from 'react-toastify';

setupForegroundListener((payload) => {
  toast.info(payload.notification.title, {
    onClick: () => handleNotificationClick(payload, navigate)
  });
});
```

### 2. Sound khi nhận notification

```javascript
const notificationSound = new Audio('/notification.mp3');

setupForegroundListener((payload) => {
  notificationSound.play();
  // ...
});
```

### 3. Desktop Notification với custom style

```javascript
const notification = new Notification(title, {
  body: body,
  icon: '/logo192.png',
  badge: '/badge.png',
  image: imageUrl, // Large image
  actions: [
    { action: 'view', title: 'Xem' },
    { action: 'dismiss', title: 'Đóng' }
  ]
});

notification.onclick = () => {
  window.focus();
  navigate('/notifications');
};
```

---

## ✅ Hoàn Thành!

Bây giờ web app ReactJS của bạn đã có push notification! 🎉

**Các tính năng đã có:**
- ✅ Nhận push notification khi tab đang mở
- ✅ Nhận push notification khi tab đóng (background)
- ✅ Click notification để navigate
- ✅ Hiển thị badge số thông báo chưa đọc
- ✅ Tự động đăng ký token khi login
- ✅ Tự động xóa token khi logout

**Chúc bạn thành công! 🚀**
