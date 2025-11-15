# User Ban/Unban & Comment Moderation API Documentation

## 📋 User Management APIs

### 1. Ban User (Cấm người dùng)

**Endpoint:** `POST /api/admin/users/:userId/ban`

**Mô tả:** Cấm một người dùng bằng cách đặt `is_active = false`. API này sẽ tạo bản ghi vi phạm và gửi thông báo cho người dùng.

**Authorization:** Admin hoặc Super Admin

**Request Body:**
```json
{
  "reason": "Vi phạm quy tắc cộng đồng nghiêm trọng",
  "ruleIds": ["rule-uuid-1", "rule-uuid-2"],
  "resolution": "Cấm vĩnh viễn do spam liên tục",
  "severity": "high"
}
```

**Request Body Fields:**
- `reason` (string, required): Lý do cấm (hiển thị cho người dùng)
- `ruleIds` (array of strings, optional): Danh sách ID quy tắc vi phạm
- `resolution` (string, optional): Ghi chú hướng giải quyết
- `severity` (string, optional): Mức độ vi phạm - `low`, `medium`, hoặc `high` (default: `medium`)

**Response Success (200):**
```json
{
  "success": true,
  "message": "Cấm người dùng thành công.",
  "user": {
    "id": "user-uuid",
    "username": "user123",
    "name": "Nguyễn Văn A",
    "email": "user@example.com",
    "is_active": false,
    "role": "user",
    "created_at": "2024-01-01T00:00:00.000Z",
    "last_login": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response Error:**
- `400`: Thiếu thông tin bắt buộc
- `404`: Người dùng không tồn tại hoặc đã bị cấm
- `500`: Lỗi server

**Backend Actions:**
1. ✅ Validate admin permissions
2. ✅ Kiểm tra user tồn tại
3. ✅ Cập nhật `users.is_active = false`
4. ✅ Gửi thông báo cho người dùng (type: system)
5. ✅ Trả về user đã cập nhật

**Note:** Không tạo violation record cho ban user vì constraint của bảng Violations chỉ hỗ trợ target_type là 'post' hoặc 'comment'.

---

### 2. Unban User (Bỏ cấm người dùng)

**Endpoint:** `POST /api/admin/users/:userId/unban`

**Mô tả:** Bỏ cấm một người dùng bằng cách đặt `is_active = true`. API này sẽ gửi thông báo cho người dùng và ghi log admin.

**Authorization:** Admin hoặc Super Admin

**Request Body:**
```json
{
  "reason": "Đã xem xét lại và quyết định bỏ cấm"
}
```

**Request Body Fields:**
- `reason` (string, required): Lý do bỏ cấm

**Response Success (200):**
```json
{
  "success": true,
  "message": "Bỏ cấm người dùng thành công.",
  "user": {
    "id": "user-uuid",
    "username": "user123",
    "name": "Nguyễn Văn A",
    "email": "user@example.com",
    "is_active": true,
    "role": "user",
    "created_at": "2024-01-01T00:00:00.000Z",
    "last_login": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response Error:**
- `400`: Thiếu lý do bỏ cấm
- `404`: Người dùng không tồn tại hoặc chưa bị cấm
- `500`: Lỗi server

**Backend Actions:**
1. ✅ Validate admin permissions
2. ✅ Kiểm tra user tồn tại và đang bị cấm
3. ✅ Cập nhật `users.is_active = true`
4. ✅ Gửi thông báo cho người dùng
5. ✅ Trả về user đã cập nhật

---

## 📋 Comment Moderation APIs

### 1. Remove Comment (Gỡ bình luận)

**Endpoint:** `POST /api/community/comments/:commentId/remove`

**Mô tả:** Gỡ một bình luận bằng cách đặt `deleted_at`, `deleted_by`, `deleted_reason`. API này sẽ tạo bản ghi vi phạm, gửi thông báo cho người dùng và ghi log admin.

**Authorization:** Admin hoặc Super Admin

**Request Body:**
```json
{
  "reason": "Nội dung không phù hợp với quy tắc cộng đồng",
  "ruleIds": ["rule-uuid-1", "rule-uuid-2"],
  "resolution": "Cảnh cáo lần 1",
  "severity": "medium"
}
```

**Request Body Fields:**
- `reason` (string, required): Lý do gỡ (hiển thị cho người dùng)
- `ruleIds` (array of strings, required): Danh sách ID quy tắc vi phạm
- `severity` (string, required): Mức độ vi phạm - `low`, `medium`, hoặc `high`
- `resolution` (string, optional): Ghi chú hướng giải quyết

**Response Success (200):**
```json
{
  "success": true,
  "message": "Gỡ bình luận thành công.",
  "comment": {
    "id": "comment-uuid",
    "post_id": "post-uuid",
    "user_id": "user-uuid",
    "content": {
      "html": "Nội dung bình luận..."
    },
    "deleted_at": "2024-01-15T10:30:00.000Z",
    "deleted_by": "admin-uuid",
    "deleted_reason": "Nội dung không phù hợp với quy tắc cộng đồng",
    "created_at": "2024-01-15T09:00:00.000Z",
    "user": {
      "id": "user-uuid",
      "name": "Nguyễn Văn A",
      "avatar_url": "https://..."
    }
  }
}
```

**Response Error:**
- `400`: Thiếu thông tin bắt buộc
- `404`: Bình luận không tồn tại hoặc đã bị gỡ
- `500`: Lỗi server

**Backend Actions:**
1. ✅ Validate admin permissions
2. ✅ Kiểm tra comment tồn tại
3. ✅ Cập nhật `deleted_at`, `deleted_by`, `deleted_reason`
4. ✅ Tạo record trong `violations`
5. ✅ Gửi thông báo cho người dùng
6. ✅ Trả về comment đã cập nhật

---

### 2. Restore Comment (Khôi phục bình luận)

**Endpoint:** `POST /api/community/comments/:commentId/restore`

**Mô tả:** Khôi phục một bình luận đã bị gỡ bằng cách xóa `deleted_at`, `deleted_by`, `deleted_reason`. API này sẽ gửi thông báo cho người dùng và ghi log admin.

**Authorization:** Admin hoặc Super Admin

**Request Body:**
```json
{
  "reason": "Đã xem xét lại và quyết định khôi phục"
}
```

**Request Body Fields:**
- `reason` (string, required): Lý do khôi phục

**Response Success (200):**
```json
{
  "success": true,
  "message": "Khôi phục bình luận thành công.",
  "comment": {
    "id": "comment-uuid",
    "post_id": "post-uuid",
    "user_id": "user-uuid",
    "content": {
      "html": "Nội dung bình luận..."
    },
    "deleted_at": null,
    "deleted_by": null,
    "deleted_reason": null,
    "created_at": "2024-01-15T09:00:00.000Z",
    "user": {
      "id": "user-uuid",
      "name": "Nguyễn Văn A",
      "avatar_url": "https://..."
    }
  }
}
```

**Response Error:**
- `400`: Thiếu lý do khôi phục
- `404`: Bình luận không tồn tại hoặc chưa bị gỡ
- `500`: Lỗi server

**Backend Actions:**
1. ✅ Validate admin permissions
2. ✅ Kiểm tra comment tồn tại và đang bị gỡ
3. ✅ Xóa `deleted_at`, `deleted_by`, `deleted_reason`
4. ✅ Gửi thông báo cho người dùng
5. ✅ Trả về comment đã cập nhật

---

## 📋 Post Moderation API

### Endpoint: `POST /api/community/posts/:postId/moderation`

**Mô tả:** API tổng hợp để gỡ hoặc khôi phục bài viết. API này kết hợp việc cập nhật trạng thái bài viết và tạo violation record trong một request duy nhất.

**Authorization:** Admin hoặc Super Admin

---

### Action: Remove Post

**Request Body:**
```json
{
  "action": "remove",
  "post_update": {
    "status": "removed",
    "deleted_at": "2025-11-15T10:30:00Z",
    "deleted_by": "admin-uuid",
    "deleted_reason": "Bài viết chứa spam và quảng cáo"
  },
  "violation": {
    "ruleIds": ["rule-uuid-1", "rule-uuid-2"],
    "severity": "high",
    "resolution": "Cảnh cáo lần 1",
    "reason": "Bài viết chứa spam và quảng cáo",
    "user_id": "user-uuid",
    "target_type": "post",
    "target_id": "post-uuid"
  }
}
```

**Response Success (200):**
```json
{
  "id": "post-uuid",
  "user_id": "user-uuid",
  "title": "Tiêu đề bài viết",
  "content": {
    "html": "Nội dung...",
    "text": "Nội dung...",
    "images": []
  },
  "topic": "general",
  "likes": 10,
  "views": 100,
  "created_at": "2024-01-15T09:00:00.000Z",
  "status": "removed",
  "is_pinned": false,
  "is_approved": true,
  "auto_flagged": false,
  "deleted_at": "2025-11-15T10:30:00Z",
  "deleted_by": "admin-uuid",
  "deleted_reason": "Bài viết chứa spam và quảng cáo",
  "user": {
    "id": "user-uuid",
    "name": "Nguyễn Văn A",
    "avatar_url": "https://..."
  },
  "badge": null,
  "comment_count": 5
}
```

**Backend Actions:**
1. ✅ Validate admin permissions
2. ✅ Kiểm tra post tồn tại
3. ✅ Cập nhật status, deleted_at, deleted_by, deleted_reason
4. ✅ Tạo record trong `violations`
5. ✅ Gửi thông báo cho người dùng
6. ✅ Trả về post đã cập nhật

---

### Action: Restore Post

**Request Body:**
```json
{
  "action": "restore",
  "post_update": {
    "status": "published",
    "deleted_at": null,
    "deleted_by": null,
    "deleted_reason": null
  }
}
```

**Response Success (200):**
```json
{
  "id": "post-uuid",
  "user_id": "user-uuid",
  "title": "Tiêu đề bài viết",
  "content": {
    "html": "Nội dung...",
    "text": "Nội dung...",
    "images": []
  },
  "topic": "general",
  "likes": 10,
  "views": 100,
  "created_at": "2024-01-15T09:00:00.000Z",
  "status": "published",
  "is_pinned": false,
  "is_approved": true,
  "auto_flagged": false,
  "deleted_at": null,
  "deleted_by": null,
  "deleted_reason": null,
  "user": {
    "id": "user-uuid",
    "name": "Nguyễn Văn A",
    "avatar_url": "https://..."
  },
  "badge": null,
  "comment_count": 5
}
```

**Backend Actions:**
1. ✅ Validate admin permissions
2. ✅ Kiểm tra post tồn tại
3. ✅ Cập nhật status, xóa deleted_at, deleted_by, deleted_reason
4. ✅ Gửi thông báo cho người dùng
5. ✅ Trả về post đã cập nhật

## 📧 Notification Types

Các thông báo được gửi tự động cho người dùng:

### Ban User
```json
{
  "type": "system",
  "title": "Tài khoản của bạn đã bị cấm",
  "content": { "html": "Vi phạm quy tắc cộng đồng nghiêm trọng" }
}
```

### Unban User
```json
{
  "type": "system",
  "title": "Tài khoản của bạn đã được khôi phục",
  "content": { "html": "Đã xem xét lại và quyết định bỏ cấm" }
}
```

### Remove Comment
```json
{
  "type": "community",
  "title": "Bình luận của bạn đã bị gỡ",
  "content": { "html": "Nội dung không phù hợp với quy tắc cộng đồng" }
}
```

### Restore Comment
```json
{
  "type": "community",
  "title": "Bình luận của bạn đã được khôi phục",
  "content": { "html": "Đã xem xét lại và quyết định khôi phục" }
}
```

### Remove Post
```json
{
  "type": "community",
  "title": "Bài viết của bạn đã bị gỡ",
  "content": { "html": "Bài viết chứa spam và quảng cáo" }
}
```

### Restore Post
```json
{
  "type": "community",
  "title": "Bài viết của bạn đã được khôi phục",
  "content": { "html": "Bài viết của bạn đã được xem xét lại và khôi phục." }
}
```

## 🔐 Security Notes

1. Tất cả các endpoint yêu cầu authentication với role `admin` hoặc `super admin`
2. Admin không thể ban chính mình
3. Người dùng bị ban sẽ không thể đăng nhập (is_active = false)
4. Violation records được tạo tự động để theo dõi lịch sử vi phạm
5. Tất cả hành động đều gửi thông báo tự động cho người dùng bị ảnh hưởng

## 📝 Example Usage

### Ban User Example
```bash
curl -X POST https://api.example.com/api/admin/users/user-uuid-123/ban \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Spam liên tục",
    "ruleIds": ["rule-1", "rule-2"],
    "severity": "high"
  }'
```

### Remove Comment Example
```bash
curl -X POST https://api.example.com/api/community/comments/comment-uuid-123/remove \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Ngôn từ không phù hợp",
    "ruleIds": ["rule-3"],
    "severity": "medium"
  }'
```

### Remove Post Example
```bash
curl -X POST https://api.example.com/api/community/posts/post-uuid-123/moderation \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "remove",
    "post_update": {
      "status": "removed",
      "deleted_at": "2025-11-15T10:30:00Z",
      "deleted_by": "admin-uuid",
      "deleted_reason": "Spam"
    },
    "violation": {
      "ruleIds": ["rule-1"],
      "severity": "high",
      "resolution": "Cảnh cáo",
      "reason": "Spam",
      "user_id": "user-uuid",
      "target_type": "post",
      "target_id": "post-uuid"
    }
  }'
```

### Restore Post Example
```bash
curl -X POST https://api.example.com/api/community/posts/post-uuid-123/moderation \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "restore",
    "post_update": {
      "status": "published",
      "deleted_at": null,
      "deleted_by": null,
      "deleted_reason": null
    }
  }'
```
