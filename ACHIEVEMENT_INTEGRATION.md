# Tích hợp Hệ thống Thành tích (Achievement System Integration)

## 📋 Tổng quan

Đã tích hợp thành công hệ thống theo dõi và cập nhật tiến độ thành tích cho 5 loại tiêu chí:

### ✅ Các tiêu chí đã tích hợp:

1. **`ai_lesson`** - Sử dụng tính năng Bài học AI
2. **`ai_translate`** - Sử dụng tính năng Dịch AI
3. **`mock_test`** - Hoàn thành bài thi thử HSK
4. **`community_points`** - Đạt điểm cộng đồng
5. **`login_streak`** - Đăng nhập liên tục

---

## 🔧 Chi tiết tích hợp

### 1. **AI Lesson** (`ai_lesson`)
**File:** `controllers/aiController.js`
**Hàm:** `generateLesson()`
**Vị trí:** Sau khi tạo bài học thành công và cập nhật usage
**Logic:** Cộng dồn (+1 mỗi lần tạo bài học)

```javascript
// Cập nhật tiến độ thành tích ai_lesson
try {
  const achievementService = require("../services/achievementService");
  await achievementService.updateProgress(userId, "ai_lesson", 1);
} catch (error) {
  console.error("Lỗi khi cập nhật tiến độ thành tích ai_lesson:", error);
}
```

**Thành tích liên quan:**
- "Nhà soạn thảo AI" - Sử dụng 20 lần (60 điểm)

---

### 2. **AI Translate** (`ai_translate`)
**File:** `services/aiTranslationService.js`
**Hàm:** `translateWithWordExamples()`
**Vị trí:** Sau khi lưu bản dịch vào database
**Logic:** Cộng dồn (+1 mỗi lần dịch)

```javascript
// Cập nhật tiến độ thành tích ai_translate
if (userId) {
  try {
    const achievementService = require('./achievementService');
    await achievementService.updateProgress(userId, "ai_translate", 1);
  } catch (error) {
    console.error("Lỗi khi cập nhật tiến độ thành tích ai_translate:", error);
  }
}
```

**Thành tích liên quan:**
- "Thánh Dịch Thuật" - Sử dụng 50 lần (75 điểm)

---

### 3. **Mock Test** (`mock_test`)
**File:** `services/testAttemptService.js`
**Hàm:** `submitAttempt()`
**Vị trí:** Sau khi nộp bài và cập nhật điểm cao nhất
**Logic:** Cộng dồn (+1 mỗi lần hoàn thành bài thi)

```javascript
// Cập nhật tiến độ thành tích mock_test
try {
  const achievementService = require('./achievementService');
  await achievementService.updateProgress(userId, "mock_test", 1);
} catch (error) {
  console.error("Lỗi khi cập nhật tiến độ thành tích mock_test:", error);
}
```

**Thành tích liên quan:**
- "Nhà Thám Hiểm" - Hoàn thành 10 bài thi (150 điểm)

---

### 4. **Community Points** (`community_points`)
**File:** `models/userModel.js`
**Hàm:** `addCommunityPoints()`
**Vị trí:** Sau khi cộng điểm vào database
**Logic:** Giá trị tuyệt đối (tổng điểm hiện tại)

```javascript
// Cập nhật tiến độ thành tích community_points với giá trị tuyệt đối
try {
  const achievementService = require('../services/achievementService');
  await achievementService.updateProgress(userId, "community_points", newTotalPoints, true);
} catch (error) {
  console.error("Lỗi khi cập nhật tiến độ thành tích community_points:", error);
}
```

**Thành tích liên quan:**
- "Người đóng góp" - Đạt 1000 điểm (100 điểm)

---

### 5. **Login Streak** (`login_streak`)
**File:** `services/userService.js`
**Hàm:** `updateLoginStreak()`
**Vị trí:** Khi tạo mới streak, tăng streak, hoặc reset streak
**Logic:** Giá trị tuyệt đối (số ngày đăng nhập liên tục hiện tại)

```javascript
// Cập nhật tiến độ thành tích login_streak với giá trị tuyệt đối
try {
  const achievementService = require('./achievementService');
  await achievementService.updateProgress(userId, "login_streak", newCurrentStreak, true);
} catch (error) {
  console.error("Lỗi khi cập nhật tiến độ thành tích login_streak:", error);
}
```

**Thành tích liên quan:**
- "Gấu chăm chỉ" - Đăng nhập liên tục 7 ngày (50 điểm)

---

## 🎯 Cải tiến trong `achievementService.updateProgress()`

### Tham số mới: `isAbsolute`

```javascript
updateProgress: async (userId, criteriaType, value, isAbsolute = false)
```

**Mục đích:** Hỗ trợ 2 loại logic cập nhật tiến độ:

