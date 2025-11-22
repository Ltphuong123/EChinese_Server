# API Reports Implementation Summary

## Tổng quan
Đã viết lại API `GET /api/moderation/reports` theo đúng yêu cầu trong file `API_REQUIREMENTS.md`.

---

## Các thay đổi đã thực hiện

### 1. Controller (`controllers/moderationController.js`)

#### Hàm `getReports`
- **Query Parameters được hỗ trợ:**
  - `page` (number, default: 1, min: 1)
  - `limit` (number, default: 10, min: 1, max: 100)
  - `status` (string, values: 'all' | 'pending' | 'in_progress' | 'resolved' | 'dismissed')
  - `target_type` (string, values: 'all' | 'post' | 'comment' | 'user' | 'bug' | 'other')
  - `search` (string, tìm kiếm theo: tên người báo cáo, lý do, ID báo cáo)

- **Validation:**
  - Validate `page` >= 1
  - Validate `limit` trong khoảng 1-100
  - Validate `status` trong danh sách giá trị hợp lệ
  - Validate `target_type` trong danh sách giá trị hợp lệ
  - Chuyển 'all' thành `null` để không filter

- **Response Format:**
```json
{
  "success": true,
  "data": {
    "data": [/* array of reports */],
    "meta": {
      "total": 150,
      "page": 1,
      "limit": 10,
      "totalPages": 15
    }
  }
}
```

---

### 2. Service (`services/moderationService.js`)

#### Hàm `getReports`
- Nhận filters từ controller
- Tính toán `offset` cho pagination
- Gọi model để lấy dữ liệu
- Tính toán `totalPages`
- Trả về format chuẩn với `data` và `meta`

**Thay đổi:**
- Default `limit` từ 12 → 10 (theo yêu cầu)
- Parse `page` và `limit` thành integer trong meta
- Truyền đúng tên parameter `target_type` thay vì `targetType`

---

### 3. Model (`models/moderationModel.js`)

#### Hàm `findReports` - ĐÃ VIẾT LẠI HOÀN TOÀN

**File mới:** `models/moderationModel_findReports_new.js` (chứa code mới)

**Các cải tiến:**

1. **Query Parameters:**
   - Đổi `targetType` → `target_type` (snake_case)
   - Loại bỏ check `!== 'all'`, chỉ check `if (status)` và `if (target_type)`

2. **PostgreSQL Placeholders:**
   - Sửa `${params.length}` → `$${params.length}` (đúng cú pháp PostgreSQL)
   - Áp dụng cho tất cả các query parameters

3. **Search Enhancement:**
   - Tìm kiếm theo: `reason`, `details`, `reporter.name`, `reporter.username`, `report.id`
   - Sử dụng `r.id::text ILIKE` để tìm kiếm theo ID

4. **Response Fields - Đầy đủ theo yêu cầu:**
   ```javascript
   {
     id, reporter_id, target_type, target_id,
     reason, details, status,
     resolved_by, resolved_at, resolution,
     related_violation_id,
     auto_flagged,  // COALESCE(r.auto_flagged, false)
     created_at, updated_at,
     
     reporter: {
       id, name, username, avatar_url, email, role
     },
     
     target_user_id,  // ID của người bị báo cáo
     
     targetContent: {
       // Tùy theo target_type:
       // - post: id, title, content, user_id, status, created_at, deleted_*
       // - comment: id, content, user_id, post_id, created_at, deleted_*
       // - user: id, name, username, email, avatar_url, role, is_active
     }
   }
   ```

5. **Deleted Content Info:**
   - Thêm các trường: `deleted_at`, `deleted_by`, `deleted_reason` cho post và comment
   - Giúp admin biết nội dung đã bị xóa hay chưa

---

## Cách áp dụng code mới

### Option 1: Copy thủ công
1. Mở file `models/moderationModel_findReports_new.js`
2. Copy toàn bộ hàm `findReports`
3. Thay thế hàm `findReports` cũ trong `models/moderationModel.js`

### Option 2: Sử dụng strReplace (nếu IDE hỗ trợ)
```javascript
// Tìm và thay thế toàn bộ hàm findReports từ dòng 12-62
```

---

## Testing

### Test Cases

#### 1. Lấy trang đầu tiên (mặc định)
```bash
GET /api/moderation/reports?page=1&limit=10
```

#### 2. Lọc báo cáo pending về post
```bash
GET /api/moderation/reports?page=1&limit=10&status=pending&target_type=post
```

#### 3. Tìm kiếm theo tên người báo cáo
```bash
GET /api/moderation/reports?page=1&limit=10&search=Nguyễn
```

#### 4. Tìm kiếm theo ID báo cáo
```bash
GET /api/moderation/reports?page=1&limit=10&search=report_123
```

#### 5. Lọc báo cáo đã giải quyết
```bash
GET /api/moderation/reports?page=1&limit=10&status=resolved
```

---

## Lưu ý

1. **PostgreSQL Syntax:**
   - Phải dùng `$1`, `$2`, `$3`... cho placeholders
   - KHÔNG dùng `${1}`, `${2}`... (đây là template string của JavaScript)

2. **Filter Logic:**
   - `status='all'` và `target_type='all'` được chuyển thành `null`
   - `null` = không filter, lấy tất cả

3. **Search:**
   - Tìm kiếm không phân biệt hoa thường (ILIKE)
   - Tìm kiếm trong nhiều trường cùng lúc (OR)

4. **Pagination:**
   - `offset = (page - 1) * limit`
   - `totalPages = Math.ceil(total / limit)`

---

## Kết luận

API `GET /api/moderation/reports` đã được viết lại hoàn toàn theo đúng yêu cầu trong `API_REQUIREMENTS.md`:
- ✅ Query parameters đầy đủ và validation đúng
- ✅ Response format chuẩn với đầy đủ thông tin
- ✅ Search theo nhiều trường
- ✅ Filter theo status và target_type
- ✅ Pagination server-side
- ✅ PostgreSQL syntax đúng

**File cần cập nhật:** `models/moderationModel.js` - thay thế hàm `findReports` bằng code trong `models/moderationModel_findReports_new.js`
