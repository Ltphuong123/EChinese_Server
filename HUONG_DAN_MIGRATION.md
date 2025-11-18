# 🔄 Hướng Dẫn Migration Hệ Thống Thông Báo

## 📋 Tổng Quan

Migration này cập nhật hệ thống thông báo từ format cũ sang format mới:
- ❌ Bỏ `related_type`, `related_id`, `redirect_url`
- ✅ Thêm `redirect_type`
- ✅ Gộp tất cả data vào field `data`

---

## 🚀 Các Bước Thực Hiện

### Bước 1: Backup Database

```bash
# Backup toàn bộ database
pg_dump -U postgres -d echinese_db > backup_before_migration_$(date +%Y%m%d).sql

# Hoặc chỉ backup bảng Notifications
pg_dump -U postgres -d echinese_db -t Notifications > backup_notifications_$(date +%Y%m%d).sql
```

---

### Bước 2: Chạy Migration SQL

```bash
# Kết nối vào database
psql -U postgres -d echinese_db

# Chạy migration script
\i migrations/20250118_update_notifications_schema.sql
```

**Hoặc dùng Node.js:**

```javascript
const db = require('./config/db');
const fs = require('fs');

async function runMigration() {
  const sql = fs.readFileSync('./migrations/20250118_update_notifications_schema.sql', 'utf8');
  await db.query(sql);
  console.log('✅ Migration completed!');
}

runMigration();
```

---

### Bước 3: Verify Migration

Kiểm tra kết quả migration:

```sql
-- Kiểm tra column mới đã được tạo
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Notifications' 
  AND column_name = 'redirect_type';

-- Kiểm tra phân bố redirect_type
SELECT 
  redirect_type,
  COUNT(*) as count
FROM "Notifications"
GROUP BY redirect_type
ORDER BY count DESC;

-- Kiểm tra các notifications chưa migrate (nếu có)
SELECT 
  id, 
  type, 
  title, 
  redirect_url,
  redirect_type,
  data
FROM "Notifications"
WHERE redirect_type IS NULL
LIMIT 10;

-- Kiểm tra data đã được gộp đúng chưa
SELECT 
  id,
  type,
  redirect_type,
  data
FROM "Notifications"
WHERE redirect_type IN ('post', 'post_comment')
LIMIT 5;
```

---

### Bước 4: Test API

#### Test 1: Gửi thông báo mới

```bash
curl -X POST http://localhost:5000/api/send-notification \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "🎉 Test thông báo mới",
    "message": "Đây là test thông báo với format mới",
    "redirect_type": "post",
    "data": {
      "post_id": "123",
      "test_field": "test_value"
    },
    "priority": 2
  }'
```

#### Test 2: Lấy danh sách thông báo

```bash
curl -X GET "http://localhost:5000/api/notifications?page=1&limit=10" \
  -H "Authorization: Bearer USER_TOKEN"
```

Kiểm tra response có chứa `redirect_type` và `data` đầy đủ.

---

### Bước 5: Test Chức Năng Tự Động

#### Test Like Bài Viết

```bash
# Like một bài viết
curl -X POST http://localhost:5000/api/posts/POST_ID/like \
  -H "Authorization: Bearer USER_TOKEN"

# Kiểm tra thông báo được tạo
SELECT * FROM "Notifications" 
WHERE type = 'community' 
ORDER BY created_at DESC 
LIMIT 1;
```

Verify:
- ✅ `redirect_type` = 'post'
- ✅ `data` chứa `post_id`, `liker_id`, `liker_name`, `liker_avatar`
- ✅ `title` có emoji ❤️

#### Test Comment Bài Viết

```bash
# Comment một bài viết
curl -X POST http://localhost:5000/api/posts/POST_ID/comments \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test comment"
  }'

# Kiểm tra thông báo
SELECT * FROM "Notifications" 
WHERE type = 'community' 
  AND redirect_type = 'post_comment'
ORDER BY created_at DESC 
LIMIT 1;
```

Verify:
- ✅ `redirect_type` = 'post_comment'
- ✅ `data` chứa `post_id`, `comment_id`, `commenter_id`, `commenter_name`, `comment_preview`
- ✅ `title` có emoji 💬

---

### Bước 6: Cleanup (Sau Khi Đã Test Kỹ)

Sau khi đã test và chắc chắn mọi thứ hoạt động tốt (ít nhất 1-2 tuần), có thể xóa các column cũ:

