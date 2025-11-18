# 🔗 Redirect URL - Giải Thích Chi Tiết

## 🎯 Redirect URL Dùng Để Làm Gì?

**`redirect_url` dùng để điều hướng user đến màn hình cụ thể khi click vào notification.**

---

## 📱 Cách Hoạt Động

### Luồng Hoạt Động:

```
1. Backend gửi notification với redirect_url
         ↓
2. User nhận notification trên điện thoại/web
         ↓
3. User CLICK vào notification
         ↓
4. App đọc redirect_url từ notification data
         ↓
5. App navigate đến màn hình tương ứng
```

---

## 🔍 Ví Dụ Cụ Thể

### Ví Dụ 1: Notification "Ai đó thích bài viết"

**Backend gửi:**
```json
{
  "title": "Ai đó đã thích bài viết của bạn",
  "content": { "message": "John Doe đã thích bài viết..." },
  "redirect_url": "app://post/123"
}
```

**User click notification:**
```
App nhận: redirect_url = "app://post/123"
         ↓
App parse: type = "post", id = "123"
         ↓
App navigate: navigation.navigate('PostDetail', { postId: '123' })
         ↓
User thấy: Màn hình chi tiết bài viết #123
```

---

### Ví Dụ 2: Notification "Bình luận mới"

**Backend gửi:**
```json
{
  "title": "Bình luận mới",
  "content": { "message": "Jane đã bình luận..." },
  "redirect_url": "app://post/123#comment-456"
}
```

**User click notification:**
```
App nhận: redirect_url = "app://post/123#comment-456"
         ↓
App parse: type = "post", id = "123", commentId = "456"
         ↓
App navigate: navigation.navigate('PostDetail', { 
  postId: '123',
  scrollToComment: '456'
})
         ↓
User thấy: Bài viết #123 và scroll đến comment #456
```

---

### Ví Dụ 3: Notification "Cập nhật HSK 3.0"

**Backend gửi:**
```json
{
  "title": "Tính năng mới: HSK 3.0",
  "content": { "message": "Bộ từ vựng HSK 3.0..." },
  "redirect_url": "app://vocab/hsk3"
}
```

**User click notification:**
```
App nhận: redirect_url = "app://vocab/hsk3"
         ↓
App parse: type = "vocab", category = "hsk3"
         ↓
App navigate: navigation.navigate('Vocabulary', { 
  category: 'hsk3'
})
         ↓
User thấy: Màn hình từ vựng HSK 3.0
```

---

## 📝 Format Redirect URL

### Format Chuẩn:
```
app://[screen]/[id]#[anchor]
```

### Các Phần:

| Phần | Mô Tả | Ví Dụ |
|------|-------|-------|
| `app://` | Protocol (bắt buộc) | `app://` |
| `[screen]` | Tên màn hình | `post`, `comment`, `vocab`, `home` |
| `[id]` | ID của item (optional) | `123`, `abc-def` |
| `#[anchor]` | Vị trí cụ thể (optional) | `#comment-456` |

---

## 🎨 Các Ví Dụ Redirect URL

### 1. Màn Hình Chính
```
app://home
```
→ Navigate đến Home screen

### 2. Chi Tiết Bài Viết
```
app://post/123
```
→ Navigate đến PostDetail với postId = 123

### 3. Bài Viết + Comment Cụ Thể
```
app://post/123#comment-456
```
→ Navigate đến PostDetail và scroll đến comment 456

### 4. Danh Sách Thông Báo
```
app://notifications
```
→ Navigate đến Notifications screen

### 5. Từ Vựng HSK
```
app://vocab/hsk3
```
→ Navigate đến Vocabulary với category HSK3

### 6. Bài Học
```
app://lesson/101
```
→ Navigate đến Lesson với lessonId = 101

### 7. Profile User
```
app://profile/user-id-123
```
→ Navigate đến Profile của user

### 8. Quy Định Cộng Đồng
```
app://community-rules
```
→ Navigate đến Community Rules screen

### 9. Thành Tích
```
app://achievements
```
→ Navigate đến Achievements screen

### 10. Bảo Trì
```
app://maintenance
```
→ Navigate đến Maintenance info screen

---

## 💻 Code Frontend Xử Lý

### React Native:

