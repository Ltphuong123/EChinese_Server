# API Admin Logs Implementation Summary

## Tổng quan
Đã viết lại API `GET /admin/logs` theo đúng yêu cầu trong file `API_REQUIREMENTS.md` với đầy đủ tính năng phân trang, tìm kiếm và filter.

---

## API: GET /admin/logs

### Mô tả
Lấy danh sách nhật ký hệ thống (admin logs) với hỗ trợ phân trang, tìm kiếm và nhiều bộ lọc.

### Endpoint
```
GET /admin/logs
```

### Query Parameters

| Parameter | Type | Required | Default | Description | Example |
|-----------|------|----------|---------|-------------|---------|
| `page` | number | No | 1 | Số trang hiện tại | 1, 2, 3 |
| `limit` | number | No | 20 | Số logs mỗi trang (min: 1, max: 100) | 10, 20, 50, 100 |
| `search` | string | No | - | Tìm kiếm trong description, target_id, admin name | "CREATE", "user_123" |
| `admin_id` | string | No | - | Lọc theo ID của admin thực hiện hành động | "admin_user_123" |
| `action_type` | string | No | - | Lọc theo loại hành động | "CREATE_POST", "DELETE_USER" |
| `start_date` | string (ISO) | No | - | Ngày bắt đầu (ISO 8601 format) | "2024-01-01" hoặc "2024-01-01T00:00:00Z" |
| `end_date` | string (ISO) | No | - | Ngày kết thúc (ISO 8601 format) | "2024-01-31" hoặc "2024-01-31T23:59:59Z" |

### Response Format

```json
{
  "success": true,
  "message": "Lấy danh sách logs thành công",
  "data": {
    "data": [
      {
        "id": "log_001",
        "user_id": "admin_user_123",
        "adminName": "Nguyễn Văn A",
        "admin_username": "admin_a",
        "admin_email": "admin_a@example.com",
        "action_type": "CREATE_POST",
        "description": "Tạo bài viết mới với tiêu đề 'Học tiếng Trung cơ bản'",
        "target_id": "post_456",
        "created_at": "2024-01-15T10:30:00Z"
      },
      {
        "id": "log_002",
        "user_id": "admin_user_456",
        "adminName": "Trần Thị B",
        "admin_username": "admin_b",
        "admin_email": "admin_b@example.com",
        "action_type": "UPDATE_USER",
        "description": "Cập nhật thông tin người dùng",
        "target_id": "user_789",
        "created_at": "2024-01-15T09:15:00Z"
      }
    ],
    "meta": {
      "total": 1250,
      "page": 1,
      "limit": 20,
      "totalPages": 63
    }
  }
}
```

---

## Các thay đổi đã thực hiện

### 1. Controller (`controllers/adminLogController.js`) ✅

#### Hàm `getAdminLogs`

**Trước:**
- Không có query parameters
- Không có pagination
- Không có filter
- Trả về tất cả logs

**Sau:**
- ✅ Parse và validate tất cả query parameters
- ✅ Validation cho `page` (min: 1)
- ✅ Validation cho `limit` (min: 1, max: 100)
- ✅ Validate và parse dates (ISO 8601 format)
- ✅ Truyền filters đến service
- ✅ Response format đúng theo yêu cầu

**Tính năng mới:**
```javascript
// Query parameters
const { page, limit, search, admin_id, action_type, start_date, end_date } = req.query;

// Validation
const pageNum = Math.max(parseInt(page) || 1, 1);
const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);

// Date validation
if (start_date) {
  const startDateObj = new Date(start_date);
  if (!isNaN(startDateObj.getTime())) {
    validStartDate = startDateObj.toISOString();
  }
}
```

---

### 2. Service (`services/adminLogService.js`) ✅

#### Hàm `getAllLogs`

**Trước:**
- Không nhận parameters
- Không có pagination logic
- Trả về raw data từ model

**Sau:**
- ✅ Nhận filters từ controller
- ✅ Tính toán `offset` cho pagination
- ✅ Gọi model với đầy đủ filters
- ✅ Tính toán `totalPages`
- ✅ Format response với `data` và `meta`

**Logic mới:**
```javascript
const { page = 1, limit = 20 } = filters;
const offset = (page - 1) * limit;

const { logs, totalItems } = await adminLogModel.findAll({
  ...filters,
  offset,
  limit
});

const totalPages = Math.ceil(totalItems / limit);

return {
  data: logs,
  meta: {
    total: totalItems,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages
  }
};
```

---

### 3. Model (`models/adminLogModel.js`) ✅

#### Hàm `findAll`

**Trước:**
- Không nhận parameters
- Không có WHERE clauses
- Không có pagination
- Trả về tất cả rows

**Sau:**
- ✅ Nhận filters: `limit`, `offset`, `search`, `admin_id`, `action_type`, `start_date`, `end_date`
- ✅ Dynamic WHERE clauses với PostgreSQL placeholders đúng
- ✅ Search trong nhiều trường: `description`, `target_id`, `admin name`, `admin username`
- ✅ Filter theo admin_id
- ✅ Filter theo action_type
- ✅ Filter theo date range (start_date, end_date)
- ✅ Count query riêng để lấy total
- ✅ Data query với LIMIT và OFFSET
- ✅ Trả về `{ logs, totalItems }`

