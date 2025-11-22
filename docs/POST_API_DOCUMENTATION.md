# Tài liệu API - Chức năng Post (Bài viết)

## Tổng quan
API quản lý bài viết trong cộng đồng, bao gồm các chức năng tạo, đọc, cập nhật, xóa bài viết, tương tác (like, view), và kiểm duyệt.

## Base URL
```
/community/posts
```

## Authentication
Hầu hết các endpoint yêu cầu xác thực bằng JWT token trong header:
```
Authorization: Bearer <token>
```

---

## 📋 Danh sách Endpoints

### 1. Lấy danh sách bài viết
**GET** `/community/posts`

Lấy danh sách bài viết công khai với phân trang và bộ lọc.

#### Headers
- `Authorization: Bearer <token>` (required)

#### Query Parameters
| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `page` | integer | 1 | Số trang |
| `limit` | integer | 10 | Số bài viết mỗi trang |
| `topic` | string | - | Lọc theo chủ đề |
| `status` | string | published | Trạng thái bài viết (`published`, `removed`, `all`) |

#### Response Success (200)
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "Tiêu đề bài viết",
      "content": {
        "html": "<p>Nội dung HTML</p>",
        "text": "Nội dung text thuần",
        "images": ["url1", "url2"]
      },
      "topic": "grammar",
      "likes": 10,
      "views": 50,
      "created_at": "2024-01-01T00:00:00.000Z",
      "status": "published",
      "is_pinned": false,
      "is_approved": true,
      "auto_flagged": false,
      "user": {
        "id": "uuid",
        "name": "Tên người dùng",
        "avatar_url": "url",
        "badge_level": 1,
        "community_points": 100,
        "level": 5,
        "role": "user"
      },
      "badge": {
        "level": 1,
        "name": "Đồng",
        "icon": "icon_url"
      },
      "comment_count": 5,
      "isLiked": true,
      "isCommented": false,
      "isViewed": true
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

### 2. Lấy chi tiết bài viết
**GET** `/community/posts/:postId`

Lấy thông tin chi tiết của một bài viết.

#### Headers
- `Authorization: Bearer <token>` (required)

#### URL Parameters
- `postId` (uuid, required): ID của bài viết

