# Hệ thống Điểm Cộng Đồng (Community Points System)

## 📋 Tổng quan

Hệ thống điểm cộng đồng được thiết kế để khuyến khích người dùng tham gia tích cực vào cộng đồng. Điểm được cộng/trừ tự động dựa trên các hành động của người dùng.

---

## 💰 Bảng Điểm Thưởng

### ✅ Hoạt động Tạo Nội dung

| Hành động | Điểm | Mô tả |
|-----------|------|-------|
| **Tạo bài viết** | +5 | Mỗi khi tạo bài viết mới |
| **Tạo bình luận** | +2 | Mỗi khi tạo bình luận |

### 💖 Hoạt động Tương tác

| Hành động | Điểm | Người nhận | Mô tả |
|-----------|------|------------|-------|
| **Bài viết được like** | +1 | Chủ bài viết | Mỗi lần nhận like (không tính tự like) |
| **Unlike bài viết** | -1 | Chủ bài viết | Khi ai đó bỏ like |

### ⚠️ Hình phạt

| Hành động | Điểm | Điều kiện |
|-----------|------|-----------|
| **Bài viết bị gỡ** | -5 | Admin gỡ do vi phạm |
| **Bình luận bị gỡ** | -2 | Admin/chủ bài viết gỡ do vi phạm |

**Lưu ý:** Không bị trừ điểm nếu tự xóa nội dung của mình.

---

## 🎯 Achievements Liên quan

### Achievements Mới (Cần tạo trong database)

```javascript
// 1. Achievement cho Post
{
  name: "Người viết lách",
  description: "Tạo 10 bài viết",
  criteria: { type: "post_created", value: 10 },
  points: 50,
  icon: "✍️"
}
{
  name: "Tác giả nổi tiếng",
  description: "Tạo 50 bài viết",
  criteria: { type: "post_created", value: 50 },
  points: 200,
  icon: "📝"
}

// 2. Achievement cho Comment
{
  name: "Người bình luận",
  description: "Tạo 50 bình luận",
  criteria: { type: "comment_created", value: 50 },
  points: 30,
  icon: "💬"
}
{
  name: "Chuyên gia thảo luận",
  description: "Tạo 200 bình luận",
  criteria: { type: "comment_created", value: 200 },
  points: 100,
  icon: "🗣️"
}

// 3. Achievement cho Like
{
  name: "Người được yêu thích",
  description: "Nhận 100 likes",
  criteria: { type: "post_likes_received", value: 100 },
  points: 50,
  icon: "❤️"
}
{
  name: "Ngôi sao cộng đồng",
  description: "Nhận 500 likes",
  criteria: { type: "post_likes_received", value: 500 },
  points: 200,
  icon: "⭐"
}
```

---

## 🔄 Luồng Hoạt động

### 1. Tạo Bài viết

```javascript
User tạo post
  ↓
postService.createPost()
  ↓
✅ Lưu post vào database
  ↓
🎁 Cộng 5 điểm cho user
  ↓
📊 Cập nhật tiến độ achievement "post_created"
  ↓
🏆 Nếu đủ điều kiện → Trao achievement → Cộng thêm điểm thưởng
```

### 2. Like Bài viết

```javascript
User A like bài viết của User B
  ↓
postService.toggleLike()
  ↓
✅ Thêm like vào database
  ↓
🎁 Cộng 1 điểm cho User B (chủ bài viết)
  ↓
📊 Cập nhật tiến độ achievement "post_likes_received" cho User B
  ↓
🏆 Nếu đủ điều kiện → Trao achievement
```

### 3. Unlike Bài viết

```javascript
User A unlike bài viết của User B
  ↓
postService.toggleLike()
  ↓
✅ Xóa like khỏi database
  ↓
💔 Trừ 1 điểm của User B
```

### 4. Bài viết bị gỡ

```javascript
Admin gỡ bài viết vi phạm của User
  ↓
postService.removePost()
  ↓
✅ Soft delete bài viết
  ↓
💔 Trừ 5 điểm của User
  ↓
📝 Ghi log moderation
```

