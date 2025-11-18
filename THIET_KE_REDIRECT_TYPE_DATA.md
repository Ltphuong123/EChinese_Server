# 🔄 Thiết Kế Hệ Thống Redirect Type & Data

## 📋 Tổng Quan

Thay vì dùng `redirect_url` dạng string phức tạp, hệ thống mới sử dụng:
- `redirect_type`: Loại điều hướng (string)
- `redirect_data`: Dữ liệu chi tiết (object)

### Lợi Ích
✅ Dễ parse và xử lý ở frontend  
✅ Type-safe, rõ ràng hơn  
✅ Dễ mở rộng thêm loại mới  
✅ Không cần parse URL phức tạp  
✅ Validate dễ dàng hơn  

---

## 🎯 Cấu Trúc Mới

### Format Cũ (Hiện Tại)
```json
{
  "redirect_url": "app://post/123#comment-456"
}
```

### Format Mới (Đề Xuất)
```json
{
  "redirect_type": "post",
  "redirect_data": {
    "post_id": "123",
    "comment_id": "456"
  }
}
```

---

## 📱 Danh Sách Redirect Types

### 1. `home` - Trang Chủ
**Mô tả:** Điều hướng về trang chủ của app

**Redirect Data:**
```json
{
  "redirect_type": "home",
  "redirect_data": {}
}
```

**Use Cases:**
- Chào mừng user mới
- Thông báo chung không cần điều hướng cụ thể

**Ví dụ thông báo:**
```json
{
  "type": "system",
  "title": "🎉 Chào mừng bạn đến với Hán Tự!",
  "content": {
    "message": "Cảm ơn bạn đã đăng ký. Hãy bắt đầu hành trình học tiếng Trung!"
  },
  "redirect_type": "home",
  "redirect_data": {}
}
```

---

### 2. `post` - Bài Viết
**Mô tả:** Điều hướng đến một bài viết cụ thể

**Redirect Data:**
```json
{
  "redirect_type": "post",
  "redirect_data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001"
  }
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `post_id` | string (uuid) | ✅ Yes | ID của bài viết |

**Use Cases:**
- Ai đó like bài viết
- Bài viết được duyệt
- Bài viết bị từ chối
- Bài viết được featured

**Ví dụ thông báo:**
```json
{
  "type": "community",
  "title": "❤️ Ai đó đã thích bài viết của bạn",
  "content": {
    "message": "John Doe đã thích bài viết \"Cách học tiếng Trung hiệu quả\""
  },
  "redirect_type": "post",
  "redirect_data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001"
  },
  "data": {
    "liker_id": "770e8400-e29b-41d4-a716-446655440002",
    "liker_name": "John Doe"
  }
}
```

---

### 3. `post_comment` - Bài Viết + Bình Luận
**Mô tả:** Điều hướng đến một bình luận cụ thể trong bài viết

**Redirect Data:**
```json
{
  "redirect_type": "post_comment",
  "redirect_data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
    "comment_id": "880e8400-e29b-41d4-a716-446655440003"
  }
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `post_id` | string (uuid) | ✅ Yes | ID của bài viết |
| `comment_id` | string (uuid) | ✅ Yes | ID của bình luận |

**Use Cases:**
- Ai đó comment bài viết
- Ai đó reply comment của bạn
- Comment được like
- Comment được mention

**Ví dụ thông báo:**
```json
{
  "type": "community",
  "title": "💬 Bình luận mới",
  "content": {
    "message": "Jane Smith đã bình luận: \"Bài viết rất hay!\""
  },
  "redirect_type": "post_comment",
  "redirect_data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
    "comment_id": "880e8400-e29b-41d4-a716-446655440003"
  },
  "data": {
    "commenter_id": "990e8400-e29b-41d4-a716-446655440004",
    "commenter_name": "Jane Smith"
  }
}
```

---

### 4. `profile` - Trang Cá Nhân
**Mô tả:** Điều hướng đến trang profile của một user

