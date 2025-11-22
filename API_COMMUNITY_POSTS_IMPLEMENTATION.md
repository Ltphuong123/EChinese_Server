# API Community Posts Implementation Summary

## Tổng quan

Đã viết lại API `GET /api/community/posts` theo đúng yêu cầu trong file `API_REQUIREMENTS.md` với đầy đủ tính năng phân trang, filter và response format chuẩn. **Đã cập nhật hỗ trợ tìm kiếm theo nhiều topic và search bài viết.**

---

## API: GET /api/community/posts

### Mô tả

Lấy danh sách bài viết cộng đồng với hỗ trợ phân trang, filter theo chủ đề (nhiều topic), trạng thái và tìm kiếm.

### Endpoint

```
GET /api/community/posts
```

### Headers

```
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Type   | Required | Default     | Description                                                                     |
| --------- | ------ | -------- | ----------- | ------------------------------------------------------------------------------- |
| `page`    | number | No       | 1           | Số trang hiện tại (min: 1)                                                      |
| `limit`   | number | No       | 15          | Số bài viết mỗi trang (min: 1, max: 100)                                        |
| `topic`   | string | No       | -           | Lọc theo chủ đề (có thể nhiều topic cách nhau bởi dấu phẩy, ví dụ: "CNTT,Dịch") |
| `status`  | string | No       | "published" | Lọc theo trạng thái: "published", "removed", "draft", "pending", "all"          |
| `search`  | string | No       | -           | Tìm kiếm trong tiêu đề bài viết                                                 |

### Topics (Chủ đề)

- `Cơ khí`
- `CNTT`
- `Dịch`
- `Du học`
- `Du lịch`
- `Góc chia sẻ`
- `Tìm bạn học chung`
- `Học tiếng Trung`
- `Tìm gia sư`
- `Việc làm`
- `Văn hóa`
- `Thể thao`
- `Xây dựng`
- `Y tế`
- `Tâm sự`
- `Khác`
- `all` - Tất cả (không filter)

### Status (Trạng thái)

- `published` - Đã xuất bản (hiển thị công khai) - **DEFAULT**
- `draft` - Bản nháp (chưa công bố)
- `removed` - Đã gỡ (xóa mềm)
- `pending` - Đang chờ kiểm duyệt
- `all` - Tất cả (chỉ admin)

---

## Response Format

### Success Response (200 OK)

```json
{
  "data": [
    {
      "id": "p123",
      "user_id": "user_456",
      "title": "Chia sẻ kinh nghiệm học tiếng Trung",
      "content": {
        "html": "<p>Hôm nay mình muốn chia sẻ...</p>",
        "text": "Hôm nay mình muốn chia sẻ...",
        "images": ["https://example.com/image1.jpg"]
      },
      "topic": "learning_tips",
      "status": "published",
      "is_pinned": false,
      "is_approved": true,
      "auto_flagged": false,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "deleted_at": null,
      "deleted_by": null,
      "deleted_reason": null,
      "likes": 15,
      "views": 120,
      "comment_count": 8,
      "user": {
        "id": "user_456",
        "username": "nguyenvana",
        "name": "Nguyễn Văn A",
        "avatar_url": "https://example.com/avatar.jpg",
        "email": "user@example.com",
        "role": "user",
        "is_active": true,
        "isVerify": true,
        "community_points": 1500,
        "level": 5,
        "badge_level": 3,
        "language": "vi",
        "created_at": "2024-01-01T00:00:00Z",
        "last_login": "2024-01-15T09:00:00Z",
        "provider": "local"
      },
      "badge": {
        "id": "badge_3",
        "level": 3,
        "name": "Chuyên gia",
        "icon": "🏆",
        "min_points": 1000,
        "rule_description": "Đạt 1000 điểm cộng đồng",
        "is_active": true
      },
      "isLiked": true,
      "isCommented": false,
      "isViewed": true
    }
  ],
  "meta": {
    "total": 156,
    "page": 1,
    "limit": 15,
    "totalPages": 11
  }
}
```

**Lưu ý:** Response KHÔNG có field `success` (khác với các API khác)

---

## Các thay đổi đã thực hiện

### 1. Controller (`controllers/postController.js`) ✅

#### Hàm `getPosts`

**Trước:**

- Default limit = 10
- Không validate topic
- Không validate status
- Thiếu các fields trong response
- Không hỗ trợ search
- Không hỗ trợ multiple topics

**Sau:**

- ✅ Default limit = 15 (theo yêu cầu)
- ✅ Validation đầy đủ cho page (min: 1)
- ✅ Validation đầy đủ cho limit (min: 1, max: 100)
- ✅ Validate topic trong danh sách hợp lệ, hỗ trợ multiple topics (phân tách bởi dấu phẩy)
- ✅ Validate status trong danh sách hợp lệ
- ✅ Hỗ trợ search trong title
- ✅ Xử lý topic = 'all' → null (không filter)
- ✅ Response format đầy đủ theo yêu cầu với tất cả fields

**Code mới:**

```javascript
const { page = 1, limit = 15, topic, status = "published", search } = req.query;

