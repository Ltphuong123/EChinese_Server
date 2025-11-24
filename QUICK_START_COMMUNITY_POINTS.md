# 🚀 Quick Start: Hệ thống Điểm Cộng Đồng

## ⚡ Triển khai trong 5 phút

### Bước 1: Chạy Migration (2 phút)
```bash
# Kết nối database
psql -U your_username -d your_database_name

# Chạy migration
\i config/migrations/add_community_achievements.sql

# Kiểm tra
SELECT COUNT(*) FROM "Achievements" 
WHERE criteria->>'type' IN ('post_created', 'comment_created', 'post_likes_received');
# Kết quả: 12 achievements
```

### Bước 2: Restart Server (1 phút)
```bash
# Dừng server
Ctrl + C

# Khởi động lại
npm start
```

### Bước 3: Test (2 phút)
```bash
# Test 1: Tạo post
POST /api/posts
{
  "title": "Test",
  "content": "Test content",
  "topic": "general"
}
# ✅ Nhận +5 điểm

# Test 2: Like post
POST /api/posts/:postId/like
# ✅ Chủ bài viết nhận +1 điểm

# Test 3: Tạo comment
POST /api/posts/:postId/comments
{
  "content": "Test comment"
}
# ✅ Nhận +2 điểm
```

---

## 📊 Bảng Điểm Nhanh

| Hành động | Điểm | Người nhận |
|-----------|------|------------|
| Tạo post | +5 | Người tạo |
| Tạo comment | +2 | Người tạo |
| Post được like | +1 | Chủ post |
| Post bị unlike | -1 | Chủ post |
| Post bị gỡ (vi phạm) | -5 | Chủ post |
| Comment bị gỡ (vi phạm) | -2 | Chủ comment |

---

## 🏆 Achievements Mới (12 cái)

### Posts (4)
- 10 posts → 50 điểm
- 25 posts → 100 điểm
- 50 posts → 200 điểm
- 100 posts → 500 điểm

### Comments (4)
- 50 comments → 30 điểm
- 100 comments → 60 điểm
- 200 comments → 100 điểm
- 500 comments → 250 điểm

### Likes (4)
- 50 likes → 30 điểm
- 100 likes → 50 điểm
- 500 likes → 200 điểm
- 1000 likes → 500 điểm

---

## 🔧 Tùy chỉnh Điểm

**File:** `config/communityPoints.js`

```javascript
const COMMUNITY_POINTS = {
  POST_CREATED: 5,        // Đổi thành 10 nếu muốn
  COMMENT_CREATED: 2,     // Đổi thành 3 nếu muốn
  POST_LIKED: 1,          // Đổi thành 2 nếu muốn
  POST_REMOVED: -5,       // Đổi thành -10 nếu muốn
  COMMENT_REMOVED: -2,    // Đổi thành -5 nếu muốn
};
```

**Lưu ý:** Sau khi đổi phải restart server!

---

## 📝 Tài liệu Chi tiết

- **Hệ thống:** `COMMUNITY_POINTS_SYSTEM.md`
- **Admin:** `ADMIN_GUIDE_COMMUNITY_POINTS.md`
- **Tích hợp:** `ACHIEVEMENT_INTEGRATION.md`

---

## ✅ Checklist

- [ ] Chạy migration
- [ ] Restart server
- [ ] Test tạo post
- [ ] Test like
- [ ] Test comment
- [ ] Kiểm tra console logs
- [ ] Tạo badges (nếu chưa có)
- [ ] Thông báo cho users

---

## 🆘 Troubleshooting

**Không nhận điểm?**
→ Kiểm tra console logs, restart server

**Achievement không được trao?**
→ Kiểm tra tiến độ trong database

**Lỗi khi chạy migration?**
→ Kiểm tra database connection

---

**Thời gian triển khai:** ~5 phút  
**Độ khó:** ⭐⭐☆☆☆ (Dễ)  
**Trạng thái:** ✅ Sẵn sàng

