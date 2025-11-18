# 📬 Các Loại Thông Báo Trong Hệ Thống

## 📋 Tổng Quan

Hệ thống có **3 loại thông báo chính**:

| Type | Mô Tả | Khi Nào Gửi |
|------|-------|-------------|
| `system` | Thông báo hệ thống | Bảo trì, cập nhật, chào mừng, nhắc nhở |
| `community` | Thông báo cộng đồng | Like, comment, duyệt bài |
| `comment_ban` | Cấm bình luận | Vi phạm quy định |

---

## 1️⃣ SYSTEM - Thông Báo Hệ Thống

### Mô Tả
Thông báo từ hệ thống/admin đến users về các sự kiện quan trọng, cập nhật, hoặc nhắc nhở.

### Đặc Điểm
- `type`: `"system"`
- `from_system`: `true`
- `priority`: Thường là 2-3 (quan trọng)
- Có thể gửi cho 1 user hoặc broadcast

---

### Ví Dụ 1.1: Chào Mừng User Mới

```bash
curl -X POST http://localhost:5000/api/send-notification \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "🎉 Chào mừng bạn đến với Hán Tự!",
    "message": "Cảm ơn bạn đã đăng ký. Hãy bắt đầu hành trình học tiếng Trung ngay hôm nay!",
    "url": "app://home",
    "priority": 2
  }'
```

**Hoặc dùng API đầy đủ:**

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "system",
    "title": "🎉 Chào mừng bạn đến với Hán Tự!",
    "content": {
      "message": "Cảm ơn bạn đã đăng ký. Hãy bắt đầu hành trình học tiếng Trung ngay hôm nay!"
    },
    "redirect_url": "app://home",
    "priority": 2,
    "from_system": true
  }'
```

---

### Ví Dụ 1.2: Thông Báo Bảo Trì (Broadcast)

```bash
curl -X POST http://localhost:5000/api/send-notification-all \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "⚠️ Thông báo bảo trì hệ thống",
    "message": "Hệ thống sẽ bảo trì vào 2h sáng ngày 20/01/2024. Thời gian dự kiến: 30 phút.",
    "url": "app://maintenance",
    "priority": 3
  }'
```

**Hoặc:**

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "audience": "all",
    "type": "system",
    "title": "⚠️ Thông báo bảo trì hệ thống",
    "content": {
      "message": "Hệ thống sẽ bảo trì vào 2h sáng ngày 20/01/2024. Thời gian dự kiến: 30 phút."
    },
    "redirect_url": "app://maintenance",
    "priority": 3,
    "from_system": true,
    "expires_at": "2024-01-20T03:00:00Z"
  }'
```

---

### Ví Dụ 1.3: Cập Nhật Tính Năng Mới

```bash
curl -X POST http://localhost:5000/api/send-notification-all \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "🎉 Tính năng mới: HSK 3.0",
    "message": "Chúng tôi vừa cập nhật bộ từ vựng HSK 3.0 mới nhất. Hãy khám phá ngay!",
    "url": "app://vocab/hsk3",
    "priority": 2
  }'
```

---

### Ví Dụ 1.4: Nhắc Nhở Học Tập

```bash
curl -X POST http://localhost:5000/api/send-notification \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "📚 Đã đến giờ học rồi!",
    "message": "Bạn chưa học bài hôm nay. Hãy dành 10 phút để ôn tập nhé!",
    "url": "app://lessons",
    "priority": 1
  }'
```

---

### Ví Dụ 1.5: Thông Báo Thành Tích

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "system",
    "title": "🏆 Chúc mừng! Bạn đã đạt cấp độ mới",
    "content": {
      "message": "Bạn vừa đạt cấp độ HSK 3! Tiếp tục phát huy nhé!"
    },
    "redirect_url": "app://achievements",
    "data": {
      "achievement_id": "hsk3",
      "level": "3"
    },
    "priority": 2,
    "from_system": true
  }'