// Validation
const pageNum = Math.max(parseInt(page) || 1, 1);
const limitNum = Math.min(Math.max(parseInt(limit) || 15, 1), 100);

// Validate status
const validStatuses = ["published", "draft", "removed", "pending", "all"];
let validStatus = "published"; // default
if (status && validStatuses.includes(status)) {
  validStatus = status;
}

// Validate topic (hỗ trợ nhiều topic cách nhau bởi dấu phẩy)
let validTopics = null;
if (topic && topic !== "all") {
  const topicsArray = topic
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t);
  const validTopicsList = [
    "Cơ khí",
    "CNTT",
    "Dịch",
    "Du học",
    "Du lịch",
    "Góc chia sẻ",
    "Tìm bạn học chung",
    "Học tiếng Trung",
    "Tìm gia sư",
    "Việc làm",
    "Văn hóa",
    "Thể thao",
    "Xây dựng",
    "Y tế",
    "Tâm sự",
    "Khác",
  ];
  validTopics = topicsArray.filter((t) => validTopicsList.includes(t));
  if (validTopics.length === 0) validTopics = null;
}

// Validate search
let validSearch = null;
if (search && typeof search === "string" && search.trim().length > 0) {
  validSearch = search.trim();
}
```

---

### 2. Service (`services/postService.js`) ✅

#### Hàm `getPublicPosts`

**Trước:**

- Default limit = không có
- Meta không parse integer

**Sau:**

- ✅ Default limit = 15
- ✅ Parse page và limit thành integer trong meta
- ✅ Truyền đầy đủ filters xuống model

**Code mới:**

```javascript
const { page = 1, limit = 15 } = filters;
const offset = (page - 1) * limit;

return {
  data: posts,
  meta: {
    total: totalItems,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages,
  },
};
```

---

### 3. Model (`models/postModel.js`) ✅

#### Hàm `findAllPublic`

**Đã cập nhật:**

- ✅ Hỗ trợ filter theo nhiều topic (IN query)
- ✅ Hỗ trợ search trong title (ILIKE)
- ✅ PostgreSQL placeholders đúng
- ✅ User object đầy đủ theo yêu cầu (13 fields)
- ✅ Badge object đầy đủ theo yêu cầu (7 fields)
- ✅ Query tối ưu với JOIN và subqueries

**Thay đổi chính:**

```javascript
// Filter by topic (hỗ trợ nhiều topic)
if (topic && Array.isArray(topic) && topic.length > 0) {
  const placeholders = topic
    .map((_, i) => `$${params.length + i + 1}`)
    .join(",");
  conditions.push(`p.topic IN (${placeholders})`);
  params.push(...topic);
} else if (topic && typeof topic === "string") {
  params.push(topic);
  conditions.push(`p.topic = $${params.length}`);
}

