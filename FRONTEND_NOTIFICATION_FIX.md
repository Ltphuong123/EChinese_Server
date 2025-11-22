# Fix Duplicate Notifications trên Frontend

## Vấn đề
Backend chỉ gửi **1 notification**, nhưng frontend hiển thị **2 notifications**.

## Nguyên nhân
Frontend đang xử lý notification 2 lần do:
1. Event listener bị đăng ký duplicate
2. Cả foreground và background handler đều show notification
3. Service Worker bị duplicate

---

## Giải pháp theo Platform

### 1. React Native (Firebase Messaging)

#### ❌ Code SAI (gây duplicate):
```javascript
import messaging from '@react-native-firebase/messaging';

function App() {
  useEffect(() => {
    // Listener này có thể bị đăng ký nhiều lần
    messaging().onMessage(async remoteMessage => {
      console.log('Notification received:', remoteMessage);
      // Show local notification
      showLocalNotification(remoteMessage);
    });
  }, []); // Không có cleanup
  
  return <View>...</View>;
}
```

#### ✅ Code ĐÚNG (fix duplicate):
```javascript
import messaging from '@react-native-firebase/messaging';
import { useEffect, useRef } from 'react';

function App() {
  const notificationCache = useRef(new Set());
  
  useEffect(() => {
    // Foreground message handler
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      const notificationId = remoteMessage.data?.notification_id;
      
      // Check duplicate bằng notification_id
      if (notificationId && notificationCache.current.has(notificationId)) {
        console.log('⚠️ Duplicate notification detected, skipping:', notificationId);
        return;
      }
      
      // Add to cache
      if (notificationId) {
        notificationCache.current.add(notificationId);
        
        // Remove from cache sau 5 giây
        setTimeout(() => {
          notificationCache.current.delete(notificationId);
        }, 5000);
      }
      
      console.log('✅ Notification received:', remoteMessage);
      showLocalNotification(remoteMessage);
    });
    
    // Cleanup khi component unmount
    return () => {
      unsubscribeForeground();
      notificationCache.current.clear();
    };
  }, []);
  
  return <View>...</View>;
}

// Helper function
function showLocalNotification(remoteMessage) {
  // Chỉ show nếu app đang ở foreground
  if (AppState.currentState === 'active') {
    // Show in-app notification hoặc local notification
    PushNotification.localNotification({
      title: remoteMessage.notification?.title,
      message: remoteMessage.notification?.body,
      userInfo: remoteMessage.data,
    });
  }
}
```

#### Background Handler (index.js):
```javascript
import messaging from '@react-native-firebase/messaging';

// Background message handler - CHỈ ĐĂNG KÝ 1 LẦN
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background notification:', remoteMessage);
  
  // KHÔNG show notification ở đây nếu Firebase đã tự động show
  // Firebase sẽ tự động hiển thị notification khi app ở background
});
```

---

### 2. Flutter (Firebase Messaging)

#### ❌ Code SAI:
```dart
class _MyAppState extends State<MyApp> {
  @override
  void initState() {
    super.initState();
    
    // Listener này có thể bị đăng ký nhiều lần
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Notification received: ${message.notification?.title}');
      _showNotification(message);
    });
  }
}
```

#### ✅ Code ĐÚNG:
```dart
class _MyAppState extends State<MyApp> {
  StreamSubscription<RemoteMessage>? _messageSubscription;
  final Set<String> _notificationCache = {};
  
  @override
  void initState() {
    super.initState();
    _setupNotifications();
  }
  
  void _setupNotifications() {
    // Foreground messages
    _messageSubscription = FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final notificationId = message.data['notification_id'];
      
      // Check duplicate
      if (notificationId != null && _notificationCache.contains(notificationId)) {
        print('⚠️ Duplicate notification detected, skipping: $notificationId');
        return;
      }
      
      // Add to cache
      if (notificationId != null) {
        _notificationCache.add(notificationId);
        
        // Remove from cache after 5 seconds
        Future.delayed(Duration(seconds: 5), () {
          _notificationCache.remove(notificationId);
        });
      }
      
      print('✅ Notification received: ${message.notification?.title}');
      _showNotification(message);
    });
  }
  
  void _showNotification(RemoteMessage message) {
    // Show local notification only if app is in foreground
    if (WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed) {
      // Show notification
      FlutterLocalNotificationsPlugin().show(
        message.hashCode,
        message.notification?.title,
        message.notification?.body,
        NotificationDetails(/* ... */),
      );
    }
  }
  
  @override
  void dispose() {
    _messageSubscription?.cancel();
    _notificationCache.clear();
    super.dispose();
  }
}
```

---

### 3. Web (Firebase JS SDK)

#### ❌ Code SAI:
```javascript
import { getMessaging, onMessage } from 'firebase/messaging';

function App() {
  useEffect(() => {
    const messaging = getMessaging();
    
    // Listener này có thể bị đăng ký nhiều lần
    onMessage(messaging, (payload) => {
      console.log('Message received:', payload);
      showNotification(payload);
    });
  }, []);
}
```