```

---

## 2️⃣ COMMUNITY - Thông Báo Cộng Đồng

### Mô Tả
Thông báo về các hoạt động trong cộng đồng: like, comment, duyệt bài, etc.

### Đặc Điểm
- `type`: `"community"`
- `related_type`: `"post"` hoặc `"comment"`
- `related_id`: ID của post/comment
- `priority`: Thường là 1 (bình thường)
- **Tự động gửi** khi có like/comment

---

### Ví Dụ 2.1: Ai Đó Thích Bài Viết (Tự Động)

**Code tự động gửi trong `services/postService.js`:**

```javascript
// Khi user like bài viết
await notificationService.createNotification({
  recipient_id: postExists.user_id,
  audience: 'user',
  type: 'community',
  title: 'Ai đó đã thích bài viết của bạn',
  content: { 
    message: `${liker.username} đã thích bài viết "${postExists.title.substring(0, 50)}"` 
  },
  related_type: 'post',
  related_id: postId,
  data: { 
    liker_id: userId,
    liker_name: liker.username,
    post_id: postId 
  },
  redirect_url: `app://post/${postId}`,
  priority: 1
});
```

**Gửi thủ công (nếu cần):**

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "community",
    "title": "❤️ Ai đó đã thích bài viết của bạn",
    "content": {
      "message": "John Doe đã thích bài viết \"Cách học tiếng Trung hiệu quả\""
    },
    "related_type": "post",
    "related_id": "660e8400-e29b-41d4-a716-446655440001",
    "redirect_url": "app://post/660e8400-e29b-41d4-a716-446655440001",
    "data": {
      "liker_id": "770e8400-e29b-41d4-a716-446655440002",
      "liker_name": "John Doe",
      "post_id": "660e8400-e29b-41d4-a716-446655440001"
    },
    "priority": 1
  }'
```

---

### Ví Dụ 2.2: Bình Luận Mới (Tự Động)

**Code tự động gửi trong `services/commentService.js`:**

```javascript
// Khi user comment bài viết
await notificationService.createNotification({
  recipient_id: postExists.user_id,
  audience: 'user',
  type: 'community',
  title: 'Bình luận mới',
  content: { 
    message: `${commenter.username} đã bình luận: "${commentPreview}..."` 
  },
  related_type: 'comment',
  related_id: newComment.id,
  data: { 
    commenter_id: userId,
    commenter_name: commenter.username,
    post_id: postId,
    comment_id: newComment.id
  },
  redirect_url: `app://post/${postId}#comment-${newComment.id}`,
  priority: 1
});
```

**Gửi thủ công:**

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "community",
    "title": "💬 Bình luận mới",
    "content": {
      "message": "Jane Smith đã bình luận: \"Bài viết rất hay, cảm ơn bạn!\""
    },
    "related_type": "comment",
    "related_id": "880e8400-e29b-41d4-a716-446655440003",
    "redirect_url": "app://post/660e8400-e29b-41d4-a716-446655440001#comment-880e8400-e29b-41d4-a716-446655440003",
    "data": {
      "commenter_id": "990e8400-e29b-41d4-a716-446655440004",
      "commenter_name": "Jane Smith",
      "post_id": "660e8400-e29b-41d4-a716-446655440001",
      "comment_id": "880e8400-e29b-41d4-a716-446655440003"
    },
    "priority": 1
  }'
```

---

### Ví Dụ 2.3: Bài Viết Được Duyệt

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "community",
    "title": "✅ Bài viết của bạn đã được duyệt",
    "content": {
      "message": "Bài viết \"Cách học tiếng Trung hiệu quả\" đã được phê duyệt và xuất bản"
    },
    "related_type": "post",
    "related_id": "660e8400-e29b-41d4-a716-446655440001",
    "redirect_url": "app://post/660e8400-e29b-41d4-a716-446655440001",
    "data": {
      "post_id": "660e8400-e29b-41d4-a716-446655440001",
      "post_title": "Cách học tiếng Trung hiệu quả",
      "approved_by": "admin"
    },
    "priority": 2
  }'
