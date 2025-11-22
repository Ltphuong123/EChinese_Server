# API Notifications Implementation Summary

## Tổng quan
Đã viết lại 2 API Notifications theo đúng yêu cầu trong file `API_REQUIREMENTS.md`:
1. `GET /api/admin/notifications/received` - Lấy thông báo đã nhận
2. `GET /api/admin/notifications/sent` - Lấy thông báo đã gửi

---

## 1. API: GET /api/admin/notifications/received

### Mô tả
Lấy danh sách thông báo mà admin đã nhận (bao gồm thông báo hệ thống, báo cáo, vi phạm, khiếu nại, v.v.)

### Query Parameters

| Tham số | Kiểu | Bắt buộc | Mặc định | Giá trị hợp lệ | Mô tả |
|---------|------|----------|----------|----------------|-------|
| `page` | number | Không | 1 | >= 1 | Số trang hiện tại |
| `limit` | number | Không | 15 | 1-100 | Số lượng items mỗi trang |
| `read_status` | string | Không | - | 'read', 'unread' | Lọc theo trạng thái đọc |
| `type` | string | Không | - | 'system', 'report', 'violation', 'appeal', 'subscription', 'community', 'achievement', 'reminder', 'feedback' | Lọc theo loại thông báo |

### Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": "notif_123",
      "title": "Báo cáo mới cần xử lý",
      "content": {
        "message": "Có 5 báo cáo mới đang chờ xử lý",
        "html": "<p>Có <strong>5 báo cáo mới</strong> đang chờ xử lý</p>"
      },
      "type": "report",
      "audience": "admin",
      "from_system": true,
      "priority": 1,
      "read_at": null,
      "created_at": "2025-11-22T12:00:00Z",
      "related_type": "report",
      "related_id": "report_456",
      "data": {
        "count": 5,
        "redirect_url": "/reports?status=pending"
      }
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 15,
    "totalPages": 7
  }
}
```

### Các thay đổi đã thực hiện

#### Controller (`controllers/notificationController.js`)
- ✅ Validation đầy đủ cho query parameters
- ✅ Validate `read_status` chỉ chấp nhận 'read' hoặc 'unread'
- ✅ Validate `type` trong danh sách giá trị hợp lệ
- ✅ Response format đúng theo yêu cầu với các trường:
  - `id`, `title`, `content`, `type`, `audience`
  - `from_system`, `priority`, `read_at`, `created_at`
  - `related_type`, `related_id`, `data`

#### Service (`services/notificationService.js`)
- ✅ Đã đúng, không cần thay đổi
- Default `limit` = 15
- Truyền đúng parameters: `readStatus`, `type`

#### Model (`models/notificationModel.js`)
- ⚠️ **CẦN CẬP NHẬT** - Xem file `models/notificationModel_admin_functions_new.js`
- Sửa PostgreSQL placeholders: `${paramIndex}` → `$${paramIndex}`
- Loại bỏ check `type !== 'all'`, chỉ check `if (type)`
- Default `limit` từ 20 → 15
- Loại bỏ `readStatus = 'all'` trong destructuring

---

## 2. API: GET /api/admin/notifications/sent

### Mô tả
Lấy danh sách thông báo mà admin đã tạo và gửi đi (bao gồm cả nháp và đã phát hành)

### Query Parameters

| Tham số | Kiểu | Bắt buộc | Mặc định | Giá trị hợp lệ | Mô tả |
|---------|------|----------|----------|----------------|-------|
| `page` | number | Không | 1 | >= 1 | Số trang hiện tại |
| `limit` | number | Không | 15 | 1-100 | Số lượng items mỗi trang |
| `status` | string | Không | - | 'draft', 'published' | Lọc theo trạng thái phát hành |
| `audience` | string | Không | - | 'all', 'user', 'admin' | Lọc theo đối tượng nhận |
| `type` | string | Không | - | 'system', 'community', 'reminder', 'feedback' | Lọc theo loại thông báo |

### Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": "notif_789",
      "title": "Thông báo bảo trì hệ thống",
      "content": {
        "message": "Hệ thống sẽ bảo trì vào 23h tối nay",
        "html": "<p>Hệ thống sẽ <strong>bảo trì</strong> vào 23h tối nay</p>"
      },
      "type": "system",
      "audience": "all",
      "from_system": false,
      "is_push_sent": true,
      "priority": 1,
      "created_at": "2025-11-22T08:00:00Z",
      "published_at": "2025-11-22T08:05:00Z"
    }
  ],
  "meta": {
    "total": 80,
    "page": 1,
    "limit": 15,
    "totalPages": 6
  }
}
```

### Các thay đổi đã thực hiện