#### Response Success (200)
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Tiêu đề bài viết",
  "content": {
    "html": "<p>Nội dung HTML</p>",
    "text": "Nội dung text thuần",
    "images": ["url1", "url2"]
  },
  "topic": "grammar",
  "likes": 10,
  "views": 50,
  "created_at": "2024-01-01T00:00:00.000Z",
  "status": "published",
  "is_pinned": false,
  "is_approved": true,
  "auto_flagged": false,
  "user": { /* thông tin user */ },
  "badge": { /* thông tin badge */ },
  "comment_count": 5,
  "isLiked": false,
  "isCommented": false,
  "isViewed": false
}
```

#### Response Error (404)
```json
{
  "success": false,
  "message": "Bài viết không tồn tại."
}
```

---

### 3. Tạo bài viết mới
**POST** `/community/posts`

Tạo một bài viết mới trong cộng đồng.

#### Headers
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

#### Request Body
```json
{
  "title": "Tiêu đề bài viết",
  "content": {
    "html": "<p>Nội dung HTML</p>",
    "text": "Nội dung text thuần",
    "images": ["url1", "url2"]
  },
  "topic": "grammar"
}
```

**Hoặc content dạng string:**
```json
{
  "title": "Tiêu đề bài viết",
  "content": "<p>Nội dung HTML</p>",
  "topic": "grammar"
}
```

#### Validation
- `title` (required): Tiêu đề bài viết
- `content` (required): Nội dung bài viết (string hoặc object)
- `topic` (required): Chủ đề bài viết

#### Response Success (201)
```json
{
  "success": true,
  "message": "Tạo bài viết thành công.",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "title": "Tiêu đề bài viết",
    "content": {
      "html": "<p>Nội dung HTML</p>",
      "text": "Nội dung text thuần",
      "images": []
    },
    "topic": "grammar",
    "is_pinned": false,
    "status": "published",
    "is_approved": true,
    "auto_flagged": false,
    "created_at": "2024-01-01T00:00:00.000Z",
    "likes": 0,
    "views": 0
  }
}
```

#### Lưu ý
- Bài viết sẽ được tự động kiểm duyệt bằng AI sau khi tạo
- Nếu AI phát hiện vi phạm, bài viết sẽ bị gỡ tự động và gửi thông báo cho người dùng

---

### 4. Cập nhật bài viết
**PUT** `/community/posts/:postId`

Cập nhật thông tin bài viết (chỉ chủ bài viết mới có quyền).

#### Headers
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

#### URL Parameters
- `postId` (uuid, required): ID của bài viết

#### Request Body
```json
{
  "title": "Tiêu đề mới",
  "content": {
    "html": "<p>Nội dung mới</p>",
    "text": "Nội dung text mới",
    "images": ["url1"]
  },
  "topic": "vocabulary"
}
```

#### Allowed Fields
Chỉ cho phép cập nhật các trường: `title`, `content`, `topic`

#### Response Success (200)
```json
{
  "success": true,
  "message": "Cập nhật bài viết thành công.",
  "data": { /* thông tin bài viết đã cập nhật */ }
}
```

#### Response Error (404)
```json
{
  "success": false,
  "message": "Bài viết không tồn tại hoặc bạn không có quyền chỉnh sửa."
}
```

---

### 5. Like/Unlike bài viết
**POST** `/community/posts/:postId/like`

Toggle trạng thái like của bài viết.

#### Headers
- `Authorization: Bearer <token>` (required)

#### URL Parameters
- `postId` (uuid, required): ID của bài viết

#### Response Success (200)
```json
{
  "success": true,
  "message": "Đã thích bài viết.",
  "data": {
    "action": "liked",
    "likes": 11
  }
}
```

**Hoặc khi unlike:**
```json
{
  "success": true,
  "message": "Đã bỏ thích bài viết.",
  "data": {
    "action": "unliked",
    "likes": 10
  }
}
```

#### Lưu ý
- Khi like, hệ thống sẽ gửi thông báo cho chủ bài viết (trừ khi tự like)
- Thông báo bao gồm thông tin người like và preview bài viết

---

### 6. Ghi nhận lượt xem
**POST** `/community/posts/:postId/view`

Ghi nhận một lượt xem bài viết.

#### Headers
- `Authorization: Bearer <token>` (required)

#### URL Parameters
- `postId` (uuid, required): ID của bài viết

#### Response Success (200)
```json
{
  "success": true,
  "message": "Ghi nhận lượt xem thành công.",
  "data": {
    "views": 51
  }
}
```

---

### 7. Lấy danh sách người xem
**GET** `/community/posts/:postId/views`

Lấy danh sách người dùng đã xem bài viết.

#### Query Parameters
| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `page` | integer | 1 | Số trang |
| `limit` | integer | 10 | Số người dùng mỗi trang |

#### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy danh sách người xem thành công.",
  "data": {
    "data": [
      {
        "user_id": "uuid",
        "name": "Tên người dùng",
        "avatar_url": "url",
        "level": 5,
        "badge_level_id": 1,
        "badge_name": "Đồng",
        "badge_icon": "icon_url",
        "views_count": 3,
        "last_viewed_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "meta": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

---

### 8. Lấy danh sách người thích
**GET** `/community/posts/:postId/likes`

Lấy danh sách người dùng đã thích bài viết.

#### Query Parameters
| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `page` | integer | 1 | Số trang |
| `limit` | integer | 10 | Số người dùng mỗi trang |

#### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy danh sách người thích thành công.",
  "data": {
    "data": [
      {
        "user_id": "uuid",
        "name": "Tên người dùng",
        "avatar_url": "url",
        "level": 5,
        "badge_level_id": 1,
        "badge_name": "Đồng",
        "badge_icon": "icon_url"
      }
    ],
    "meta": {
      "total": 10,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 9. Gỡ bài viết (Soft Delete)
**DELETE** `/community/posts/:postId`

Gỡ bài viết (xóa mềm). Chủ bài viết hoặc admin có quyền thực hiện.

#### Headers
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

#### URL Parameters
- `postId` (uuid, required): ID của bài viết

#### Request Body (Optional)
```json
{
  "reason": "Lý do gỡ bài"
}
```

#### Response Success (200)
```json
{
  "success": true,
  "message": "Gỡ bài viết thành công."
}
```

#### Response Error (403)
```json
{
  "success": false,
  "message": "Bạn không có quyền gỡ bài viết này."
}
```

#### Lưu ý
- Nếu admin gỡ bài của người khác, hành động sẽ được ghi log
- Bài viết bị gỡ sẽ có `status = "removed"` và `deleted_at` được set

---

### 10. Khôi phục bài viết (Admin)
**PUT** `/community/posts/:postId/restore`

Khôi phục bài viết đã bị gỡ. Chỉ admin/super admin có quyền.

#### Headers
- `Authorization: Bearer <token>` (required)
- Role: `admin` hoặc `super admin`

#### URL Parameters
- `postId` (uuid, required): ID của bài viết

#### Response Success (200)
```json
{
  "success": true,
  "message": "Khôi phục bài viết thành công."
}
```

---

### 11. Kiểm duyệt bài viết (Admin)
**POST** `/community/posts/:postId/moderation`

Thực hiện hành động kiểm duyệt (gỡ hoặc khôi phục) với ghi log vi phạm.

#### Headers
- `Authorization: Bearer <token>` (required)
- Role: `admin` hoặc `super admin`

#### URL Parameters
- `postId` (uuid, required): ID của bài viết

#### Request Body - Gỡ bài viết
```json
{
  "action": "remove",
  "post_update": {
    "status": "removed",
    "deleted_at": "2024-01-01T00:00:00.000Z",
    "deleted_by": "admin_uuid",
    "deleted_reason": "Vi phạm quy định cộng đồng"
  },
  "violation": {
    "user_id": "uuid",
    "target_type": "post",
    "target_id": "post_uuid",
    "severity": "high",
    "ruleIds": ["rule_uuid_1", "rule_uuid_2"],
    "reason": "Nội dung không phù hợp",
    "resolution": "Đã gỡ bài viết"
  }
}
```

#### Request Body - Khôi phục bài viết
```json
{
  "action": "restore",
  "post_update": {
    "status": "published"
  },
  "restore_reason": "Bài viết đã được xem xét lại và không vi phạm"
}
```

#### Response Success (200)
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Tiêu đề bài viết",
  "content": { /* ... */ },
  "status": "removed",
  "deleted_at": "2024-01-01T00:00:00.000Z",
  "deleted_by": "admin_uuid",
  "deleted_reason": "Vi phạm quy định cộng đồng",
  /* ... các trường khác ... */
}
```