1. **Cộng dồn (Incremental)** - `isAbsolute = false` (mặc định)
   - Dùng cho: `ai_lesson`, `ai_translate`, `mock_test`
   - Logic: `newValue = currentValue + value`
   - Ví dụ: User đã dùng 5 lần, thêm 1 lần → 6 lần

2. **Giá trị tuyệt đối (Absolute)** - `isAbsolute = true`
   - Dùng cho: `login_streak`, `community_points`
   - Logic: `newValue = value`
   - Ví dụ: User có 500 điểm, cộng 100 → set thành 600 điểm

---

## 🔔 Tính năng tự động

Khi user đạt được thành tích:
1. ✅ Tự động tạo bản ghi `UserAchievements`
2. ✅ Tự động cộng điểm thưởng vào `community_points`
3. ✅ Tự động gửi thông báo với type `achievement`
4. ✅ Hiển thị thông tin chi tiết (tên, mô tả, điểm, tiến độ)

---

## 🛡️ Xử lý lỗi

Tất cả các tích hợp đều có try-catch để:
- Không làm gián đoạn flow chính nếu achievement service gặp lỗi
- Log lỗi ra console để debug
- Đảm bảo trải nghiệm người dùng không bị ảnh hưởng

---

## 📊 Cách kiểm tra

### 1. Kiểm tra tiến độ của user:
```
GET /api/users/me/achievements/progress
```

### 2. Kiểm tra thành tích đã đạt:
```
GET /api/users/me/achievements
```

### 3. Kiểm tra thống kê:
```
GET /api/users/me/achievements/statistics
```

### 4. Kiểm tra thành tích sắp đạt (>70%):
```
GET /api/users/me/achievements/almost-achieved
```

---

## 🎮 Test scenarios

### Test AI Lesson:
1. Tạo 20 bài học AI
2. Kiểm tra tiến độ sau mỗi lần tạo
3. Xác nhận nhận được thành tích "Nhà soạn thảo AI" sau lần thứ 20

### Test AI Translate:
1. Dịch 50 lần với AI
2. Kiểm tra tiến độ tăng dần
3. Xác nhận nhận được thành tích "Thánh Dịch Thuật" sau lần thứ 50

### Test Mock Test:
1. Hoàn thành 10 bài thi thử
2. Kiểm tra tiến độ sau mỗi lần submit
3. Xác nhận nhận được thành tích "Nhà Thám Hiểm" sau bài thứ 10

### Test Community Points:
1. Tích lũy điểm cộng đồng (qua post, comment, like...)
2. Kiểm tra tiến độ cập nhật theo tổng điểm
3. Xác nhận nhận được thành tích "Người đóng góp" khi đạt 1000 điểm

### Test Login Streak:
1. Đăng nhập liên tục 7 ngày
2. Kiểm tra tiến độ tăng mỗi ngày
3. Xác nhận nhận được thành tích "Gấu chăm chỉ" sau ngày thứ 7
4. Test reset: Bỏ lỡ 1 ngày → streak reset về 1

---

## 📝 Lưu ý quan trọng

1. **Circular dependency:** Đã xử lý bằng cách require achievementService bên trong hàm thay vì ở đầu file

2. **Performance:** Các hàm achievement tracking chạy bất đồng bộ và không block flow chính

3. **Database transactions:** Hàm `addCommunityPoints` trong userModel đã được sửa để return giá trị mới, tránh race condition

4. **Error handling:** Tất cả đều có try-catch, không throw error để không ảnh hưởng UX

---

## 🎉 CẬP NHẬT MỚI: Hệ thống Điểm Cộng Đồng (2025-11-24)

### ✅ Đã tích hợp thêm 3 tiêu chí mới:

#### 6. **Post Created** (`post_created`)
**File:** `services/postService.js`
**Hàm:** `createPost()`
**Vị trí:** Sau khi tạo bài viết thành công
**Logic:** Cộng dồn (+1 mỗi lần tạo post)
**Điểm thưởng:** +5 điểm community_points

```javascript
// Cộng điểm cho bài viết mới
await userModel.addCommunityPoints(userId, COMMUNITY_POINTS.POST_CREATED);
// Cập nhật tiến độ achievement
await achievementService.updateProgress(userId, "post_created", 1);
```

**Thành tích liên quan:**
- "Người viết lách" - Tạo 10 bài viết (50 điểm)
- "Tác giả nhiệt huyết" - Tạo 25 bài viết (100 điểm)
- "Tác giả nổi tiếng" - Tạo 50 bài viết (200 điểm)
- "Bậc thầy viết lách" - Tạo 100 bài viết (500 điểm)

---

#### 7. **Comment Created** (`comment_created`)
**File:** `services/commentService.js`
**Hàm:** `createComment()`
**Vị trí:** Sau khi tạo bình luận thành công
**Logic:** Cộng dồn (+1 mỗi lần tạo comment)
**Điểm thưởng:** +2 điểm community_points