#### ✅ Code ĐÚNG:
```javascript
import { getMessaging, onMessage } from 'firebase/messaging';
import { useEffect, useRef } from 'react';

function App() {
  const messageListenerRef = useRef(null);
  const notificationCache = useRef(new Set());
  
  useEffect(() => {
    const messaging = getMessaging();
    
    // Chỉ đăng ký 1 lần
    if (!messageListenerRef.current) {
      messageListenerRef.current = onMessage(messaging, (payload) => {
        const notificationId = payload.data?.notification_id;
        
        // Check duplicate
        if (notificationId && notificationCache.current.has(notificationId)) {
          console.log('⚠️ Duplicate notification detected, skipping:', notificationId);
          return;
        }
        
        // Add to cache
        if (notificationId) {
          notificationCache.current.add(notificationId);
          
          // Remove from cache after 5 seconds
          setTimeout(() => {
            notificationCache.current.delete(notificationId);
          }, 5000);
        }
        
        console.log('✅ Message received:', payload);
        showNotification(payload);
      });
    }
    
    return () => {
      // Cleanup
      messageListenerRef.current = null;
      notificationCache.current.clear();
    };
  }, []);
  
  return <div>...</div>;
}

function showNotification(payload) {
  // Check if browser supports notifications
  if (!('Notification' in window)) {
    return;
  }
  
  // Check permission
  if (Notification.permission === 'granted') {
    new Notification(payload.notification.title, {
      body: payload.notification.body,
      icon: '/icon.png',
      data: payload.data,
      tag: payload.data?.notification_id, // Prevent duplicate with same tag
    });
  }
}
```

#### Service Worker (firebase-messaging-sw.js):
```javascript
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  // Your config
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const notificationId = payload.data?.notification_id;
  const timestamp = payload.data?.timestamp;
  
  // Check if notification already shown
  return self.registration.getNotifications().then(notifications => {
    const isDuplicate = notifications.some(n => 
      n.data?.notification_id === notificationId ||
      (timestamp && n.data?.timestamp === timestamp)
    );
    
    if (isDuplicate) {
      console.log('⚠️ Duplicate notification in service worker, skipping');
      return;
    }
    
    // Show notification
    return self.registration.showNotification(
      payload.notification.title,
      {
        body: payload.notification.body,
        icon: '/icon.png',
        data: payload.data,
        tag: notificationId, // Same tag = replace old notification
      }
    );
  });
});
```

---

## Checklist Debug

### 1. Kiểm tra số lượng listeners
```javascript
// React Native
console.log('Registering message listener...');
const unsubscribe = messaging().onMessage(handler);
console.log('Listener registered');

// Đảm bảo log này chỉ xuất hiện 1 lần khi app start
```

### 2. Kiểm tra notification_id
```javascript
// Log notification_id để đảm bảo không bị duplicate
onMessage(messaging, (payload) => {
  console.log('Notification ID:', payload.data?.notification_id);
  console.log('Timestamp:', payload.data?.timestamp);
});
```

### 3. Kiểm tra App State
```javascript
// React Native
import { AppState } from 'react-native';

console.log('Current app state:', AppState.currentState);
// 'active' = foreground
// 'background' = background
// 'inactive' = transitioning
```

### 4. Disable một trong hai handlers
```javascript
// Tạm thời comment background handler để test
// messaging().setBackgroundMessageHandler(async remoteMessage => {
//   console.log('Background notification:', remoteMessage);
// });

// Hoặc comment foreground handler
// messaging().onMessage(async remoteMessage => {
//   console.log('Foreground notification:', remoteMessage);
// });
```

---

## Best Practices

### 1. Sử dụng notification_id để check duplicate
```javascript
const notificationCache = new Set();

function handleNotification(message) {
  const id = message.data?.notification_id;
  
  if (id && notificationCache.has(id)) {
    return; // Skip duplicate
  }
  
  if (id) {
    notificationCache.add(id);
    setTimeout(() => notificationCache.delete(id), 5000);
  }
  
  showNotification(message);
}
```

### 2. Sử dụng notification tag (Web)
```javascript
// Notifications với cùng tag sẽ replace nhau
new Notification(title, {
  body: body,
  tag: notificationId, // Same tag = no duplicate
});
```

### 3. Cleanup listeners
```javascript
useEffect(() => {
  const unsubscribe = setupNotifications();
  return () => unsubscribe(); // Always cleanup
}, []);
```

### 4. Chỉ show notification khi cần
```javascript
// Foreground: Show in-app notification hoặc local notification
// Background: Firebase tự động show, không cần handle

messaging().onMessage(async remoteMessage => {
  if (AppState.currentState === 'active') {
    // App đang mở → Show in-app notification
    showInAppNotification(remoteMessage);
  }
  // Nếu app ở background, Firebase đã tự show rồi
});
```

---

## Testing

### 1. Test với 1 device
```bash
# Gửi test notification từ Firebase Console
# Kiểm tra xem có bao nhiêu notification xuất hiện
```

### 2. Check logs
```javascript
// Thêm logs để track
console.log('📱 [NOTIF] Listener registered');
console.log('📬 [NOTIF] Message received:', id);
console.log('✅ [NOTIF] Showing notification:', id);
console.log('⚠️ [NOTIF] Duplicate detected:', id);
```

### 3. Test cleanup
```javascript
// Unmount và remount component nhiều lần
// Đảm bảo không có memory leak
```

---

## Tóm tắt

✅ **Backend đã đúng** - Chỉ gửi 1 notification
❌ **Frontend đang sai** - Xử lý 2 lần

**Fix:**
1. Thêm duplicate check bằng `notification_id`
2. Cleanup listeners đúng cách
3. Chỉ show notification khi cần (foreground)
4. Sử dụng notification `tag` để prevent duplicate

**Backend đã thêm:**
- `notification_id`: UUID unique
- `timestamp`: Timestamp để check duplicate

**Frontend cần làm:**
- Implement duplicate check
- Cleanup listeners
- Test kỹ trên cả foreground và background
