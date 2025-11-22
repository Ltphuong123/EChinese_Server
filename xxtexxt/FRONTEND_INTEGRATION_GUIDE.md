# 📱 Hướng Dẫn Tích Hợp Push Notification - Frontend

## 🎯 Tổng Quan

Hướng dẫn này giúp frontend (React Native) tích hợp push notification với backend đã setup sẵn.

---

## 📦 Bước 1: Cài Đặt Dependencies

```bash
# React Native Firebase
npm install @react-native-firebase/app @react-native-firebase/messaging

# Optional: Để hiển thị notification đẹp hơn khi app đang mở
npm install @notifee/react-native

# AsyncStorage để lưu token
npm install @react-native-async-storage/async-storage
```

---

## 🔧 Bước 2: Cấu Hình Firebase

### Android

1. Tải `google-services.json` từ Firebase Console
2. Đặt vào `android/app/google-services.json`
3. Thêm vào `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
  <application>
    <!-- Thêm vào đây -->
    <meta-data
      android:name="com.google.firebase.messaging.default_notification_channel_id"
      android:value="default_channel" />
  </application>
</manifest>
```

### iOS

1. Tải `GoogleService-Info.plist` từ Firebase Console
2. Đặt vào `ios/YourAppName/GoogleService-Info.plist`
3. Mở Xcode → Capabilities → Enable Push Notifications

---

## 📝 Bước 3: Tạo Helper Functions

Tạo file `utils/notificationHelper.js`:

```javascript
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import axios from 'axios';

const API_URL = 'https://your-api-url.com/api';

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
  try {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('❌ User denied notification permission');
        return false;
      }
    }

    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('❌ User denied notification permission');
        return false;
      }
    }

    console.log('✅ Notification permission granted');
    return true;
  } catch (error) {
    console.error('Error requesting permission:', error);
    return false;
  }
}

/**
 * Register device token with backend
 */
export async function registerDeviceToken(authToken) {
  try {
    // 1. Lấy FCM token
    const fcmToken = await messaging().getToken();
    console.log('📱 FCM Token:', fcmToken);

    // 2. Kiểm tra xem đã gửi token này chưa
    const savedToken = await AsyncStorage.getItem('fcm_token');
    if (savedToken === fcmToken) {
      console.log('✅ Token already registered');
      return fcmToken;
    }

    // 3. Gửi token lên server
    const response = await axios.post(
      `${API_URL}/users/device-token`,
      {
        token: fcmToken,
        platform: Platform.OS,
        deviceInfo: {
          model: Platform.constants?.Model || 'Unknown',
          osVersion: Platform.Version,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.success) {
      // 4. Lưu token vào local storage
      await AsyncStorage.setItem('fcm_token', fcmToken);
      console.log('✅ Device token registered successfully');
      return fcmToken;
    }
  } catch (error) {
    console.error('❌ Error registering device token:', error);
    throw error;
  }
}

/**
 * Unregister device token (call on logout)
 */
export async function unregisterDeviceToken(authToken) {
  try {
    const fcmToken = await AsyncStorage.getItem('fcm_token');

    if (fcmToken) {
      await axios.delete(`${API_URL}/users/device-token`, {
        data: { token: fcmToken },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      await AsyncStorage.removeItem('fcm_token');
      await messaging().deleteToken();

      console.log('✅ Device token unregistered');
    }
  } catch (error) {
    console.error('❌ Error unregistering token:', error);
  }
}

/**
 * Listen to token refresh
 */
export function listenToTokenRefresh(authToken) {
  return messaging().onTokenRefresh(async (newToken) => {
    console.log('🔄 Token refreshed:', newToken);

    try {
      await axios.post(
        `${API_URL}/users/device-token`,
        {
          token: newToken,
          platform: Platform.OS,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      await AsyncStorage.setItem('fcm_token', newToken);
    } catch (error) {
      console.error('Error updating refreshed token:', error);
    }
  });
}

/**
 * Create notification channel (Android only)
 */
export async function createNotificationChannel() {
  if (Platform.OS === 'android') {
    const notifee = require('@notifee/react-native').default;
    
    await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: 4, // HIGH
      sound: 'default',
      vibration: true,
    });
  }
}
```