#### Lưu ý về Moderation
- **Khi gỡ bài (action: remove):**
  - Cập nhật trạng thái bài viết
  - Tạo bản ghi vi phạm trong hệ thống
  - Gửi thông báo chi tiết cho người dùng bao gồm:
    - Lý do vi phạm
    - Mức độ nghiêm trọng
    - Danh sách quy tắc bị vi phạm
    - Preview nội dung bài viết
  - **Không** tạo vi phạm nếu người dùng tự gỡ bài

- **Khi khôi phục bài (action: restore):**
  - Cập nhật trạng thái về `published`
  - Xóa tất cả vi phạm liên quan đến bài viết
  - Gửi thông báo khôi phục cho người dùng với lý do
  - **Chỉ** gửi thông báo nếu admin khôi phục bài của người khác

---

### 12. ⚠️ Xóa vĩnh viễn TẤT CẢ bài đăng (Super Admin)
**DELETE** `/community/posts/all/permanent`

Xóa vĩnh viễn toàn bộ bài đăng và dữ liệu liên quan trong hệ thống.

#### ⚠️ CẢNH BÁO
- Thao tác này CỰC KỲ NGUY HIỂM và KHÔNG THỂ HOÀN TÁC
- Chỉ Super Admin mới có quyền thực hiện
- Yêu cầu mã xác nhận để tránh xóa nhầm

#### Headers
- `Authorization: Bearer <token>` (required)
- Role: `super admin` (bắt buộc)

#### Request Body
```json
{
  "confirmationCode": "DELETE_ALL_POSTS_PERMANENTLY"
}
```