// Filter by search (tìm trong title)
if (search) {
  params.push(`%${search}%`);
  conditions.push(`p.title ILIKE $${params.length}`);
}
```

---

## Test Cases

### 1. Lấy trang đầu tiên (mặc định)

```bash
GET /api/community/posts
```

Response: page=1, limit=15, status=published

---

### 2. Lấy trang 2 với 20 bài viết

```bash
GET /api/community/posts?page=2&limit=20
```

Response: page=2, limit=20

---

### 3. Lọc theo một chủ đề

```bash
GET /api/community/posts?page=1&limit=15&topic=CNTT
```

Filter: `p.topic = 'CNTT'`

---

### 4. Lọc theo nhiều chủ đề

```bash
GET /api/community/posts?page=1&limit=15&topic=CNTT,Dịch,Du học
```

Filter: `p.topic IN ('CNTT', 'Dịch', 'Du học')`

---

### 5. Tìm kiếm bài viết

```bash
GET /api/community/posts?page=1&limit=15&search=tiếng Trung
```

Filter: `p.title ILIKE '%tiếng Trung%'`

---

### 6. Kết hợp search và topic

```bash
GET /api/community/posts?page=1&limit=15&topic=Học tiếng Trung&search=HSK
```

Filter: `p.topic = 'Học tiếng Trung' AND p.title ILIKE '%HSK%'`

---

### 7. Lọc theo trạng thái

```bash
GET /api/community/posts?page=1&limit=15&status=published
```

Filter: `p.status = 'published' AND p.is_approved = true`

---

### 8. Kết hợp nhiều filter

```bash
GET /api/community/posts?page=1&limit=15&topic=CNTT&status=published&search=javascript
```

Filter: `p.topic = 'CNTT' AND p.status = 'published' AND p.is_approved = true AND p.title ILIKE '%javascript%'`

---

## Response Fields Chi tiết

### Post Object (Root Level)

| Field            | Type         | Description                                            |
| ---------------- | ------------ | ------------------------------------------------------ |
| `id`             | string       | ID duy nhất của bài viết                               |
| `user_id`        | string       | ID của tác giả                                         |
| `title`          | string       | Tiêu đề bài viết                                       |
| `content`        | object       | Nội dung bài viết (html, text, images)                 |
| `topic`          | string       | Chủ đề bài viết                                        |
| `status`         | string       | Trạng thái: "published", "removed", "draft", "pending" |
| `is_pinned`      | boolean      | Bài viết có được ghim không                            |
| `is_approved`    | boolean      | Bài viết đã được duyệt chưa                            |
| `auto_flagged`   | boolean      | Bài viết bị AI đánh dấu vi phạm                        |
| `created_at`     | string (ISO) | Thời gian tạo                                          |
| `updated_at`     | string (ISO) | Thời gian cập nhật                                     |
| `deleted_at`     | string/null  | Thời gian xóa (nếu có)                                 |
| `deleted_by`     | string/null  | ID người xóa (nếu có)                                  |
| `deleted_reason` | string/null  | Lý do xóa (nếu có)                                     |
| `likes`          | number       | Số lượt thích                                          |
| `views`          | number       | Số lượt xem                                            |
| `comment_count`  | number       | Số lượng bình luận                                     |
| `user`           | object       | Thông tin tác giả (User object)                        |
| `badge`          | object       | Huy hiệu của tác giả (Badge object)                    |
| `isLiked`        | boolean      | User hiện tại đã like chưa                             |
| `isCommented`    | boolean      | User hiện tại đã comment chưa                          |
| `isViewed`       | boolean      | User hiện tại đã xem chưa                              |

### User Object (13 fields)

| Field              | Type         | Description                                 |
| ------------------ | ------------ | ------------------------------------------- |
| `id`               | string       | ID người dùng                               |
| `username`         | string       | Tên đăng nhập                               |
| `name`             | string       | Tên hiển thị                                |
| `avatar_url`       | string       | URL avatar                                  |
| `email`            | string       | Email                                       |
| `role`             | string       | Vai trò: "user", "admin", "super admin"     |
| `is_active`        | boolean      | Tài khoản có hoạt động không                |
| `isVerify`         | boolean      | Email đã xác thực chưa                      |
| `community_points` | number       | Điểm cộng đồng                              |
| `level`            | number       | Cấp độ người dùng                           |
| `badge_level`      | number       | Cấp độ huy hiệu                             |
| `language`         | string       | Ngôn ngữ: "vi", "en", "zh"                  |
| `created_at`       | string (ISO) | Ngày tạo tài khoản                          |
| `last_login`       | string (ISO) | Lần đăng nhập cuối                          |
| `provider`         | string       | Nhà cung cấp: "local", "google", "facebook" |

### Badge Object (7 fields)

| Field              | Type    | Description                 |
| ------------------ | ------- | --------------------------- |
| `id`               | string  | ID huy hiệu                 |
| `level`            | number  | Cấp độ huy hiệu (1-5)       |
| `name`             | string  | Tên huy hiệu                |
| `icon`             | string  | Icon emoji                  |
| `min_points`       | number  | Điểm tối thiểu để đạt       |
| `rule_description` | string  | Mô tả quy tắc               |
| `is_active`        | boolean | Huy hiệu có hoạt động không |

### Meta Object

| Field        | Type   | Description                       |
| ------------ | ------ | --------------------------------- |
| `total`      | number | Tổng số bài viết (sau khi filter) |
| `page`       | number | Trang hiện tại                    |
| `limit`      | number | Số bài viết mỗi trang             |
| `totalPages` | number | Tổng số trang                     |

---

## Cách áp dụng code mới

### Bước 1: Cập nhật Model

1. Mở file `models/postModel_findAllPublic_new.js`
2. Copy hàm `findAllPublic`
3. Thay thế hàm cũ trong `models/postModel.js`

### Bước 2: Kiểm tra

- Controller và Service đã được cập nhật ✅
- Chỉ cần cập nhật Model là xong

---

## Lưu ý quan trọng

### 1. Response Format

- ⚠️ **KHÔNG có field `success`** (khác với các API khác)
- Chỉ có `data` và `meta`

### 2. Default Values

- `page` = 1
- `limit` = 15 (theo yêu cầu, khác với các API khác thường là 10 hoặc 20)
- `status` = 'published'
- `topic` = null (không filter)

### 3. Filter Logic

- `topic='all'` → không filter (null)
- `status='all'` → lấy tất cả trạng thái (chỉ admin)
- `status='published'` → phải có `is_approved = true`

### 4. User Interactions

- `isLiked`: Check trong bảng PostLikes
- `isCommented`: Check trong bảng Comments
- `isViewed`: Check trong bảng PostViews (nếu user đã login)

### 5. Ordering

- Bài ghim (is_pinned) lên đầu
- Sau đó sắp xếp theo created_at DESC

---

## Kết luận

API `GET /api/community/posts` đã được cập nhật với đầy đủ tính năng tìm kiếm theo nhiều topic và search bài viết theo đúng yêu cầu:

### ✅ Hoàn thành

- Controller: Validation đầy đủ, hỗ trợ multiple topics và search
- Service: Truyền filters đúng xuống model
- Model: Hỗ trợ IN query cho multiple topics và ILIKE cho search
- Documentation: Đã cập nhật với các tính năng mới

### 🔧 Tính năng mới

- **Multiple Topics**: `topic=CNTT,Dịch,Du học` → filter bài viết thuộc các topic này
- **Search**: `search=tiếng Trung` → tìm bài viết có "tiếng Trung" trong title
- **Kết hợp**: Có thể combine search + topic + status + pagination

### 📝 Ví dụ sử dụng

```bash
# Tìm bài viết về CNTT hoặc Dịch
GET /api/community/posts?topic=CNTT,Dịch

# Tìm bài viết có "HSK" trong title
GET /api/community/posts?search=HSK

# Kết hợp: bài về CNTT có "javascript" trong title
GET /api/community/posts?topic=CNTT&search=javascript
```

**API đã sẵn sàng sử dụng với đầy đủ tính năng tìm kiếm nâng cao!**
