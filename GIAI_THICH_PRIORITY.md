# 🎯 Priority - Độ Ưu Tiên Thông Báo

## 📊 Priority Là Gì?

**Priority (độ ưu tiên)** là số từ 1-3 xác định mức độ quan trọng của thông báo.

```
1 = Bình thường (Normal)
2 = Quan trọng (Important)  
3 = Rất quan trọng (Urgent)
```

---

## 🎯 Priority Dùng Để Làm Gì?

### 1. **Sắp Xếp Thông Báo**

Thông báo có priority cao hiển thị trước:

```sql
SELECT * FROM "Notifications"
WHERE recipient_id = 'user-123'
ORDER BY 
  priority DESC,        -- Priority cao lên đầu
  created_at DESC       -- Mới nhất lên đầu
LIMIT 20;
```

**Kết quả:**
```
Priority 3: ⚠️ Bạn đã bị cấm bình luận
Priority 3: 🚫 Nội dung bị gỡ
Priority 2: 🎉 Chào mừng bạn!
Priority 2: ✅ Bài viết được duyệt
Priority 1: ❤️ Ai đó thích bài viết
Priority 1: 💬 Bình luận mới
```

---

### 2. **Hiển Thị Khác Biệt Trên UI**

Frontend có thể hiển thị khác nhau dựa vào priority:

```javascript
// React Native
function NotificationItem({ notification }) {
  const { priority, title, content } = notification;
  
  // Style dựa vào priority
  const styles = {
    1: { 
      backgroundColor: '#f5f5f5',  // Xám nhạt
      icon: '📬',
      borderColor: '#ddd'
    },
    2: { 
      backgroundColor: '#fff3cd',  // Vàng nhạt
      icon: '⭐',
      borderColor: '#ffc107'
    },
    3: { 
      backgroundColor: '#f8d7da',  // Đỏ nhạt
      icon: '🚨',
      borderColor: '#dc3545'
    }
  };
  
  const style = styles[priority] || styles[1];
  
  return (
    <View style={{ 
      backgroundColor: style.backgroundColor,
      borderLeftWidth: 4,
      borderLeftColor: style.borderColor
    }}>
      <Text>{style.icon} {title}</Text>
      <Text>{content.message}</Text>
    </View>
  );
}
```

**Hiển thị:**
```
🚨 [Đỏ] ⚠️ Bạn đã bị cấm bình luận
⭐ [Vàng] 🎉 Chào mừng bạn!
📬 [Xám] ❤️ Ai đó thích bài viết
```

---

### 3. **Âm Thanh Khác Nhau**

```javascript
// React Native
function playNotificationSound(priority) {
  const sounds = {
    1: 'notification_normal.mp3',    // Âm thanh nhẹ
    2: 'notification_important.mp3', // Âm thanh rõ hơn
    3: 'notification_urgent.mp3'     // Âm thanh mạnh
  };
  
  const sound = sounds[priority] || sounds[1];
  playSound(sound);
}
```

---

### 4. **Badge/Icon Khác Nhau**

```javascript
// Web
function getBadgeStyle(priority) {
  switch(priority) {
    case 3:
      return 'badge-danger';   // Đỏ
    case 2:
      return 'badge-warning';  // Vàng
    case 1:
    default:
      return 'badge-info';     // Xanh
  }
}
```

---

### 5. **Push Notification Priority**

Firebase FCM sử dụng priority để quyết định cách gửi:

```javascript
// services/fcmService.js
buildMessage: (tokens, payload) => {
  const { priority } = payload;
  
  return {
    tokens,
    notification: { title, body },
    data: stringData,
    android: {
      priority: priority >= 3 ? 'high' : 'normal',  // High cho urgent
      notification: {
        sound: priority >= 3 ? 'urgent' : 'default',
        priority: priority >= 3 ? 'max' : 'default'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: priority >= 3 ? 'urgent.caf' : 'default',
          badge: priority >= 2 ? 1 : 0,
          contentAvailable: priority >= 2
        }
      }
    }
  };
}
```