#### Controller (`controllers/notificationController.js`)
- ✅ Validation đầy đủ cho query parameters
- ✅ Validate `status` chỉ chấp nhận 'draft' hoặc 'published'
- ✅ Validate `audience` chỉ chấp nhận 'all', 'user', hoặc 'admin'
- ✅ Response format đúng theo yêu cầu với các trường:
  - `id`, `title`, `content`, `type`, `audience`
  - `from_system`, `is_push_sent`, `priority`
  - `created_at`, `published_at` (= created_at nếu is_push_sent = true)

#### Service (`services/notificationService.js`)
- ✅ Đã đúng, không cần thay đổi
- Default `limit` = 15
- Truyền đúng parameters: `status`, `audience`, `type`

#### Model (`models/notificationModel.js`)
- ⚠️ **CẦN CẬP NHẬT** - Xem file `models/notificationModel_admin_functions_new.js`
- Sửa PostgreSQL placeholders: `${paramIndex}` → `$${paramIndex}`
- Filter logic đúng cho `status`, `audience`, `type`

---

## Mapping Status

### Sent Notifications
- `status='draft'` → `is_push_sent = false` (thông báo nháp, chưa gửi)
- `status='published'` → `is_push_sent = true` (thông báo đã phát hành)

### Received Notifications
- `read_status='read'` → `read_at IS NOT NULL`
- `read_status='unread'` → `read_at IS NULL`

---

## Test Cases

### API Received Notifications

#### 1. Lấy tất cả thông báo nhận (mặc định)
```bash
GET /api/admin/notifications/received?page=1&limit=15
```

#### 2. Lấy thông báo chưa đọc
```bash
GET /api/admin/notifications/received?page=1&limit=15&read_status=unread
```

#### 3. Lọc theo loại thông báo
```bash
GET /api/admin/notifications/received?page=1&limit=15&type=report
```

#### 4. Kết hợp nhiều filter
```bash
GET /api/admin/notifications/received?page=1&limit=15&read_status=unread&type=violation
```

---

### API Sent Notifications

#### 1. Lấy tất cả thông báo đã gửi
```bash
GET /api/admin/notifications/sent?page=1&limit=15
```

#### 2. Lấy thông báo nháp
```bash
GET /api/admin/notifications/sent?page=1&limit=15&status=draft
```

#### 3. Lọc theo đối tượng
```bash
GET /api/admin/notifications/sent?page=1&limit=15&audience=all
```

#### 4. Kết hợp nhiều filter
```bash
GET /api/admin/notifications/sent?page=1&limit=15&status=published&audience=user&type=community
```

---

## Cách áp dụng code mới

### Bước 1: Cập nhật Model
1. Mở file `models/notificationModel_admin_functions_new.js`
2. Copy 2 hàm: `findAdminSentNotifications` và `findAdminReceivedNotifications`
3. Thay thế 2 hàm cũ trong `models/notificationModel.js`

### Bước 2: Kiểm tra
- Controller và Service đã được cập nhật ✅
- Chỉ cần cập nhật Model là xong

---

## Lưu ý quan trọng

### 1. PostgreSQL Placeholders
- ✅ Đúng: `$1`, `$2`, `$${paramIndex}`
- ❌ Sai: `${1}`, `${2}`, `${paramIndex}`

### 2. Filter Logic
- Không dùng giá trị 'all' nữa
- `null` = không filter, lấy tất cả
- Chỉ thêm WHERE clause khi có giá trị cụ thể

### 3. Default Values
- `page` default = 1
- `limit` default = 15 (theo yêu cầu)
- `read_status` không có default (null)
- `type` không có default (null)
- `status` không có default (null)
- `audience` không có default (null)

### 4. Validation
- `page` >= 1
- `limit` trong khoảng 1-100
- `read_status` chỉ chấp nhận 'read' hoặc 'unread'
- `status` chỉ chấp nhận 'draft' hoặc 'published'
- `audience` chỉ chấp nhận 'all', 'user', hoặc 'admin'
- `type` phải nằm trong danh sách giá trị hợp lệ

---

## Kết luận

Đã viết lại hoàn chỉnh 2 API Notifications theo đúng yêu cầu trong `API_REQUIREMENTS.md`:

### ✅ Hoàn thành
- Controller: Validation đầy đủ, response format đúng
- Service: Logic xử lý đúng, truyền parameters đúng
- Model: Code mới đã sẵn sàng trong file `models/notificationModel_admin_functions_new.js`

### ⚠️ Cần làm
- Copy 2 hàm từ `models/notificationModel_admin_functions_new.js` vào `models/notificationModel.js`

**Sau khi cập nhật Model, cả 2 API sẽ hoạt động đúng theo yêu cầu!**