```sql
-- ⚠️ CHỈ CHẠY SAU KHI ĐÃ TEST KỸ!

-- Xóa các column không dùng nữa
ALTER TABLE "Notifications" DROP COLUMN IF EXISTS related_type;
ALTER TABLE "Notifications" DROP COLUMN IF EXISTS related_id;
ALTER TABLE "Notifications" DROP COLUMN IF EXISTS redirect_url;
```

---

## 🔍 Troubleshooting

### Vấn đề 1: Migration thất bại

**Triệu chứng:** SQL script báo lỗi

**Giải pháp:**
```sql
-- Rollback migration
\i migrations/20250118_update_notifications_schema.sql
-- Uncomment phần ROLLBACK SCRIPT và chạy lại
```

### Vấn đề 2: Một số notifications không có redirect_type

**Triệu chứng:** Query trả về notifications với `redirect_type = NULL`

**Giải pháp:**
```sql
-- Set default cho các notifications chưa có redirect_type
UPDATE "Notifications"
SET redirect_type = 'none'
WHERE redirect_type IS NULL;
```

### Vấn đề 3: Data không đúng format

**Triệu chứng:** Field trong `data` không phải string

**Giải pháp:**
```sql
-- Kiểm tra data types
SELECT 
  id,
  data,
  jsonb_typeof(data->'post_id') as post_id_type
FROM "Notifications"
WHERE redirect_type = 'post'
LIMIT 5;

-- Nếu cần convert, chạy:
UPDATE "Notifications"
SET data = jsonb_set(
  data,
  '{post_id}',
  to_jsonb(data->>'post_id')
)
WHERE redirect_type = 'post';
```

### Vấn đề 4: Push notification không hoạt động

**Triệu chứng:** Thông báo được tạo nhưng không nhận được push

**Giải pháp:**
1. Kiểm tra log backend:
```bash
# Xem log
tail -f logs/app.log | grep "Push notification"
```

2. Kiểm tra FCM service:
```javascript
// Test FCM
const fcmService = require('./services/fcmService');
fcmService.sendToUser('user-id', {
  title: 'Test',
  body: 'Test message',
  data: { test: 'true' }
});
```

3. Kiểm tra format data:
```javascript
// Trong notificationService.js
console.log('📤 Sending push with data:', payload.data);
```

---

## 📊 Checklist Migration

### Pre-Migration:
- [ ] Backup database
- [ ] Review migration script
- [ ] Test trên môi trường dev/staging trước

### Migration:
- [ ] Chạy migration SQL
- [ ] Verify schema changes
- [ ] Verify data migration
- [ ] Check indexes

### Post-Migration:
- [ ] Test API endpoints
- [ ] Test tạo thông báo mới
- [ ] Test like/comment tự động
- [ ] Test push notifications
- [ ] Monitor logs trong 24h đầu

### Cleanup (Sau 1-2 tuần):
- [ ] Xóa các column cũ (related_type, related_id, redirect_url)
- [ ] Update documentation
- [ ] Thông báo cho team frontend

---

## 📝 Notes

### Backward Compatibility

Migration này **backward compatible** trong giai đoạn chuyển đổi:
- Các column cũ vẫn tồn tại (chỉ được đánh dấu DEPRECATED)
- Frontend cũ vẫn có thể đọc `redirect_url` nếu cần
- Có thể rollback dễ dàng nếu gặp vấn đề

### Frontend Changes Required

Frontend cần cập nhật để sử dụng format mới:

**Cũ:**
```javascript
const redirectUrl = notification.redirect_url;
// Parse URL phức tạp...
```

**Mới:**
```javascript
const { redirect_type, data } = notification;

switch (redirect_type) {
  case 'post':
    navigate(`/posts/${data.post_id}`);
    break;
  case 'post_comment':
    navigate(`/posts/${data.post_id}`, {
      state: { scrollToComment: data.comment_id }
    });
    break;
  // ...
}
```

---

## 🎯 Expected Results

Sau khi migration thành công:

1. **Database:**
   - ✅ Column `redirect_type` đã được tạo
   - ✅ Tất cả notifications có `redirect_type` hợp lệ
   - ✅ Data đã được gộp đầy đủ

2. **API:**
   - ✅ Tạo thông báo mới với format mới
   - ✅ Response chứa `redirect_type` và `data`
   - ✅ Push notification hoạt động bình thường

3. **Chức năng tự động:**
   - ✅ Like bài viết tạo thông báo đúng format
   - ✅ Comment bài viết tạo thông báo đúng format
   - ✅ Moderation tạo thông báo đúng format

---

**Migration hoàn tất! 🚀**