```javascript
// Cộng điểm cho bình luận mới
await userModel.addCommunityPoints(userId, COMMUNITY_POINTS.COMMENT_CREATED);
// Cập nhật tiến độ achievement
await achievementService.updateProgress(userId, "comment_created", 1);
```

**Thành tích liên quan:**
- "Người bình luận" - Tạo 50 bình luận (30 điểm)
- "Người thảo luận" - Tạo 100 bình luận (60 điểm)
- "Chuyên gia thảo luận" - Tạo 200 bình luận (100 điểm)
- "Bậc thầy giao tiếp" - Tạo 500 bình luận (250 điểm)

---

#### 8. **Post Likes Received** (`post_likes_received`)
**File:** `services/postService.js`
**Hàm:** `toggleLike()`
**Vị trí:** Khi bài viết được like
**Logic:** Cộng dồn (+1 mỗi lần nhận like)
**Điểm thưởng:** +1 điểm community_points (cho chủ bài viết)

```javascript
// Khi like: Cộng điểm cho chủ bài viết
if (userId !== postOwnerId) {
  await userModel.addCommunityPoints(postOwnerId, COMMUNITY_POINTS.POST_LIKED);
  await achievementService.updateProgress(postOwnerId, "post_likes_received", 1);
}

// Khi unlike: Trừ điểm
if (userId !== postOwnerId) {
  await userModel.addCommunityPoints(postOwnerId, -COMMUNITY_POINTS.POST_LIKED);
}
```

**Thành tích liên quan:**
- "Người được yêu thích" - Nhận 50 likes (30 điểm)
- "Người nổi tiếng" - Nhận 100 likes (50 điểm)
- "Ngôi sao cộng đồng" - Nhận 500 likes (200 điểm)
- "Huyền thoại" - Nhận 1000 likes (500 điểm)

---

### 💔 Hệ thống Hình phạt

#### Bài viết bị gỡ do vi phạm
**File:** `services/postService.js`
**Hàm:** `removePost()`
**Điều kiện:** Admin gỡ bài viết (không phải tự xóa)
**Hình phạt:** -5 điểm community_points

```javascript
if (isAdmin && !isOwner) {
  await userModel.addCommunityPoints(post.user_id, COMMUNITY_POINTS.POST_REMOVED);
}
```

#### Bình luận bị gỡ do vi phạm
**File:** `services/commentService.js`
**Hàm:** `removeComment()`
**Điều kiện:** Admin/chủ bài viết gỡ bình luận (không phải tự xóa)
**Hình phạt:** -2 điểm community_points

```javascript
if ((isAdmin || isPostOwner) && !isCommentOwner) {
  await userModel.addCommunityPoints(comment.user_id, COMMUNITY_POINTS.COMMENT_REMOVED);
}
```

---

### 📊 Tổng hợp Tiêu chí (8 loại)

| # | Tiêu chí | File | Logic | Điểm |
|---|----------|------|-------|------|
| 1 | `ai_lesson` | aiController.js | Cộng dồn | Theo achievement |
| 2 | `ai_translate` | aiTranslationService.js | Cộng dồn | Theo achievement |
| 3 | `mock_test` | testAttemptService.js | Cộng dồn | Theo achievement |
| 4 | `community_points` | userModel.js | Tuyệt đối | Theo achievement |
| 5 | `login_streak` | userService.js | Tuyệt đối | Theo achievement |
| 6 | `post_created` | postService.js | Cộng dồn | +5 điểm |
| 7 | `comment_created` | commentService.js | Cộng dồn | +2 điểm |
| 8 | `post_likes_received` | postService.js | Cộng dồn | +1 điểm |

---

### 📁 Files mới được tạo

1. **`config/communityPoints.js`** - Cấu hình điểm thưởng
2. **`config/migrations/add_community_achievements.sql`** - Migration tạo 12 achievements mới
3. **`COMMUNITY_POINTS_SYSTEM.md`** - Tài liệu hệ thống
4. **`ADMIN_GUIDE_COMMUNITY_POINTS.md`** - Hướng dẫn admin

---

## 🚀 Mở rộng trong tương lai

Để thêm tiêu chí mới:

1. Tạo achievement mới trong database với `criteria.type` mới
2. Tìm service/controller xử lý hành động đó
3. Thêm gọi `achievementService.updateProgress()` với:
   - `criteriaType`: tên tiêu chí mới
   - `value`: giá trị cần cập nhật
   - `isAbsolute`: true/false tùy logic

Ví dụ thêm tiêu chí "post_shared":
```javascript
// Trong postService sau khi share post
await userModel.addCommunityPoints(userId, 3); // +3 điểm
await achievementService.updateProgress(userId, "post_shared", 1);
```

---

**Ngày tích hợp ban đầu:** 2025-11-24  
**Cập nhật gần nhất:** 2025-11-24 (Thêm hệ thống điểm cộng đồng)  
**Trạng thái:** ✅ Hoàn thành code, chờ chạy migration