#### Response Success (200)
```json
{
  "success": true,
  "message": "Đã xóa vĩnh viễn TẤT CẢ bài đăng và dữ liệu liên quan thành công.",
  "data": {
    "deleted": {
      "posts": 1000,
      "comments": 5000,
      "likes": 3000,
      "views": 10000,
      "reports": 50,
      "violations": 100,
      "appeals": 20,
      "moderationLogs": 200,
      "violationRules": 150
    },
    "performed_by": "admin_uuid",
    "performed_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Response Error (403)
```json
{
  "success": false,
  "message": "Chỉ Super Admin mới có quyền thực hiện thao tác này."
}
```

#### Response Error (400)
```json
{
  "success": false,
  "message": "Mã xác nhận không đúng. Thao tác bị hủy."
}
```

#### Dữ liệu bị xóa
Thao tác này sẽ xóa vĩnh viễn:
1. ViolationRules (liên kết vi phạm-quy tắc)
2. Appeals (khiếu nại)
3. Violations (vi phạm)
4. Reports (báo cáo)
5. ModerationLogs (log kiểm duyệt)
6. Comments (bình luận)
7. PostLikes (lượt thích)
8. PostViews (lượt xem)
9. Posts (bài viết)

---

## 🔐 Phân quyền

### User (Người dùng thường)
- ✅ Xem danh sách bài viết công khai
- ✅ Xem chi tiết bài viết
- ✅ Tạo bài viết mới
- ✅ Cập nhật bài viết của mình
- ✅ Gỡ bài viết của mình
- ✅ Like/Unlike bài viết
- ✅ Ghi nhận lượt xem
- ✅ Xem danh sách người xem/thích

### Admin
- ✅ Tất cả quyền của User
- ✅ Gỡ bất kỳ bài viết nào
- ✅ Khôi phục bài viết đã gỡ
- ✅ Thực hiện kiểm duyệt với ghi log vi phạm

### Super Admin
- ✅ Tất cả quyền của Admin
- ✅ Xóa vĩnh viễn toàn bộ bài đăng (với mã xác nhận)

---

## 📊 Cấu trúc dữ liệu

### Post Object
```typescript
{
  id: string (uuid)
  user_id: string (uuid)
  title: string
  content: {
    html: string | null
    text: string | null
    images: string[]
  }
  topic: string
  likes: number
  views: number
  created_at: string (ISO 8601)
  status: "published" | "removed" | "draft"
  is_pinned: boolean
  is_approved: boolean
  auto_flagged: boolean
  deleted_at: string | null
  deleted_by: string | null
  deleted_reason: string | null
  user: UserObject
  badge: BadgeObject
  comment_count: number
  isLiked: boolean
  isCommented: boolean
  isViewed: boolean
}
```

### User Object
```typescript
{
  id: string (uuid)
  name: string
  avatar_url: string
  badge_level: number
  community_points: number
  level: number
  role: "user" | "admin" | "super admin"
}
```

### Badge Object
```typescript
{
  level: number
  name: string
  icon: string
}
```

---

## 🤖 Tự động kiểm duyệt bằng AI

Khi tạo bài viết mới, hệ thống sẽ tự động:
1. Lưu bài viết vào database
2. Gọi AI moderation service để kiểm tra nội dung
3. Nếu phát hiện vi phạm:
   - Tự động gỡ bài viết
   - Tạo bản ghi vi phạm
   - Gửi thông báo chi tiết cho người dùng
   - Ghi log hành động

Quá trình này chạy bất đồng bộ, không ảnh hưởng đến response time của API tạo bài viết.

---

## 🔔 Hệ thống thông báo

### Thông báo khi có người like
- Gửi cho: Chủ bài viết
- Điều kiện: Người like khác với chủ bài viết
- Nội dung: Thông tin người like, preview bài viết, tổng số like

### Thông báo khi bài viết bị gỡ
- **Gỡ bởi AI:**
  - Tiêu đề: "🤖 Bài viết của bạn đã bị gỡ tự động"
  - Nội dung: Lý do vi phạm, mức độ nghiêm trọng
  
- **Gỡ bởi Admin:**
  - Tiêu đề: "⚠️ Bài viết của bạn đã bị gỡ do vi phạm"
  - Nội dung: Lý do chi tiết, danh sách quy tắc vi phạm, preview bài viết

### Thông báo khi bài viết được khôi phục
- Tiêu đề: "✅ Bài viết của bạn đã được khôi phục"
- Nội dung: Lý do khôi phục, số vi phạm đã xóa, preview bài viết

---

## ❌ Mã lỗi

| Status Code | Mô tả |
|-------------|-------|
| 200 | Thành công |
| 201 | Tạo mới thành công |
| 400 | Dữ liệu không hợp lệ |
| 403 | Không có quyền truy cập |
| 404 | Không tìm thấy tài nguyên |
| 500 | Lỗi server |

---

## 📝 Lưu ý khi sử dụng

1. **Content Format**: API hỗ trợ 2 định dạng content:
   - String: `"<p>HTML content</p>"`
   - Object: `{ html: "...", text: "...", images: [...] }`

2. **Pagination**: Tất cả endpoint trả về danh sách đều hỗ trợ phân trang với `page` và `limit`

3. **Soft Delete**: Bài viết bị gỡ không bị xóa vĩnh viễn, có thể khôi phục bởi admin

4. **Auto Moderation**: Bài viết mới sẽ được AI kiểm tra tự động, có thể bị gỡ nếu vi phạm

5. **Permissions**: Kiểm tra role của user trước khi gọi các endpoint admin

6. **Rate Limiting**: Nên implement rate limiting cho các endpoint tạo/cập nhật để tránh spam

---

## 🔗 API liên quan

- **Comment API**: Quản lý bình luận trên bài viết
- **Community Rules API**: Quản lý quy tắc cộng đồng
- **Moderation API**: Quản lý vi phạm và kiểm duyệt
- **Notification API**: Quản lý thông báo

---

## 📞 Liên hệ hỗ trợ

Nếu có vấn đề hoặc câu hỏi về API, vui lòng liên hệ team phát triển.

---

**Phiên bản tài liệu:** 1.0  
**Cập nhật lần cuối:** 2024-01-01
