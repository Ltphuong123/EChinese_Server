# Hướng dẫn Quản lý Hệ thống Điểm Cộng Đồng (Admin Guide)

## 🎯 Mục đích

Tài liệu này hướng dẫn admin cách triển khai và quản lý hệ thống điểm cộng đồng mới.

---

## 📋 Bước 1: Chạy Migration

### 1.1. Kết nối Database

```bash
# Sử dụng psql hoặc tool quản lý database
psql -U your_username -d your_database_name
```

### 1.2. Chạy Migration SQL

```bash
# Chạy file migration
\i config/migrations/add_community_achievements.sql
```

Hoặc copy nội dung file và paste vào SQL editor.

### 1.3. Kiểm tra kết quả

```sql
-- Xem tất cả achievements mới
SELECT name, description, points, icon
FROM "Achievements"
WHERE criteria->>'type' IN ('post_created', 'comment_created', 'post_likes_received')
ORDER BY points;
```

Kết quả mong đợi: **12 achievements mới**

---

## 🔧 Bước 2: Cấu hình Điểm số (Tùy chọn)

Nếu muốn thay đổi điểm thưởng, chỉnh sửa file:

**File:** `config/communityPoints.js`

```javascript
const COMMUNITY_POINTS = {
  POST_CREATED: 5,        // Thay đổi số này
  COMMENT_CREATED: 2,     // Thay đổi số này
  POST_LIKED: 1,          // Thay đổi số này
  POST_REMOVED: -5,       // Thay đổi số này (số âm)
  COMMENT_REMOVED: -2,    // Thay đổi số này (số âm)
};
```

**Lưu ý:** Sau khi thay đổi, cần restart server.

---

## 🚀 Bước 3: Restart Server

```bash
# Dừng server hiện tại
# Ctrl + C hoặc kill process

# Khởi động lại
npm start
# hoặc
node app.js
```

---

## 📊 Bước 4: Kiểm tra Hoạt động

### 4.1. Test Tạo Bài viết

```bash
# API: POST /api/posts
# Body:
{
  "title": "Test post",
  "content": "Test content",
  "topic": "general"
}

# Kiểm tra:
# 1. Post được tạo thành công
# 2. User nhận +5 điểm
# 3. Console log: "✅ User {id} nhận 5 điểm cho bài viết mới"
```

### 4.2. Test Like Bài viết

```bash
# API: POST /api/posts/:postId/like

# Kiểm tra:
# 1. Like được thêm
# 2. Chủ bài viết nhận +1 điểm
# 3. Console log: "✅ User {id} nhận 1 điểm từ like"
```

### 4.3. Test Tạo Bình luận

```bash
# API: POST /api/posts/:postId/comments
# Body:
{
  "content": "Test comment"
}

# Kiểm tra:
# 1. Comment được tạo
# 2. User nhận +2 điểm
# 3. Console log: "✅ User {id} nhận 2 điểm cho bình luận mới"
```

### 4.4. Kiểm tra Database

```sql
-- Xem điểm của user
SELECT id, username, community_points, badge_level
FROM "Users"
WHERE id = 'user_id_here';

-- Xem tiến độ achievements
SELECT ua.*, a.name, a.points
FROM "UserAchievements" ua
JOIN "Achievements" a ON ua.achievement_id = a.id
WHERE ua.user_id = 'user_id_here'
ORDER BY ua.achieved_at DESC;
```

---

## 🎮 Bước 5: Tạo Badge Levels (Nếu chưa có)

### 5.1. Tạo badges qua API

```bash
# API: POST /api/admin/settings/badges
# Headers: Authorization: Bearer {admin_token}

# Badge 1: Đồng
{
  "name": "Đồng",
  "icon": "🥉",
  "min_points": 100,
  "rule_description": "Đạt 100 điểm cộng đồng",
  "is_active": true
}

# Badge 2: Bạc
{
  "name": "Bạc",
  "icon": "🥈",
  "min_points": 200,
  "rule_description": "Đạt 200 điểm cộng đồng",
  "is_active": true
}

# Badge 3: Vàng
{
  "name": "Vàng",
  "icon": "🥇",
  "min_points": 500,
  "rule_description": "Đạt 500 điểm cộng đồng",
  "is_active": true
}

# Badge 4: Bạch kim
{
  "name": "Bạch kim",
  "icon": "💎",
  "min_points": 1000,
  "rule_description": "Đạt 1000 điểm cộng đồng",
  "is_active": true
}

# Badge 5: Kim cương
{
  "name": "Kim cương",
  "icon": "💠",
  "min_points": 2000,
  "rule_description": "Đạt 2000 điểm cộng đồng",
  "is_active": true
}
```

### 5.2. Đồng bộ badges cho users hiện có

```bash
# API: POST /api/admin/settings/badges/resync
# Headers: Authorization: Bearer {admin_token}

# Hệ thống sẽ tự động:
# 1. Tính toán badge phù hợp cho mỗi user
# 2. Cập nhật badge_level
# 3. Gửi notification cho users nhận badge mới
```

---

## 📈 Bước 6: Giám sát Hệ thống

### 6.1. Xem Leaderboard

```sql
-- Top 20 users có điểm cao nhất
SELECT 
  u.id,
  u.username,
  u.name,
  u.community_points,
  bl.name as badge_name,
  bl.icon as badge_icon
FROM "Users" u
LEFT JOIN "BadgeLevels" bl ON u.badge_level = bl.level
WHERE u.is_active = true
ORDER BY u.community_points DESC
LIMIT 20;
```