```

---

## 3️⃣ COMMENT_BAN - Cấm Bình Luận

### Mô Tả
Thông báo khi user bị cấm bình luận do vi phạm quy định.

### Đặc Điểm
- `type`: `"comment_ban"`
- `expires_at`: Thời gian hết hạn cấm
- `priority`: 3 (rất quan trọng)
- Hệ thống kiểm tra notification này để chặn comment

---

### Ví Dụ 3.1: Cấm Bình Luận 24 Giờ

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "comment_ban",
    "title": "⚠️ Bạn đã bị cấm bình luận",
    "content": {
      "message": "Bình luận của bạn vi phạm quy định cộng đồng. Bạn bị cấm bình luận trong 24 giờ."
    },
    "redirect_url": "app://community-rules",
    "expires_at": "2024-01-16T12:00:00Z",
    "priority": 3,
    "from_system": true
  }'
```

---

### Ví Dụ 3.2: Cấm Bình Luận Vĩnh Viễn

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "comment_ban",
    "title": "🚫 Tài khoản bị cấm bình luận vĩnh viễn",
    "content": {
      "message": "Do vi phạm nghiêm trọng quy định cộng đồng, tài khoản của bạn đã bị cấm bình luận vĩnh viễn."
    },
    "redirect_url": "app://community-rules",
    "expires_at": null,
    "priority": 3,
    "from_system": true
  }'
```

---

### Ví Dụ 3.3: Cảnh Báo (Chưa Cấm)

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "audience": "user",
    "type": "system",
    "title": "⚠️ Cảnh báo vi phạm",
    "content": {
      "message": "Bình luận của bạn không phù hợp. Đây là lần cảnh báo đầu tiên. Nếu tiếp tục vi phạm, bạn sẽ bị cấm bình luận."
    },
    "redirect_url": "app://community-rules",
    "priority": 3,
    "from_system": true
  }'
```

---

## 📊 Bảng Tổng Hợp

| Type | Audience | Priority | Auto Send | Expires | Related |
|------|----------|----------|-----------|---------|---------|
| `system` | user/all | 1-3 | ❌ Thủ công | ✅ Có thể | ❌ Không |
| `community` | user | 1-2 | ✅ Tự động | ❌ Không | ✅ post/comment |
| `comment_ban` | user | 3 | ❌ Thủ công | ✅ Có | ❌ Không |

---

## 🎯 Khi Nào Dùng Loại Nào?

### Dùng `system`:
- ✅ Chào mừng user mới
- ✅ Thông báo bảo trì
- ✅ Cập nhật tính năng
- ✅ Nhắc nhở học tập
- ✅ Thông báo thành tích
- ✅ Cảnh báo (chưa cấm)

### Dùng `community`:
- ✅ Like bài viết (tự động)
- ✅ Comment bài viết (tự động)
- ✅ Duyệt bài viết
- ✅ Reply comment
- ✅ Mention user

### Dùng `comment_ban`:
- ✅ Cấm bình luận tạm thời
- ✅ Cấm bình luận vĩnh viễn
- ✅ Vi phạm nghiêm trọng

---

## 💡 Tips

### 1. Priority
- `1`: Bình thường (like, comment)
- `2`: Quan trọng (cập nhật, duyệt bài)
- `3`: Rất quan trọng (bảo trì, cấm)

### 2. Expires At
- `null`: Không hết hạn
- `timestamp`: Hết hạn vào thời điểm cụ thể
- Dùng cho: bảo trì, cấm tạm thời

### 3. Related Type/ID
- Chỉ dùng cho `community` type
- Giúp navigate đến đúng post/comment

### 4. Data Object
- Lưu thông tin bổ sung
- Tất cả values phải là STRING
- Dùng để hiển thị chi tiết

---

**Đó là tất cả các loại thông báo trong hệ thống! 🚀**