---

## 🚀 Bước 4: Setup trong App Component

Tạo file `App.tsx` hoặc `App.js`:

```javascript
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import { useNavigation } from '@react-navigation/native';
import {
  requestNotificationPermission,
  registerDeviceToken,
  listenToTokenRefresh,
  createNotificationChannel,
  unregisterDeviceToken,
} from './utils/notificationHelper';

function App() {
  const navigation = useNavigation();
  const authToken = 'your-auth-token'; // Lấy từ Redux/Context

  useEffect(() => {
    setupNotifications();

    // Cleanup
    return () => {
      // Unsubscribe listeners if needed
    };
  }, []);

  async function setupNotifications() {
    // 1. Request permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('No notification permission');
      return;
    }

    // 2. Create notification channel (Android)
    await createNotificationChannel();

    // 3. Register device token
    try {
      await registerDeviceToken(authToken);
    } catch (error) {
      console.error('Failed to register token:', error);
    }

    // 4. Listen to token refresh
    const unsubscribeTokenRefresh = listenToTokenRefresh(authToken);

    // 5. Handle foreground notifications (app đang mở)
    const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      console.log('📩 Foreground notification:', remoteMessage);

      // Hiển thị notification local
      await notifee.displayNotification({
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
        android: {
          channelId: 'default',
          smallIcon: 'ic_launcher',
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
        data: remoteMessage.data,
      });

      // Cập nhật badge/counter
      // dispatch(incrementNotificationCount());
    });

    // 6. Handle notification opened (app background)
    const unsubscribeNotificationOpen = messaging().onNotificationOpenedApp(
      (remoteMessage) => {
        console.log('👆 Notification opened (background):', remoteMessage);
        handleNotificationNavigation(remoteMessage);
      }
    );

    // 7. Handle app opened from notification (app closed)
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('🚀 App opened from notification:', remoteMessage);
          handleNotificationNavigation(remoteMessage);
        }
      });

    // Return cleanup function
    return () => {
      unsubscribeForeground();
      unsubscribeNotificationOpen();
      unsubscribeTokenRefresh();
    };
  }

  /**
   * Navigate based on notification data
   */
  function handleNotificationNavigation(remoteMessage) {
    const { redirect_url, type, post_id, comment_id } = remoteMessage.data || {};

    if (redirect_url) {
      // Parse URL: app://post/123
      if (redirect_url.includes('post/')) {
        const postId = redirect_url.split('/').pop().split('#')[0];
        navigation.navigate('PostDetail', { postId });
      } else if (redirect_url.includes('comment/')) {
        const commentId = redirect_url.split('/').pop();
        navigation.navigate('CommentDetail', { commentId });
      } else if (redirect_url.includes('home')) {
        navigation.navigate('Home');
      }
    } else if (type === 'community' && post_id) {
      navigation.navigate('PostDetail', { postId: post_id });
    }
  }

  return (
    // Your app components
    <YourAppComponents />
  );
}

export default App;
```

---

## 🔥 Bước 5: Background Handler

Trong file `index.js` (root file):

```javascript
import messaging from '@react-native-firebase/messaging';

// Background handler - PHẢI đặt NGOÀI component
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('📩 Background notification:', remoteMessage);
  
  // Có thể lưu vào local storage hoặc xử lý logic khác
  // KHÔNG được dùng navigation ở đây
});

// Import App component
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

---

## 🔐 Bước 6: Xử Lý Login/Logout

### Khi Login

```javascript
import { registerDeviceToken } from './utils/notificationHelper';