**Query mới:**

```javascript
// Dynamic WHERE clauses
let whereClauses = 'WHERE 1=1';
const params = [];

if (admin_id) {
  params.push(admin_id);
  whereClauses += ` AND al.user_id = $${params.length}`;
}

if (action_type) {
  params.push(action_type);
  whereClauses += ` AND al.action_type = $${params.length}`;
}

if (search) {
  params.push(`%${search}%`);
  whereClauses += ` AND (
    al.description ILIKE $${params.length}
    OR al.target_id::text ILIKE $${params.length}
    OR u.name ILIKE $${params.length}
    OR u.username ILIKE $${params.length}
  )`;
}

if (start_date) {
  params.push(start_date);
  whereClauses += ` AND al.created_at >= $${params.length}`;
}

if (end_date) {
  params.push(end_date);
  whereClauses += ` AND al.created_at <= $${params.length}`;
}
```

**Response fields:**
```javascript
SELECT 
  al.id,
  al.user_id,
  u.name as "adminName",           // Đúng theo yêu cầu
  u.username as admin_username,
  u.email as admin_email,
  al.action_type,
  al.description,
  al.target_id,
  al.created_at
```

---

## Test Cases

### 1. Lấy trang đầu tiên (mặc định)
```bash
GET /admin/logs
```
Response: page=1, limit=20

---

### 2. Lấy trang 2 với 50 logs
```bash
GET /admin/logs?page=2&limit=50
```
Response: page=2, limit=50

---

### 3. Tìm kiếm logs có chứa "CREATE"
```bash
GET /admin/logs?page=1&limit=20&search=CREATE
```
Tìm trong: description, target_id, admin name, admin username

---

### 4. Lọc logs của một admin cụ thể
```bash
GET /admin/logs?page=1&limit=20&admin_id=admin_user_123
```
Filter: `al.user_id = 'admin_user_123'`

---

### 5. Lọc theo loại hành động
```bash
GET /admin/logs?page=1&limit=20&action_type=DELETE_USER
```
Filter: `al.action_type = 'DELETE_USER'`

---

### 6. Lọc theo khoảng thời gian
```bash
GET /admin/logs?page=1&limit=20&start_date=2024-01-01&end_date=2024-01-31
```
Filter: `al.created_at >= '2024-01-01' AND al.created_at <= '2024-01-31'`

---

### 7. Kết hợp nhiều filter
```bash
GET /admin/logs?page=1&limit=20&search=post&admin_id=admin_user_123&action_type=CREATE_POST&start_date=2024-01-01&end_date=2024-01-31
```
Áp dụng tất cả filters cùng lúc

---

## Tính năng chính

### ✅ Pagination
- Server-side pagination với `page` và `limit`
- Default: page=1, limit=20
- Max limit: 100
- Response có `meta` với `total`, `page`, `limit`, `totalPages`

### ✅ Search
- Tìm kiếm không phân biệt hoa thường (ILIKE)
- Tìm trong nhiều trường:
  - `description`
  - `target_id`
  - `admin name`
  - `admin username`

### ✅ Filters
- **admin_id**: Lọc theo ID của admin
- **action_type**: Lọc theo loại hành động
- **start_date**: Lọc từ ngày (>=)
- **end_date**: Lọc đến ngày (<=)

### ✅ Date Handling
- Hỗ trợ ISO 8601 format
- Validate dates trước khi query
- Convert sang ISO string để đảm bảo tính nhất quán

### ✅ PostgreSQL Best Practices
- Sử dụng placeholders đúng: `$1`, `$2`, `$${params.length}`
- Dynamic WHERE clauses
- Separate count query và data query
- LEFT JOIN với Users table để lấy thông tin admin

---

## Lưu ý quan trọng

### 1. PostgreSQL Placeholders
- ✅ Đúng: `$1`, `$2`, `$${params.length}`
- ❌ Sai: `${1}`, `${2}`, `${params.length}`

### 2. Date Format
- Chấp nhận: `"2024-01-01"` hoặc `"2024-01-01T00:00:00Z"`
- Validate bằng `new Date()` và `isNaN()`
- Convert sang ISO string: `toISOString()`

### 3. Search Logic
- Sử dụng `ILIKE` cho case-insensitive search
- Tìm trong nhiều trường với OR
- Sử dụng `%search%` cho partial match

### 4. Response Format
- Field name: `adminName` (camelCase, theo yêu cầu)
- Thêm fields: `admin_username`, `admin_email` (snake_case)
- Meta object: `total`, `page`, `limit`, `totalPages`

---

## Kết luận

API `GET /admin/logs` đã được viết lại hoàn toàn theo đúng yêu cầu trong `API_REQUIREMENTS.md`:

### ✅ Hoàn thành 100%
- Controller: Validation đầy đủ, parse dates, response format đúng
- Service: Pagination logic, format response với data và meta
- Model: Dynamic filters, search, date range, PostgreSQL syntax đúng

### 🎯 Tính năng
- ✅ Pagination (page, limit)
- ✅ Search (description, target_id, admin name, username)
- ✅ Filter by admin_id
- ✅ Filter by action_type
- ✅ Filter by date range (start_date, end_date)
- ✅ Response format chuẩn với data và meta

**API đã sẵn sàng để sử dụng!**