**Redirect Data:**
```json
{
  "redirect_type": "profile",
  "redirect_data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | string (uuid) | ✅ Yes | ID của user |

**Use Cases:**
- Ai đó follow bạn
- Ai đó mention bạn
- User mới đăng ký (admin xem)

**Ví dụ thông báo:**
```json
{
  "type": "community",
  "title": "👤 Người theo dõi mới",
  "content": {
    "message": "Alex Nguyen đã bắt đầu theo dõi bạn"
  },
  "redirect_type": "profile",
  "redirect_data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "data": {
    "follower_name": "Alex Nguyen",
    "follower_avatar": "https://..."
  }
}
```

---

### 5. `lesson` - Bài Học
**Mô tả:** Điều hướng đến một bài học cụ thể

**Redirect Data:**
```json
{
  "redirect_type": "lesson",
  "redirect_data": {
    "lesson_id": "lesson-hsk1-01"
  }
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lesson_id` | string | ✅ Yes | ID của bài học |

**Use Cases:**
- Nhắc nhở học bài
- Bài học mới được thêm
- Hoàn thành bài học

**Ví dụ thông báo:**
```json
{
  "type": "system",
  "title": "📚 Đã đến giờ học rồi!",
  "content": {
    "message": "Bạn chưa học bài HSK 1 - Bài 1 hôm nay"
  },
  "redirect_type": "lesson",
  "redirect_data": {
    "lesson_id": "lesson-hsk1-01"
  }
}
```

---

### 6. `exam` - Bài Thi
**Mô tả:** Điều hướng đến một bài thi hoặc kết quả thi

**Redirect Data:**
```json
{
  "redirect_type": "exam",
  "redirect_data": {
    "exam_id": "exam-hsk3-final",
    "attempt_id": "attempt-123"
  }
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `exam_id` | string | ✅ Yes | ID của bài thi |
| `attempt_id` | string | ❌ No | ID của lần thi (nếu xem kết quả) |

**Use Cases:**
- Kết quả thi đã có
- Nhắc nhở làm bài thi
- Bài thi mới

**Ví dụ thông báo:**
```json
{
  "type": "system",
  "title": "🎯 Kết quả thi đã có!",
  "content": {
    "message": "Bạn đã đạt 85/100 điểm trong bài thi HSK 3"
  },
  "redirect_type": "exam",
  "redirect_data": {
    "exam_id": "exam-hsk3-final",
    "attempt_id": "attempt-123"
  },
  "data": {
    "score": "85",
    "total": "100",
    "passed": "true"
  }
}
```

---

### 7. `vocabulary` - Từ Vựng
**Mô tả:** Điều hướng đến danh sách từ vựng hoặc một từ cụ thể

**Redirect Data:**
```json
{
  "redirect_type": "vocabulary",
  "redirect_data": {
    "level": "hsk3",
    "word_id": "word-123"
  }
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `level` | string | ❌ No | Cấp độ HSK (hsk1, hsk2, ...) |
| `word_id` | string | ❌ No | ID của từ cụ thể |

**Use Cases:**
- Từ vựng mới được thêm
- Ôn tập từ vựng
- Cập nhật HSK mới

**Ví dụ thông báo:**
```json
{
  "type": "system",
  "title": "🎉 Từ vựng HSK 3.0 đã có!",
  "content": {
    "message": "Chúng tôi vừa cập nhật bộ từ vựng HSK 3.0 mới nhất"
  },
  "redirect_type": "vocabulary",
  "redirect_data": {
    "level": "hsk3"
  }
}
```

---

### 8. `achievement` - Thành Tích
**Mô tả:** Điều hướng đến trang thành tích hoặc một thành tích cụ thể

**Redirect Data:**
```json
{
  "redirect_type": "achievement",
  "redirect_data": {
    "achievement_id": "hsk3-master"
  }
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `achievement_id` | string | ❌ No | ID của thành tích (nếu có) |

**Use Cases:**
- Đạt thành tích mới
- Lên cấp độ mới
- Hoàn thành milestone

**Ví dụ thông báo:**
```json
{
  "type": "system",
  "title": "🏆 Chúc mừng! Thành tích mới",
  "content": {
    "message": "Bạn đã đạt thành tích \"HSK 3 Master\""
  },
  "redirect_type": "achievement",
  "redirect_data": {
    "achievement_id": "hsk3-master"
  },
  "data": {
    "achievement_name": "HSK 3 Master",
    "achievement_icon": "🏆"
  }
}
```

---

### 9. `notification_list` - Danh Sách Thông Báo
**Mô tả:** Điều hướng đến trang danh sách thông báo

**Redirect Data:**
```json
{
  "redirect_type": "notification_list",
  "redirect_data": {}
}
```

**Use Cases:**
- Có nhiều thông báo mới
- Tổng hợp thông báo

**Ví dụ thông báo:**
```json
{
  "type": "system",
  "title": "📬 Bạn có 5 thông báo mới",
  "content": {
    "message": "Nhấn để xem tất cả thông báo"
  },
  "redirect_type": "notification_list",
  "redirect_data": {}
}
```

---

### 10. `settings` - Cài Đặt
**Mô tả:** Điều hướng đến trang cài đặt

**Redirect Data:**
```json
{
  "redirect_type": "settings",
  "redirect_data": {
    "section": "notifications"
  }
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `section` | string | ❌ No | Phần cài đặt cụ thể |

**Section Values:**
- `notifications` - Cài đặt thông báo
- `account` - Tài khoản
- `privacy` - Quyền riêng tư
- `language` - Ngôn ngữ

**Use Cases:**
- Yêu cầu cập nhật thông tin
- Bật thông báo
- Xác thực tài khoản

**Ví dụ thông báo:**
```json
{
  "type": "system",
  "title": "⚙️ Vui lòng cập nhật thông tin",
  "content": {
    "message": "Hãy hoàn thiện hồ sơ để trải nghiệm tốt hơn"
  },
  "redirect_type": "settings",
  "redirect_data": {
    "section": "account"
  }
}
```

---

### 11. `community_rules` - Quy Định Cộng Đồng
**Mô tả:** Điều hướng đến trang quy định cộng đồng

**Redirect Data:**
```json
{
  "redirect_type": "community_rules",
  "redirect_data": {}
}
```

**Use Cases:**
- Cảnh báo vi phạm
- Cấm bình luận
- Thông báo quy định mới

**Ví dụ thông báo:**
```json
{
  "type": "comment_ban",
  "title": "⚠️ Bạn đã bị cấm bình luận",
  "content": {
    "message": "Bình luận của bạn vi phạm quy định. Bạn bị cấm 24 giờ."
  },
  "redirect_type": "community_rules",
  "redirect_data": {},
  "expires_at": "2024-01-16T12:00:00Z"
}
```

---

### 12. `maintenance` - Bảo Trì
**Mô tả:** Điều hướng đến trang thông tin bảo trì

**Redirect Data:**
```json
{
  "redirect_type": "maintenance",
  "redirect_data": {
    "scheduled_at": "2024-01-20T02:00:00Z",
    "duration_minutes": "30"
  }
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scheduled_at` | string (ISO) | ❌ No | Thời gian bảo trì |
| `duration_minutes` | string | ❌ No | Thời lượng (phút) |

**Use Cases:**
- Thông báo bảo trì sắp tới
- Đang bảo trì
- Hoàn thành bảo trì

**Ví dụ thông báo:**
```json
{
  "type": "system",
  "title": "⚠️ Thông báo bảo trì hệ thống",
  "content": {
    "message": "Hệ thống sẽ bảo trì vào 2h sáng ngày 20/01. Thời gian: 30 phút."
  },
  "redirect_type": "maintenance",
  "redirect_data": {
    "scheduled_at": "2024-01-20T02:00:00Z",
    "duration_minutes": "30"
  },
  "priority": 3,
  "expires_at": "2024-01-20T03:00:00Z"
}
```

---

### 13. `external_url` - URL Ngoài
**Mô tả:** Điều hướng đến một URL bên ngoài (web)

**Redirect Data:**
```json
{
  "redirect_type": "external_url",
  "redirect_data": {
    "url": "https://hantu.edu.vn/blog/hsk-guide"
  }
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string (URL) | ✅ Yes | URL đầy đủ |

**Use Cases:**
- Link đến blog
- Link đến tài liệu
- Link đến khuyến mãi

**Ví dụ thông báo:**
```json
{
  "type": "system",
  "title": "📖 Hướng dẫn thi HSK mới",
  "content": {
    "message": "Xem hướng dẫn chi tiết về kỳ thi HSK 2024"
  },
  "redirect_type": "external_url",
  "redirect_data": {
    "url": "https://hantu.edu.vn/blog/hsk-2024-guide"
  }
}
```

---

### 14. `none` - Không Điều Hướng
**Mô tả:** Thông báo chỉ để đọc, không cần điều hướng

**Redirect Data:**
```json
{
  "redirect_type": "none",
  "redirect_data": {}
}
```

**Use Cases:**
- Thông báo thông tin chung
- Chúc mừng
- Cảm ơn

**Ví dụ thông báo:**
```json
{
  "type": "system",
  "title": "🎉 Chúc mừng năm mới!",
  "content": {
    "message": "Chúc bạn một năm mới tràn đầy năng lượng và thành công!"
  },
  "redirect_type": "none",
  "redirect_data": {}
}
```

---

## 📊 Bảng Tổng Hợp Redirect Types

| Redirect Type | Required Fields | Optional Fields | Use Cases |
|---------------|----------------|-----------------|-----------|
| `home` | - | - | Chào mừng, thông báo chung |
| `post` | `post_id` | - | Like, duyệt bài, featured |
| `post_comment` | `post_id`, `comment_id` | - | Comment, reply, mention |
| `profile` | `user_id` | - | Follow, mention |
| `lesson` | `lesson_id` | - | Nhắc học, bài mới |
| `exam` | `exam_id` | `attempt_id` | Kết quả thi, nhắc thi |
| `vocabulary` | - | `level`, `word_id` | Từ mới, ôn tập |
| `achievement` | - | `achievement_id` | Thành tích, lên cấp |
| `notification_list` | - | - | Nhiều thông báo |
| `settings` | - | `section` | Cập nhật thông tin |
| `community_rules` | - | - | Vi phạm, cảnh báo |
| `maintenance` | - | `scheduled_at`, `duration_minutes` | Bảo trì |
| `external_url` | `url` | - | Link ngoài |
| `none` | - | - | Chỉ đọc |

---

## 🔄 Migration Plan

### Bước 1: Thêm Fields Mới (Backward Compatible)
```sql
ALTER TABLE notifications 
ADD COLUMN redirect_type VARCHAR(50),
ADD COLUMN redirect_data JSONB DEFAULT '{}';
```

### Bước 2: Migrate Dữ Liệu Cũ
```javascript
// Script migrate redirect_url -> redirect_type + redirect_data
const migrateRedirectUrl = (redirect_url) => {
  if (!redirect_url) {
    return { redirect_type: 'none', redirect_data: {} };
  }

  // Parse app://post/123
  if (redirect_url.startsWith('app://post/')) {
    const parts = redirect_url.replace('app://post/', '').split('#comment-');
    if (parts.length === 2) {
      return {
        redirect_type: 'post_comment',
        redirect_data: {
          post_id: parts[0],
          comment_id: parts[1]
        }
      };
    }
    return {
      redirect_type: 'post',
      redirect_data: { post_id: parts[0] }
    };
  }

  // Parse app://home
  if (redirect_url === 'app://home') {
    return { redirect_type: 'home', redirect_data: {} };
  }

  // ... các trường hợp khác
};
```

### Bước 3: Update Backend Code
```javascript
// Thay vì:
redirect_url: `app://post/${postId}#comment-${commentId}`

// Dùng:
redirect_type: 'post_comment',
redirect_data: {
  post_id: postId,
  comment_id: commentId
}
```

### Bước 4: Update Frontend Code
```javascript
// Thay vì parse URL:
const parseRedirectUrl = (url) => {
  // Complex parsing logic...
};

// Dùng switch case đơn giản:
const handleRedirect = (notification) => {
  const { redirect_type, redirect_data } = notification;
  
  switch (redirect_type) {
    case 'post':
      navigate(`/posts/${redirect_data.post_id}`);
      break;
    case 'post_comment':
      navigate(`/posts/${redirect_data.post_id}`, {
        state: { scrollToComment: redirect_data.comment_id }
      });
      break;
    case 'profile':
      navigate(`/profile/${redirect_data.user_id}`);
      break;
    // ... các case khác
  }
};
```

### Bước 5: Deprecate redirect_url (Sau 1-2 tháng)
```sql
ALTER TABLE notifications DROP COLUMN redirect_url;
```

---

## 💡 Best Practices

### 1. Validation
```javascript
const validateRedirectData = (redirect_type, redirect_data) => {
  const schemas = {
    post: ['post_id'],
    post_comment: ['post_id', 'comment_id'],
    profile: ['user_id'],
    lesson: ['lesson_id'],
    exam: ['exam_id'],
    external_url: ['url']
  };

  const required = schemas[redirect_type] || [];
  for (const field of required) {
    if (!redirect_data[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
};
```

### 2. Type Safety (TypeScript)
```typescript
type RedirectType = 
  | 'home'
  | 'post'
  | 'post_comment'
  | 'profile'
  | 'lesson'
  | 'exam'
  | 'vocabulary'
  | 'achievement'
  | 'notification_list'
  | 'settings'
  | 'community_rules'
  | 'maintenance'
  | 'external_url'
  | 'none';

interface RedirectData {
  post_id?: string;
  comment_id?: string;
  user_id?: string;
  lesson_id?: string;
  exam_id?: string;
  attempt_id?: string;
  level?: string;
  word_id?: string;
  achievement_id?: string;
  section?: string;
  scheduled_at?: string;
  duration_minutes?: string;
  url?: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  content: { message: string };
  redirect_type: RedirectType;
  redirect_data: RedirectData;
  // ... other fields
}
```

### 3. Default Values
```javascript
// Nếu không có redirect, dùng 'none'
const notification = {
  // ...
  redirect_type: redirect_type || 'none',
  redirect_data: redirect_data || {}
};
```

---

## 🧪 Testing

### Test Cases
```javascript
describe('Redirect Type & Data', () => {
  test('post redirect', () => {
    const notif = {
      redirect_type: 'post',
      redirect_data: { post_id: '123' }
    };
    expect(getNavigationPath(notif)).toBe('/posts/123');
  });

  test('post_comment redirect', () => {
    const notif = {
      redirect_type: 'post_comment',
      redirect_data: { post_id: '123', comment_id: '456' }
    };
    const path = getNavigationPath(notif);
    expect(path).toContain('/posts/123');
    expect(path).toContain('comment-456');
  });

  test('none redirect', () => {
    const notif = {
      redirect_type: 'none',
      redirect_data: {}
    };
    expect(getNavigationPath(notif)).toBeNull();
  });
});
```

---

## ✅ Checklist Implementation

### Backend:
- [ ] Thêm columns `redirect_type` và `redirect_data`
- [ ] Update API create notification
- [ ] Validate redirect_type và redirect_data
- [ ] Migrate dữ liệu cũ
- [ ] Update documentation

### Frontend:
- [ ] Implement navigation handler
- [ ] Handle tất cả redirect types
- [ ] Test navigation
- [ ] Update UI components
- [ ] Error handling

---

## 🎯 Tóm Tắt

**Format Mới:**
```json
{
  "redirect_type": "post_comment",
  "redirect_data": {
    "post_id": "123",
    "comment_id": "456"
  }
}
```

**Lợi ích:**
- ✅ Rõ ràng, dễ hiểu
- ✅ Type-safe
- ✅ Dễ validate
- ✅ Dễ mở rộng
- ✅ Không cần parse URL

**14 Redirect Types được hỗ trợ:**
1. `home` - Trang chủ
2. `post` - Bài viết
3. `post_comment` - Bài viết + comment
4. `profile` - Trang cá nhân
5. `lesson` - Bài học
6. `exam` - Bài thi
7. `vocabulary` - Từ vựng
8. `achievement` - Thành tích
9. `notification_list` - Danh sách thông báo
10. `settings` - Cài đặt
11. `community_rules`