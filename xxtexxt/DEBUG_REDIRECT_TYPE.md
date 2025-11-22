# 🔍 Debug: redirect_type Trả Về 'none'

## Vấn Đề

API trả về `redirect_type: "none"` thay vì giá trị đúng như `"post"`, `"achievement"`, etc.

## Nguyên Nhân Có Thể

1. ❌ Migration chưa chạy
2. ❌ Column `redirect_type` chưa tồn tại trong database
3. ❌ Code chưa lưu `redirect_type` vào database
4. ❌ Default value trong code là 'none'

---

## Bước 1: Kiểm Tra Database Schema

```bash
# Kết nối vào database
psql -U postgres -d echinese_db

# Kiểm tra column redirect_type
\d "Notifications"
```

**Kết quả mong đợi:**
```
Column        | Type          | Nullable
--------------+---------------+----------
redirect_type | varchar(50)   | YES
```

Nếu **KHÔNG** thấy column `redirect_type`, chạy migration:

```bash
psql -U postgres -d echinese_db < migrations/20250118_update_notifications_schema.sql
```

---

## Bước 2: Kiểm Tra Dữ Liệu Hiện Tại

```sql
-- Xem phân bố redirect_type
SELECT 
  redirect_type,
  COUNT(*) as count
FROM "Notifications"
GROUP BY redirect_type
ORDER BY count DESC;
```

**Kết quả có thể:**
- Nếu tất cả là `NULL` → Migration chưa chạy hoặc chưa migrate data
- Nếu tất cả là `none` → Migration đã chạy nhưng data cũ được set thành 'none'
- Nếu có nhiều loại → Migration thành công

---

## Bước 3: Test Tạo Notification Mới

### Option A: Dùng Node.js Script

```bash
# Chạy test script
node test-notification-quick.js
```

Script này sẽ:
1. Tạo 3 notifications với redirect_type khác nhau
2. In ra kết quả
3. Verify redirect_type đã được lưu đúng

### Option B: Dùng API

```bash
curl -X POST http://localhost:5000/api/send-notification \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "🧪 Test redirect_type",
    "message": "Testing redirect_type field",
    "redirect_type": "achievement",
    "data": {
      "achievement_id": "test-123",
      "test_field": "test_value"
    },
    "priority": 2
  }'
```

**Kiểm tra response:**
```json
{
  "success": true,
  "data": {
    "notification_id": "...",
    "redirect_type": "achievement"  // ← Phải là "achievement", không phải "none"
  }
}
```

---

## Bước 4: Kiểm Tra Trong Database

```sql
-- Xem notification vừa tạo
SELECT 
  id,
  type,
  title,
  redirect_type,
  data,
  created_at
FROM "Notifications"
ORDER BY created_at DESC
LIMIT 1;
```

**Kết quả mong đợi:**
```
redirect_type | achievement
data          | {"achievement_id": "test-123", "test_field": "test_value"}
```

---

## Bước 5: Kiểm Tra Code

### Kiểm tra Model (notificationModel.js)

```javascript
// Phải có redirect_type trong INSERT
INSERT INTO "Notifications" (
  recipient_id, audience, type, title, content, redirect_type,
  data, expires_at, priority, from_system
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
```

### Kiểm tra Controller (simpleNotificationController.js)

```javascript
// Phải truyền redirect_type vào payload
const notification = await notificationService.createNotification({
  recipient_id: user_id,
  audience: 'user',
  type: 'system',
  title: title.trim(),
  content: { message: message.trim() },
  redirect_type: redirect_type,  // ← Phải có dòng này
  data: data,
  priority: Math.min(Math.max(priority, 1), 3),
  from_system: true
});
```

### Kiểm tra Response (notificationController.js)

```javascript
// Response phải trả redirect_type
data: result.data.map(notification => ({
  id: notification.id,
  type: notification.type,
  title: notification.title,
  content: notification.content,
  redirect_type: notification.redirect_type || 'none',  // ← Phải có dòng này
  data: notification.data || {},
  // ...
}))
```

---

## Bước 6: Fix Nếu Vẫn Lỗi

### Fix 1: Chạy lại Migration

```bash
# Rollback (nếu cần)
psql -U postgres -d echinese_db -c "ALTER TABLE \"Notifications\" DROP COLUMN IF EXISTS redirect_type;"

# Chạy lại migration
psql -U postgres -d echinese_db < migrations/20250118_update_notifications_schema.sql
```

### Fix 2: Set Default Value

```sql
-- Set default cho notifications cũ
UPDATE "Notifications"
SET redirect_type = 'none'
WHERE redirect_type IS NULL;

-- Set NOT NULL constraint (optional)
ALTER TABLE "Notifications" 
ALTER COLUMN redirect_type SET DEFAULT 'none';
```

### Fix 3: Restart Server

```bash
# Restart để load code mới
pm2 restart echinese-api

# Hoặc
npm run dev
```

---

## Bước 7: Verify Hoàn Toàn

### Test 1: Tạo notification mới

```bash
curl -X POST http://localhost:5000/api/send-notification \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "✅ Final Test",
    "message": "Testing after fix",
    "redirect_type": "post",
    "data": {
      "post_id": "123"
    },
    "priority": 2
  }'
```

### Test 2: Lấy danh sách notifications

```bash
curl -X GET "http://localhost:5000/api/notifications?page=1&limit=5" \
  -H "Authorization: Bearer USER_TOKEN"
```

**Verify response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "redirect_type": "post",  // ← Phải có giá trị đúng
      "data": {
        "post_id": "123"
      }
    }
  ]
}
```

### Test 3: Kiểm tra trong database

```sql
-- Xem 10 notifications mới nhất
SELECT 
  id,
  type,
  title,
  redirect_type,
  jsonb_pretty(data) as data,
  created_at
FROM "Notifications"
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ Checklist

- [ ] Column `redirect_type` đã tồn tại trong database
- [ ] Migration đã chạy thành công
- [ ] Code đã được cập nhật (model, service, controller)
- [ ] Server đã restart
- [ ] Test tạo notification mới → redirect_type đúng
- [ ] Test lấy danh sách → redirect_type hiển thị đúng
- [ ] Database có dữ liệu redirect_type đúng

---

## 🆘 Nếu Vẫn Không Được

### Debug Log

Thêm log vào code để debug:

```javascript
// Trong notificationModel.js - create()
console.log('📝 Creating notification with payload:', {
  redirect_type: data.redirect_type,
  data: data.data
});

const result = await db.query(queryText, values);
console.log('✅ Created notification:', result.rows[0]);
```

```javascript
// Trong notificationController.js - getNotifications()
console.log('📤 Returning notification:', {
  id: notification.id,
  redirect_type: notification.redirect_type,
  data: notification.data
});
```

### Check Database Connection

```javascript
// Test query
const db = require('./config/db');

db.query('SELECT * FROM "Notifications" ORDER BY created_at DESC LIMIT 1')
  .then(result => {
    console.log('Latest notification:', result.rows[0]);
  });
```

---

## 📞 Contact

Nếu vẫn gặp vấn đề, cung cấp:
1. Output của `\d "Notifications"`
2. Output của query `SELECT redirect_type, COUNT(*) FROM "Notifications" GROUP BY redirect_type`
3. Response của API test
4. Server logs

---

**Good luck! 🚀**