### 6.2. Thống kê Achievements

```sql
-- Xem achievement nào được đạt nhiều nhất
SELECT 
  a.name,
  a.description,
  COUNT(ua.id) as total_achieved,
  a.points
FROM "Achievements" a
LEFT JOIN "UserAchievements" ua ON a.id = ua.achievement_id
WHERE a.criteria->>'type' IN ('post_created', 'comment_created', 'post_likes_received')
GROUP BY a.id, a.name, a.description, a.points
ORDER BY total_achieved DESC;
```

### 6.3. Xem Console Logs

```bash
# Khi hệ thống hoạt động, bạn sẽ thấy logs:
✅ User abc-123 nhận 5 điểm cho bài viết mới
✅ User xyz-456 nhận 1 điểm từ like
✅ User def-789 nhận 2 điểm cho bình luận mới
➖ User ghi-012 bị trừ 5 điểm do bài viết bị gỡ
```

---

## 🛠️ Bước 7: Xử lý Sự cố

### Vấn đề 1: User không nhận điểm

**Nguyên nhân:**
- Server chưa restart sau khi cập nhật code
- Migration chưa chạy
- Lỗi trong console

**Giải pháp:**
1. Kiểm tra console logs
2. Restart server
3. Kiểm tra database có achievements chưa

### Vấn đề 2: Achievement không được trao

**Nguyên nhân:**
- Tiến độ chưa đủ
- Achievement không active
- Lỗi trong achievementService

**Giải pháp:**
```sql
-- Kiểm tra tiến độ của user
SELECT * FROM "UserAchievements"
WHERE user_id = 'user_id_here'
AND achievement_id = 'achievement_id_here';

-- Kiểm tra achievement có active không
SELECT * FROM "Achievements"
WHERE id = 'achievement_id_here';
```

### Vấn đề 3: Điểm bị âm

**Nguyên nhân:**
- User bị gỡ nhiều bài viết/bình luận
- Điều này là bình thường

**Giải pháp:**
- Không cần xử lý, đây là cơ chế hình phạt
- Nếu muốn reset: `UPDATE "Users" SET community_points = 0 WHERE id = 'user_id'`

---

## 📝 Bước 8: Thông báo cho Users

### 8.1. Tạo thông báo hệ thống

```bash
# API: POST /api/admin/notifications
# Body:
{
  "audience": "all",
  "type": "system",
  "title": "🎉 Hệ thống Điểm Cộng Đồng Mới!",
  "content": {
    "html": "<h3>Chào mừng hệ thống điểm cộng đồng!</h3><p>Từ nay, bạn sẽ nhận điểm khi:</p><ul><li>✍️ Tạo bài viết: +5 điểm</li><li>💬 Tạo bình luận: +2 điểm</li><li>❤️ Nhận like: +1 điểm</li></ul><p>Tích lũy điểm để nhận huy hiệu và thành tích đặc biệt!</p>"
  },
  "priority": 1,
  "from_system": true
}
```

### 8.2. Cập nhật trang hướng dẫn

Thêm thông tin về hệ thống điểm vào:
- Trang FAQ
- Trang Hướng dẫn sử dụng
- Email welcome cho user mới

---

## 🎯 Bước 9: Tối ưu hóa (Tùy chọn)

### 9.1. Điều chỉnh điểm thưởng

Sau 1-2 tuần, phân tích dữ liệu:

```sql
-- Xem phân bố điểm
SELECT 
  CASE 
    WHEN community_points < 50 THEN '0-49'
    WHEN community_points < 100 THEN '50-99'
    WHEN community_points < 200 THEN '100-199'
    WHEN community_points < 500 THEN '200-499'
    ELSE '500+'
  END as point_range,
  COUNT(*) as user_count
FROM "Users"
WHERE is_active = true
GROUP BY point_range
ORDER BY point_range;
```

Nếu quá nhiều user ở 1 khoảng → điều chỉnh điểm thưởng.

### 9.2. Thêm achievements mới

```sql
-- Ví dụ: Achievement cho user active
INSERT INTO "Achievements" (name, description, criteria, icon, points, is_active)
VALUES (
  'Người hoạt động tích cực',
  'Đăng nhập 30 ngày liên tục',
  '{"type": "login_streak", "value": 30}'::jsonb,
  '🔥',
  100,
  true
);
```

---

## ✅ Checklist Triển khai

- [ ] Chạy migration SQL
- [ ] Kiểm tra 12 achievements được tạo
- [ ] Restart server
- [ ] Test tạo post → nhận điểm
- [ ] Test like post → chủ bài nhận điểm
- [ ] Test tạo comment → nhận điểm
- [ ] Test gỡ post → bị trừ điểm
- [ ] Tạo badge levels
- [ ] Chạy resync badges
- [ ] Gửi thông báo cho users
- [ ] Giám sát logs trong 24h đầu
- [ ] Phân tích dữ liệu sau 1 tuần

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. Console logs
2. Database logs
3. File `COMMUNITY_POINTS_SYSTEM.md` để hiểu rõ hơn

---

**Ngày tạo:** 2025-11-24  
**Phiên bản:** 1.0  
**Trạng thái:** ✅ Sẵn sàng triển khai

