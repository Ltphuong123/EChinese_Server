# 🔔 ReactJS Push Notification - Hướng Dẫn Hoàn Chỉnh

## 📋 Mục Lục
1. [Cài đặt Firebase](#1-cài-đặt-firebase)
2. [Cấu hình Firebase](#2-cấu-hình-firebase)
3. [Tạo Service Worker](#3-tạo-service-worker)
4. [Setup Firebase trong React](#4-setup-firebase-trong-react)
5. [Tạo Notification Helper](#5-tạo-notification-helper)
6. [Tích hợp vào App](#6-tích-hợp-vào-app)
7. [Testing](#7-testing)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Cài Đặt Firebase

```bash
npm install firebase
# hoặc
yarn add firebase
```

---

## 2. Cấu Hình Firebase

### Bước 2.1: Lấy Firebase Config

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Chọn project
3. **Project Settings** (⚙️) → **General**
4. Scroll xuống **Your apps** → Click **Web app** (</>)
5. Copy config

### Bước 2.2: Lấy VAPID Key

1. **Project Settings** → **Cloud Messaging**
2. Scroll xuống **Web configuration**
3. Click **Generate key pair**
4. Copy VAPID key

### Bước 2.3: Tạo `.env`

```bash
# .env
REACT_APP_API_URL=http://localhost:5000/api

REACT_APP_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-app
REACT_APP_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
REACT_APP_FIREBASE_VAPID_KEY=BPXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx
```

---

## 3. Tạo Service Worker

### File: `public/firebase-messaging-sw.js`


```javascript
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Thay bằng config của bạn
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Nhận notification khi app đóng/background
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message:', payload);
  
  const title = payload.notification?.title || 'Thông báo mới';
  const options = {
    body: payload.notification?.body || '',
    icon: '/logo192.png',
    badge: '/badge.png',
    data: payload.data,
    tag: payload.data?.notification_id || 'default',
  };

  self.registration.showNotification(title, options);
});

// Xử lý click notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.redirect_url 
    ? event.notification.data.redirect_url.replace('app:/', '')
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
```

---

## 4. Setup Firebase Trong React

### File: `src/firebase/config.js`

```javascript
// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, getToken, onMessage, VAPID_KEY };
```

---

## 5. Tạo Notification Helper

### File: `src/utils/notificationHelper.js`

```javascript
// src/utils/notificationHelper.js
import { messaging, getToken, onMessage, VAPID_KEY } from '../firebase/config';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Request permission
export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Permission granted');
      return true;
    }
    
    console.log('❌ Permission denied');
    return false;
  } catch (error) {
    console.error('Error requesting permission:', error);
    return false;
  }
}

// Get FCM token
export async function getFCMToken() {
  try {
    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });

    if (currentToken) {
      console.log('📱 FCM Token:', currentToken);
      return currentToken;
    }
    
    console.log('⚠️  No token available');
    return null;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

// Register token với backend
export async function registerDeviceToken(authToken) {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return null;

    const fcmToken = await getFCMToken();
    if (!fcmToken) return null;

    const savedToken = localStorage.getItem('fcm_token');
    if (savedToken === fcmToken) {
      console.log('✅ Token already registered');
      return fcmToken;
    }

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
      localStorage.setItem('fcm_token', fcmToken);
      console.log('✅ Token registered successfully');
      return fcmToken;
    }
  } catch (error) {
    console.error('❌ Error registering token:', error);
    return null;
  }
}

// Unregister token (logout)
export async function unregisterDeviceToken(authToken) {
  try {
    const fcmToken = localStorage.getItem('fcm_token');

    if (fcmToken) {
      await axios.delete(
        `${API_URL}/users/device-token`,
        {
          data: { token: fcmToken },
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      localStorage.removeItem('fcm_token');
      console.log('✅ Token unregistered');
    }
  } catch (error) {
    console.error('❌ Error unregistering token:', error);
  }
}

// Setup foreground listener
export function setupForegroundListener(callback) {
  return onMessage(messaging, (payload) => {
    console.log('📩 Foreground message:', payload);
    
    if (callback) callback(payload);

    if (Notification.permission === 'granted') {
      new Notification(
        payload.notification?.title || 'Thông báo mới',
        {
          body: payload.notification?.body || '',
          icon: '/logo192.png',
          badge: '/badge.png',
          data: payload.data,
        }
      );
    }
  });
}
```

---

## 6. Tích Hợp Vào App

### File: `src/App.js`

```javascript
// src/App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import {
  registerDeviceToken,
  setupForegroundListener
} from './utils/notificationHelper';

function App() {
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const authToken = localStorage.getItem('auth_token');
    
    if (authToken) {
      // Register device token
      registerDeviceToken(authToken);
    }

    // Setup foreground listener
    const unsubscribe = setupForegroundListener((payload) => {
      console.log('Received:', payload);
      setNotificationCount(prev => prev + 1);
    });

    return () => unsubscribe && unsubscribe();
  }, []);

  return (
    <Router>
      <div className="App">
        <Header notificationCount={notificationCount} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
```

### File: `src/components/Login.js`

```javascript
// src/components/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { registerDeviceToken } from '../utils/notificationHelper';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      const { token } = response.data;
      localStorage.setItem('auth_token', token);

      // Register device token
      await registerDeviceToken(token);

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

### File: `src/components/Header.js`

```javascript
// src/components/Header.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Header() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
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
          🔔
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

---

## 7. Testing

### Test 1: Kiểm tra Permission

Mở Console:
```javascript
console.log('Permission:', Notification.permission);
```

### Test 2: Kiểm tra Service Worker

Console:
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs);
});
```

### Test 3: Kiểm tra FCM Token

Console:
```javascript
const token = localStorage.getItem('fcm_token');
console.log('FCM Token:', token);
```

### Test 4: Gửi Test Notification

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "your-user-id",
    "audience": "user",
    "type": "system",
    "title": "Test",
    "content": { "message": "Test message" }
  }'
```

---

## 8. Troubleshooting

### ❌ Không nhận được notification

**Kiểm tra:**

1. Permission đã granted chưa?
```javascript
console.log(Notification.permission); // phải là "granted"
```

2. Service Worker đã đăng ký chưa?
```javascript
navigator.serviceWorker.getRegistrations().then(console.log);
```

3. FCM Token đã được lấy chưa?
```javascript
console.log(localStorage.getItem('fcm_token'));
```

4. Token đã gửi lên server chưa?
- Kiểm tra Network tab trong DevTools
- Xem request `POST /api/users/device-token`

5. Backend có Firebase config chưa?
- Xem log server khi khởi động
- Phải thấy: `✅ Firebase initialized`

### ❌ Service Worker không hoạt động

**Giải pháp:**
- File `firebase-messaging-sw.js` phải ở `public/`
- Chỉ hoạt động trên HTTPS (hoặc localhost)
- Clear cache và reload

### ❌ Token không được lưu

**Kiểm tra:**
- API endpoint đúng chưa: `/api/users/device-token`
- Auth token có hợp lệ không
- Xem response trong Network tab

---

## 📝 Checklist

- [ ] Cài đặt Firebase
- [ ] Tạo `.env` với Firebase config
- [ ] Tạo `public/firebase-messaging-sw.js`
- [ ] Tạo `src/firebase/config.js`
- [ ] Tạo `src/utils/notificationHelper.js`
- [ ] Tích hợp vào `App.js`
- [ ] Xử lý login → register token
- [ ] Hiển thị badge unread count
- [ ] Test nhận notification
- [ ] Test click notification

---

## 🎯 Kết Luận

Sau khi hoàn thành các bước trên, web app của bạn sẽ:
- ✅ Nhận push notification khi tab đang mở
- ✅ Nhận push notification khi tab đóng
- ✅ Hiển thị badge số thông báo chưa đọc
- ✅ Navigate khi click notification

**Chúc bạn thành công! 🚀**