```javascript
// App.js hoặc navigation handler
import { useNavigation } from '@react-navigation/native';

function handleNotificationClick(notification) {
  const { redirect_url } = notification.data;
  
  if (!redirect_url) return;
  
  // Parse URL
  const url = redirect_url.replace('app://', '');
  const [path, anchor] = url.split('#');
  const [screen, ...params] = path.split('/');
  
  // Navigate based on screen
  switch(screen) {
    case 'home':
      navigation.navigate('Home');
      break;
      
    case 'post':
      const postId = params[0];
      const commentId = anchor?.replace('comment-', '');
      navigation.navigate('PostDetail', { 
        postId,
        scrollToComment: commentId 
      });
      break;
      
    case 'vocab':
      const category = params[0];
      navigation.navigate('Vocabulary', { category });
      break;
      
    case 'notifications':
      navigation.navigate('Notifications');
      break;
      
    case 'profile':
      const userId = params[0];
      navigation.navigate('Profile', { userId });
      break;
      
    default:
      navigation.navigate('Home');
  }
}

// Sử dụng
messaging().onNotificationOpenedApp((remoteMessage) => {
  handleNotificationClick(remoteMessage);
});
```

---

### React Web:

```javascript
// App.js
import { useNavigate } from 'react-router-dom';

function handleNotificationClick(payload) {
  const { redirect_url } = payload.data;
  
  if (!redirect_url) return;
  
  // Parse URL: app://post/123 → /post/123
  const path = redirect_url.replace('app:/', '');
  
  // Navigate
  navigate(path);
}

// Sử dụng
onMessage(messaging, (payload) => {
  // Khi user click notification
  handleNotificationClick(payload);
});
```

---

## 🎯 Best Practices

### ✅ Nên:

1. **Luôn có redirect_url**
```json
{
  "redirect_url": "app://home"  // Ít nhất là home
}
```

2. **Dùng format chuẩn**
```
app://[screen]/[id]
```

3. **Có fallback**
```javascript
const screen = redirect_url || 'app://home';
```

4. **Test trước khi deploy**
```javascript
console.log('Redirect to:', redirect_url);
```

---

### ❌ Không Nên:

1. **Dùng HTTP URL**
```json
{
  "redirect_url": "https://app.com/post/123"  // ❌ Sai
}
```

2. **Dùng web path**
```json
{
  "redirect_url": "/post/123"  // ❌ Sai
}
```

3. **Để trống**
```json
{
  "redirect_url": ""  // ❌ Nên dùng null hoặc "app://home"
}
```

4. **Dùng ký tự đặc biệt**
```json
{
  "redirect_url": "app://post/123?id=456&name=test"  // ❌ Phức tạp
}
```

---

## 🧪 Test Redirect URL

### Test 1: Gửi notification với redirect_url

```bash
curl -X POST http://localhost:5000/api/send-notification \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "USER_ID",
    "title": "Test Redirect",
    "message": "Click để test redirect",
    "url": "app://post/123"
  }'
```

### Test 2: Kiểm tra data nhận được

```javascript
// Console
messaging().onNotificationOpenedApp((remoteMessage) => {
  console.log('Redirect URL:', remoteMessage.data.redirect_url);
  // Output: app://post/123
});
```

### Test 3: Test navigation

```javascript
// Thêm log để debug
function handleNotificationClick(notification) {
  const { redirect_url } = notification.data;
  console.log('1. Received URL:', redirect_url);
  
  const path = redirect_url.replace('app://', '');
  console.log('2. Parsed path:', path);
  
  const [screen, id] = path.split('/');
  console.log('3. Screen:', screen, 'ID:', id);
  
  // Navigate...
}
```

---

## 📊 Mapping Redirect URL → Screen

| Redirect URL | Screen Name | Params |
|--------------|-------------|--------|
| `app://home` | Home | - |
| `app://post/123` | PostDetail | `{ postId: '123' }` |
| `app://notifications` | Notifications | - |
| `app://vocab/hsk3` | Vocabulary | `{ category: 'hsk3' }` |
| `app://profile/user-123` | Profile | `{ userId: 'user-123' }` |
| `app://lesson/101` | Lesson | `{ lessonId: '101' }` |

---

## 🎯 Tóm Tắt

**`redirect_url` là URL để điều hướng user đến màn hình cụ thể khi click notification.**

**Format:**
```
app://[screen]/[id]#[anchor]
```

**Ví dụ:**
```
app://post/123           → Bài viết #123
app://post/123#comment-456  → Bài viết #123, comment #456
app://vocab/hsk3         → Từ vựng HSK3
app://home               → Màn hình chính
```

**Xử lý:**
```javascript
// Parse URL
const path = redirect_url.replace('app://', '');
const [screen, id] = path.split('/');

// Navigate
navigation.navigate(screen, { id });
```

---

**Đơn giản vậy thôi! 🚀**