---

## 🎮 Ví dụ Thực tế

### Scenario: User từ 0 → 100 điểm

```javascript
// Tuần 1: Tạo 10 bài viết
10 posts × 5 điểm = 50 điểm
→ Đạt achievement "Người viết lách" (+50 điểm)
→ Tổng: 100 điểm

// Tuần 2: Nhận 50 likes
50 likes × 1 điểm = 50 điểm
→ Tổng: 150 điểm

// Tuần 3: Tạo 50 bình luận
50 comments × 2 điểm = 100 điểm
→ Đạt achievement "Người bình luận" (+30 điểm)
→ Tổng: 280 điểm

// Tuần 4: 1 bài viết bị gỡ
-5 điểm
→ Tổng: 275 điểm
```

---

## 🔧 Cấu hình

File: `config/communityPoints.js`

```javascript
const COMMUNITY_POINTS = {
  POST_CREATED: 5,
  COMMENT_CREATED: 2,
  POST_LIKED: 1,
  POST_REMOVED: -5,
  COMMENT_REMOVED: -2,
};
```

Có thể điều chỉnh giá trị điểm trong file này.

---

## 📊 Quan hệ với Badge System

```javascript
// Điểm cộng đồng → Badge Level
User có 280 điểm
  ↓
Admin đã tạo badges:
- Level 1: "Đồng" (min_points: 100)
- Level 2: "Bạc" (min_points: 200)
- Level 3: "Vàng" (min_points: 300)
  ↓
Admin chạy resync:
POST /api/admin/settings/badges/resync
  ↓
280 >= 200 ✅ → User nhận badge "Bạc" (Level 2)
```

---

## 🛡️ Xử lý Lỗi

Tất cả logic cộng/trừ điểm đều có try-catch:
- ✅ Không làm gián đoạn flow chính
- ✅ Log lỗi ra console để debug
- ✅ Đảm bảo UX không bị ảnh hưởng

```javascript
try {
  await userModel.addCommunityPoints(userId, points);
} catch (error) {
  console.error("❌ Lỗi khi cộng điểm:", error);
  // Không throw để không ảnh hưởng flow chính
}
```

---

## 🚀 Tính năng Tương lai

### 1. Điểm cho hoạt động đặc biệt
- **Post được ghim**: +10 điểm
- **Best Answer**: +15 điểm
- **Chia sẻ bài viết**: +3 điểm

### 2. Hệ thống Multiplier
```javascript
// Điểm nhân đôi vào cuối tuần
if (isWeekend) {
  points *= 2;
}

// Điểm bonus cho user có badge cao
if (userBadgeLevel >= 5) {
  points *= 1.5;
}
```

### 3. Daily/Weekly Quests
```javascript
{
  quest: "Tạo 5 bài viết trong ngày",
  reward: 50,
  type: "daily"
}
```

### 4. Leaderboard
```javascript
GET /api/community/leaderboard
// Top 100 users theo community_points
```

---

## 📝 Migration SQL

Để thêm achievements mới vào database:

```sql
-- Chạy file: config/migrations/add_community_achievements.sql
```

---

## ✅ Checklist Triển khai

- [x] Tạo file cấu hình `config/communityPoints.js`
- [x] Cập nhật `postService.js` - cộng điểm cho post
- [x] Cập nhật `postService.js` - cộng/trừ điểm cho like/unlike
- [x] Cập nhật `postService.js` - trừ điểm khi post bị gỡ
- [x] Cập nhật `commentService.js` - cộng điểm cho comment
- [x] Cập nhật `commentService.js` - trừ điểm khi comment bị gỡ
- [ ] Tạo achievements mới trong database
- [ ] Test tất cả flows
- [ ] Thông báo cho users về hệ thống mới

---

**Ngày triển khai:** 2025-11-24  
**Trạng thái:** ✅ Hoàn thành code, chờ tạo achievements