**Kết quả:**
- Priority 3 → FCM priority "high" → Gửi ngay lập tức, bỏ qua battery optimization
- Priority 1-2 → FCM priority "normal" → Gửi khi thiết bị sẵn sàng

---

### 6. **Filter/Group Thông Báo**

User có thể filter theo priority:

```javascript
// Frontend
function NotificationList() {
  const [filter, setFilter] = useState('all');
  
  const fetchNotifications = async () => {
    const params = {
      page: 1,
      limit: 20
    };
    
    // Filter theo priority
    if (filter === 'urgent') {
      params.min_priority = 3;
    } else if (filter === 'important') {
      params.min_priority = 2;
    }
    
    const response = await fetch('/api/notifications?' + new URLSearchParams(params));
    // ...
  };
  
  return (
    <View>
      <Tabs>
        <Tab onClick={() => setFilter('all')}>Tất cả</Tab>
        <Tab onClick={() => setFilter('important')}>Quan trọng</Tab>
        <Tab onClick={() => setFilter('urgent')}>Khẩn cấp</Tab>
      </Tabs>
      {/* List notifications */}
    </View>
  );
}
```

---

### 7. **Auto-Read Dựa Vào Priority**

```javascript
// Tự động đánh dấu đã đọc các notification priority thấp sau 7 ngày
async function autoMarkOldNotificationsAsRead() {
  await db.query(`
    UPDATE "Notifications"
    SET read_at = NOW()
    WHERE 
      priority = 1 
      AND read_at IS NULL
      AND created_at < NOW() - INTERVAL '7 days'
  `);
}
```

---

## 📋 Quy Tắc Sử Dụng Priority

### Priority 1 - Bình Thường (Normal)

**Dùng cho:**
- ✅ Like bài viết
- ✅ Comment bình thường
- ✅ Reply comment
- ✅ Nhắc nhở học tập hàng ngày

**Đặc điểm:**
- Không gấp
- Có thể đọc sau
- Không cần âm thanh to
- Hiển thị bình thường

**Ví dụ:**
```json
{
  "type": "community_post_like",
  "title": "❤️ Ai đó thích bài viết",
  "priority": 1
}
```

---

### Priority 2 - Quan Trọng (Important)

**Dùng cho:**
- ✅ Chào mừng user mới
- ✅ Bài viết được duyệt
- ✅ Đạt thành tích
- ✅ Kết quả bài thi
- ✅ Cập nhật tính năng
- ✅ Được mention
- ✅ Gói premium sắp hết hạn

**Đặc điểm:**
- Quan trọng, nên đọc sớm
- Cần chú ý
- Âm thanh rõ ràng
- Hiển thị nổi bật (vàng)

**Ví dụ:**
```json
{
  "type": "system_achievement",
  "title": "🏆 Bạn đạt HSK 3",
  "priority": 2
}
```

---

### Priority 3 - Rất Quan Trọng (Urgent)

**Dùng cho:**
- ✅ Bảo trì hệ thống
- ✅ Cấm bình luận
- ✅ Nội dung bị gỡ
- ✅ Tài khoản bị khóa
- ✅ Cảnh báo bảo mật

**Đặc điểm:**
- Rất quan trọng, phải đọc ngay
- Ảnh hưởng đến tài khoản
- Âm thanh mạnh
- Hiển thị nổi bật (đỏ)
- Gửi ngay lập tức

**Ví dụ:**
```json
{
  "type": "moderation_comment_ban",
  "title": "⚠️ Bạn bị cấm bình luận",
  "priority": 3
}
```

---

## 🎨 UI Examples

### Mobile (React Native):