async function handleLogin(username, password) {
  try {
    // 1. Login API
    const response = await axios.post('/api/auth/login', {
      username,
      password,
    });

    const { token } = response.data;

    // 2. Lưu token
    await AsyncStorage.setItem('auth_token', token);

    // 3. Đăng ký device token
    await registerDeviceToken(token);

    // 4. Navigate to home
    navigation.navigate('Home');
  } catch (error) {
    console.error('Login failed:', error);
  }
}
```

### Khi Logout

```javascript
import { unregisterDeviceToken } from './utils/notificationHelper';

async function handleLogout() {
  try {
    const authToken = await AsyncStorage.getItem('auth_token');

    // 1. Xóa device token trên server
    await unregisterDeviceToken(authToken);

    // 2. Xóa auth token local
    await AsyncStorage.removeItem('auth_token');

    // 3. Navigate to login
    navigation.navigate('Login');
  } catch (error) {
    console.error('Logout failed:', error);
  }
}
```

---

## 🎨 Bước 7: Hiển Thị Badge Số Thông Báo

```javascript
import { useEffect, useState } from 'react';
import axios from 'axios';

function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();

    // Lắng nghe notification mới
    const unsubscribe = messaging().onMessage(() => {
      fetchUnreadCount();
    });

    return unsubscribe;
  }, []);

  async function fetchUnreadCount() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUnreadCount(response.data.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }

  return (
    <View>
      <Icon name="bell" />
      {unreadCount > 0 && (
        <Badge value={unreadCount} />
      )}
    </View>
  );
}
```

---

## 🧪 Bước 8: Test Notification

### Test 1: Gửi từ Backend

```bash
# Dùng Postman hoặc curl
curl -X POST https://your-api.com/api/notifications \
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

### Test 2: Gửi từ Firebase Console

1. Vào Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Nhập tiêu đề, nội dung
4. Chọn device token (copy từ log app)
5. Click Send

---

## 🔍 Troubleshooting

### Không nhận được notification

**Kiểm tra:**
1. ✅ Permission đã được cấp chưa?
2. ✅ Token đã được gửi lên server chưa?
3. ✅ Firebase config đúng chưa?
4. ✅ App có chạy background handler không?

**Debug:**
```javascript
// Kiểm tra token
const token = await messaging().getToken();
console.log('Current token:', token);

// Kiểm tra permission
const authStatus = await messaging().hasPermission();
console.log('Permission status:', authStatus);
```

### Token không được lưu

**Giải pháp:**
- Kiểm tra API endpoint: `/api/users/device-token`
- Kiểm tra auth token có hợp lệ không
- Xem log server để biết lỗi gì

### Notification không hiển thị khi app mở

**Giải pháp:**
- Cài `@notifee/react-native`
- Dùng `notifee.displayNotification()` trong `onMessage` handler

---

## 📚 API Endpoints

### 1. Lưu Device Token
```
POST /api/users/device-token
Authorization: Bearer <token>

Body:
{
  "token": "fcm-token",
  "platform": "android",
  "deviceInfo": { "model": "...", "osVersion": "..." }
}
```

### 2. Xóa Device Token
```
DELETE /api/users/device-token
Authorization: Bearer <token>

Body:
{
  "token": "fcm-token"
}
```

### 3. Lấy Số Thông Báo Chưa Đọc
```
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

### 4. Lấy Danh Sách Thông Báo
```
GET /api/notifications?page=1&limit=20
Authorization: Bearer <token>
```

---

## ✅ Checklist

- [ ] Cài đặt dependencies
- [ ] Thêm Firebase config files
- [ ] Tạo notification helper
- [ ] Setup App component
- [ ] Thêm background handler
- [ ] Xử lý login/logout
- [ ] Test notification
- [ ] Hiển thị badge
- [ ] Handle navigation

---

## 🆘 Cần Hỗ Trợ?

Nếu gặp vấn đề, liên hệ team backend hoặc kiểm tra:
- [React Native Firebase Docs](https://rnfirebase.io/)
- [Notifee Docs](https://notifee.app/)
- Backend logs để xem notification có được gửi không

---

**Chúc bạn tích hợp thành công! 🎉**
