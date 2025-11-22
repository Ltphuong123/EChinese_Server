# Tài liệu API - Chức năng BadgeLevel

## Tổng quan
Chức năng BadgeLevel quản lý các cấp độ huy hiệu (badge) trong hệ thống dựa trên điểm cộng đồng (community points) của người dùng.

---

## Danh sách API

### 1. Lấy danh sách Badge Levels đang hoạt động (Public)

**Endpoint:** `GET /api/badges`

**Quyền truy cập:** Public (không yêu cầu xác thực)

**Mô tả:** Lấy danh sách tất cả các cấp độ huy hiệu đang hoạt động (is_active = true), sắp xếp theo level tăng dần. API này dành cho người dùng thông thường để xem các cấp độ huy hiệu có thể đạt được.

**Response thành công (200):**
```json
{
  "success": true,
  "message": "Lấy danh sách huy hiệu đang hoạt động thành công.",
  "data": [
    {
      "id": "number",
      "level": "number",
      "name": "string",
      "icon": "string",
      "min_points": "number",
      "rule_description": "string",
      "is_active": true,
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ]
}
```

**Response lỗi:**
- `500`: Lỗi server

---

### 2. Tạo Badge Level mới (Admin)

**Endpoint:** `POST /api/admin/settings/badges`

**Quyền truy cập:** Admin (yêu cầu token xác thực)

**Mô tả:** Tạo một cấp độ huy hiệu mới. Level sẽ được tự động tăng dần dựa trên level cao nhất hiện có.

**Request Body:**
```json
{
  "name": "string (bắt buộc)",
  "icon": "string (bắt buộc)",
  "min_points": "number (bắt buộc)",
  "rule_description": "string (tùy chọn)",
  "is_active": "boolean (tùy chọn)"
}
```

**Response thành công (201):**
```json
{
  "success": true,
  "message": "Tạo cấp độ huy hiệu thành công.",
  "data": {
    "id": "number",
    "level": "number",
    "name": "string",
    "icon": "string",
    "min_points": "number",
    "rule_description": "string",
    "is_active": "boolean",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

**Response lỗi:**
- `400`: Thiếu các trường bắt buộc
- `409`: Dữ liệu bị trùng lặp
- `500`: Lỗi server

---

### 3. Lấy danh sách tất cả Badge Levels (Admin)

**Endpoint:** `GET /api/admin/settings/badges`

**Quyền truy cập:** Admin (yêu cầu token xác thực)

**Mô tả:** Lấy danh sách tất cả các cấp độ huy hiệu, sắp xếp theo level tăng dần.

**Response thành công (200):**
```json
{
  "success": true,
  "message": "Lấy danh sách huy hiệu thành công.",
  "data": [
    {
      "id": "number",
      "level": "number",
      "name": "string",
      "icon": "string",
      "min_points": "number",
      "rule_description": "string",
      "is_active": "boolean",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ]
}
```

**Response lỗi:**
- `500`: Lỗi server

---

### 4. Cập nhật Badge Level (Admin)

**Endpoint:** `PUT /api/admin/settings/badges/:id`

**Quyền truy cập:** Admin (yêu cầu token xác thực)

**Mô tả:** Cập nhật thông tin của một cấp độ huy hiệu. Hệ thống sẽ kiểm tra trùng lặp min_points với các badge khác.

**URL Parameters:**
- `id`: ID của badge level cần cập nhật

**Request Body:** (Tất cả các trường đều tùy chọn)
```json
{
  "name": "string",
  "icon": "string",
  "min_points": "number",
  "rule_description": "string",
  "is_active": "boolean"
}
```

**Response thành công (200):**
```json
{
  "success": true,
  "message": "Cập nhật huy hiệu thành công.",
  "data": {
    "id": "number",
    "level": "number",
    "name": "string",
    "icon": "string",
    "min_points": "number",
    "rule_description": "string",
    "is_active": "boolean",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

**Response lỗi:**
- `400`: Không có dữ liệu để cập nhật
- `404`: Huy hiệu không tồn tại
- `409`: Điểm tối thiểu (min_points) đã tồn tại ở một huy hiệu khác
- `500`: Lỗi server

---

### 5. Xóa Badge Level (Admin)

**Endpoint:** `DELETE /api/admin/settings/badges/:id`

**Quyền truy cập:** Admin (yêu cầu token xác thực)

**Mô tả:** Xóa một cấp độ huy hiệu. Không thể xóa nếu có người dùng đang sử dụng huy hiệu này.

**URL Parameters:**
- `id`: ID của badge level cần xóa

**Response thành công (200):**
```json
{
  "success": true,
  "message": "thành công"
}
```

**Response lỗi:**
- `404`: Huy hiệu không tồn tại
- `409`: Không thể xóa huy hiệu này vì có người dùng đang sử dụng nó. Hãy resync huy hiệu của người dùng trước.
- `500`: Lỗi server

---

### 6. Đồng bộ lại huy hiệu cho tất cả người dùng (Admin)

**Endpoint:** `POST /api/admin/settings/badges/resync`

**Quyền truy cập:** Admin (yêu cầu token xác thực)

**Mô tả:** Đồng bộ lại huy hiệu cho tất cả người dùng dựa trên điểm cộng đồng (community_points) hiện tại của họ. Hệ thống sẽ tự động gán huy hiệu cao nhất mà người dùng đủ điều kiện.

**Logic xử lý:**
1. Lấy tất cả badge levels (đang active), sắp xếp theo min_points giảm dần
2. Lấy tất cả người dùng
3. Với mỗi người dùng, tìm badge level cao nhất mà họ đủ điều kiện (community_points >= min_points)
4. Cập nhật badge_level cho người dùng nếu khác với badge hiện tại

**Response thành công (200):**
```json
{
  "success": true,
  "message": "Đã đồng bộ lại huy hiệu cho X người dùng.",
  "data": [
    {
      "id": "number",
      "badge_level": "number"
    }
  ]
}
```

**Response lỗi:**
- `500`: Lỗi server

---

## Cấu trúc Database

### Bảng BadgeLevels

| Cột | Kiểu dữ liệu | Mô tả |
|-----|-------------|-------|
| id | INTEGER | Primary key, tự động tăng |
| level | INTEGER | Cấp độ huy hiệu (tự động tăng dần) |
| name | VARCHAR | Tên huy hiệu |
| icon | VARCHAR | Icon/hình ảnh của huy hiệu |
| min_points | INTEGER | Điểm tối thiểu để đạt được huy hiệu này |
| rule_description | TEXT | Mô tả quy tắc đạt huy hiệu |
| is_active | BOOLEAN | Trạng thái kích hoạt |
| created_at | TIMESTAMP | Thời gian tạo |
| updated_at | TIMESTAMP | Thời gian cập nhật |

---

## Middleware

Tất cả các API đều yêu cầu:
1. `authMiddleware.verifyToken`: Xác thực token người dùng
2. `authMiddleware.isAdmin`: Kiểm tra quyền admin

---

## Lưu ý

- Level của badge được tự động tăng dần, không thể chỉnh sửa thủ công
- Khi tạo badge mới, level sẽ là max(level hiện có) + 1
- Không thể xóa badge nếu có người dùng đang sử dụng, cần resync trước
- Hàm resync sẽ cập nhật badge cho tất cả người dùng dựa trên community_points
- Chỉ các badge có is_active = true mới được sử dụng trong quá trình resync