```javascript
function NotificationCard({ notification }) {
  const { priority, title, content } = notification;
  
  // Colors
  const colors = {
    1: { bg: '#f8f9fa', border: '#dee2e6', icon: '📬' },
    2: { bg: '#fff3cd', border: '#ffc107', icon: '⭐' },
    3: { bg: '#f8d7da', border: '#dc3545', icon: '🚨' }
  };
  
  const color = colors[priority];
  
  return (
    <TouchableOpacity 
      style={{
        backgroundColor: color.bg,
        borderLeftWidth: 4,
        borderLeftColor: color.border,
        padding: 16,
        marginBottom: 8,
        borderRadius: 8
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 24, marginRight: 8 }}>
          {color.icon}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={{ 
            fontWeight: priority >= 2 ? 'bold' : 'normal',
            fontSize: priority >= 3 ? 16 : 14
          }}>
            {title}
          </Text>
          <Text style={{ color: '#666', marginTop: 4 }}>
            {content.message}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
```

**Hiển thị:**
```
┌─────────────────────────────────────┐
│ 🚨 ⚠️ Bạn đã bị cấm bình luận      │ ← Đỏ, chữ to
│    Bạn bị cấm 24 giờ...            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ⭐ 🏆 Bạn đạt HSK 3                 │ ← Vàng, chữ đậm
│    Chúc mừng bạn...                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📬 ❤️ Ai đó thích bài viết          │ ← Xám, chữ bình thường
│    John Doe đã thích...            │
└─────────────────────────────────────┘
```

---

## 📊 Thống Kê Priority

```sql
-- Đếm số thông báo theo priority
SELECT 
  priority,
  COUNT(*) as total,
  COUNT(CASE WHEN read_at IS NULL THEN 1 END) as unread
FROM "Notifications"
WHERE recipient_id = 'user-123'
GROUP BY priority
ORDER BY priority DESC;
```

**Kết quả:**
```
Priority | Total | Unread
---------|-------|-------
   3     |   2   |   1     ← Urgent
   2     |  15   |   5     ← Important
   1     |  83   |  12     ← Normal
```

---

## 🎯 Best Practices

### ✅ Nên:

1. **Dùng đúng priority**
```javascript
// Like/comment → Priority 1
{ type: 'community_post_like', priority: 1 }

// Thành tích → Priority 2
{ type: 'system_achievement', priority: 2 }

// Cấm/khóa → Priority 3
{ type: 'moderation_comment_ban', priority: 3 }
```

2. **Không lạm dụng priority 3**
```javascript
// ❌ Sai - Like không phải urgent
{ type: 'community_post_like', priority: 3 }

// ✅ Đúng
{ type: 'community_post_like', priority: 1 }
```

3. **Sắp xếp theo priority**
```sql
ORDER BY priority DESC, created_at DESC
```

---

### ❌ Không Nên:

1. **Tất cả đều priority 3**
```javascript
// ❌ Sai - Mọi thứ đều urgent = Không gì urgent
{ priority: 3 }
{ priority: 3 }
{ priority: 3 }
```

2. **Không có priority**
```javascript
// ❌ Sai - Nên có priority mặc định
{ title: "...", content: "..." }

// ✅ Đúng
{ title: "...", content: "...", priority: 1 }
```

---

## 🎯 Tóm Tắt

**Priority dùng để:**
1. ✅ Sắp xếp thông báo (cao lên đầu)
2. ✅ Hiển thị khác biệt (màu sắc, icon)
3. ✅ Âm thanh khác nhau
4. ✅ FCM priority (gửi nhanh/chậm)
5. ✅ Filter/group thông báo
6. ✅ Auto-read thông báo cũ

**Quy tắc:**
- Priority 1: Bình thường (like, comment)
- Priority 2: Quan trọng (thành tích, duyệt bài)
- Priority 3: Rất quan trọng (cấm, bảo trì)

**Hiển thị:**
```
Priority 3 → 🚨 Đỏ, chữ to, âm thanh mạnh
Priority 2 → ⭐ Vàng, chữ đậm, âm thanh rõ
Priority 1 → 📬 Xám, chữ bình thường, âm thanh nhẹ
```

---

**Đơn giản là: Priority càng cao = Càng quan trọng = Hiển thị càng nổi bật! 🎯**
