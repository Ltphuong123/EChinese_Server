# 📋 API Documentation - Notebook Copy System

## 🎯 Tổng Quan

Hệ thống cho phép user sao chép sổ tay hệ thống (template) thành sổ tay cá nhân của mình.

### Đặc điểm:
- ✅ Copy toàn bộ từ vựng từ template
- ✅ Tự động gán `template_id` để theo dõi nguồn gốc
- ✅ Kiểm tra quyền premium cho sổ tay premium
- ✅ Ngăn chặn copy trùng lặp
- ✅ Transaction đảm bảo data integrity

---

## 📚 API Endpoints

### 1. Copy Sổ Tay Hệ Thống

**Endpoint:** `POST /api/notebooks/:notebookId/copy`

**Mô tả:** User sao chép một sổ tay hệ thống thành sổ tay cá nhân

**Authentication:** Required (JWT Token)

**Parameters:**
- `notebookId` (path, uuid): ID của sổ tay hệ thống cần copy

**Request:**
```bash
POST /api/notebooks/123e4567-e89b-12d3-a456-426614174000/copy
Authorization: Bearer <token>
```

**Response Success (201):**
```json
{
  "success": true,
  "message": "Sao chép sổ tay thành công.",
  "data": {
    "notebook": {
      "id": "987fcdeb-51a2-43d7-9876-543210fedcba",
      "user_id": "user-uuid",
      "name": "HSK 1 - Từ vựng cơ bản",
      "options": {},
      "is_premium": false,
      "status": "published",
      "template_id": "123e4567-e89b-12d3-a456-426614174000",
      "vocab_count": 150,
      "created_at": "2024-01-15T10:30:00Z"
    },
    "template": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "HSK 1 - Từ vựng cơ bản"
    }
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "message": "Sổ tay hệ thống không tồn tại hoặc chưa được xuất bản."
}
```

**Response Error (409):**
```json
{
  "success": false,
  "message": "Bạn đã sao chép sổ tay này rồi."
}
```

**Response Error (403):**
```json
{
  "success": false,
  "message": "Bạn cần có gói premium để sao chép sổ tay này.",
  "requiresPremium": true
}
```

---

### 2. Kiểm Tra Có Thể Copy

**Endpoint:** `GET /api/notebooks/:notebookId/can-copy`

**Mô tả:** Kiểm tra user có thể copy sổ tay này không

**Authentication:** Required (JWT Token)

**Parameters:**
- `notebookId` (path, uuid): ID của sổ tay cần kiểm tra

**Request:**
```bash
GET /api/notebooks/123e4567-e89b-12d3-a456-426614174000/can-copy
Authorization: Bearer <token>
```

**Response Success - Có thể copy (200):**
```json
{
  "success": true,
  "data": {
    "canCopy": true,
    "notebook": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "HSK 1 - Từ vựng cơ bản",
      "options": {},
      "is_premium": false,
      "status": "published",
      "vocab_count": 150
    }
  }
}
```

**Response Success - Không thể copy (200):**
```json
{
  "success": true,
  "data": {
    "canCopy": false,
    "reason": "Bạn đã sao chép sổ tay này rồi"
  }
}
```

**Response Success - Cần premium (200):**
```json
{
  "success": true,
  "data": {
    "canCopy": false,
    "reason": "Cần gói premium để sao chép sổ tay này",
    "requiresPremium": true
  }
}
```

---

### 3. Lấy Danh Sách Sổ Tay Đã Copy

**Endpoint:** `GET /api/notebooks/template/:templateId/copies`

**Mô tả:** Lấy danh sách các sổ tay user đã copy từ một template

**Authentication:** Required (JWT Token)

**Parameters:**
- `templateId` (path, uuid): ID của template

**Request:**
```bash
GET /api/notebooks/template/123e4567-e89b-12d3-a456-426614174000/copies
Authorization: Bearer <token>
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Lấy danh sách sổ tay đã sao chép thành công.",
  "data": {
    "templateId": "123e4567-e89b-12d3-a456-426614174000",
    "notebooks": [
      {
        "id": "987fcdeb-51a2-43d7-9876-543210fedcba",
        "name": "HSK 1 - Từ vựng cơ bản",
        "vocab_count": 150,
        "created_at": "2024-01-15T10:30:00Z",
        "template_id": "123e4567-e89b-12d3-a456-426614174000"
      }
    ],
    "total": 1
  }
}
```

---

### 4. Xem Thống Kê Template (Admin)

**Endpoint:** `GET /api/admin/notebooks/template/:templateId/stats`

**Mô tả:** Admin xem thống kê số lượng user đã copy template

**Authentication:** Required (JWT Token + Admin Role)

**Parameters:**
- `templateId` (path, uuid): ID của template

**Request:**
```bash
GET /api/admin/notebooks/template/123e4567-e89b-12d3-a456-426614174000/stats
Authorization: Bearer <admin-token>
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Lấy thống kê template thành công.",
  "data": {
    "template": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "HSK 1 - Từ vựng cơ bản",
      "options": {},
      "is_premium": false,
      "status": "published",
      "vocab_count": 150
    },
    "stats": {
      "totalUsersCopied": 245,
      "totalCopies": 245
    }
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "message": "Template không tồn tại."
}
```

---

## 🔄 Flow Diagram

```
User Request Copy
       ↓
Check Template Exists & Published
       ↓
Check Premium Access (if needed)
       ↓
Check Already Copied
       ↓
BEGIN TRANSACTION
       ↓
Create New Notebook (with template_id)
       ↓
Copy All Vocabularies (status = 'chưa thuộc')
       ↓
Update vocab_count
       ↓
COMMIT TRANSACTION
       ↓
Return Success
```

---

## 🔐 Business Rules

### 1. Điều kiện copy:
- ✅ Sổ tay phải là sổ tay hệ thống (`user_id = NULL`)
- ✅ Sổ tay phải có status = `published`
- ✅ User chưa copy sổ tay này trước đó
- ✅ Nếu `is_premium = true`, user phải có subscription active

### 2. Khi copy:
- ✅ Tạo notebook mới với `user_id` = user hiện tại
- ✅ Gán `template_id` = ID của sổ tay gốc
- ✅ Copy toàn bộ từ vựng với status mặc định = `'chưa thuộc'`
- ✅ Giữ nguyên `name`, `options`, `is_premium`
- ✅ Luôn set `status = 'published'`

### 3. Ngăn chặn:
- ❌ Không cho copy nếu đã copy rồi (1 user chỉ copy 1 lần)
- ❌ Không cho copy sổ tay draft
- ❌ Không cho copy sổ tay của user khác
- ❌ Không cho copy sổ tay premium nếu không có subscription

---

## 💾 Database Schema

### Notebooks Table (Updated)
```sql
CREATE TABLE "Notebooks" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid,                    -- NULL = system notebook
  "name" varchar(100),
  "vocab_count" int DEFAULT 0,
  "created_at" timestamptz,
  "options" json,
  "is_premium" boolean DEFAULT false,
  "status" varchar(50),              -- 'published' | 'draft'
  "template_id" uuid,                -- NEW: ID của template gốc
  
  CONSTRAINT fk_notebooks_template 
    FOREIGN KEY ("template_id") 
    REFERENCES "Notebooks"("id") 
    ON DELETE SET NULL
);

CREATE INDEX idx_notebooks_template_id ON "Notebooks" ("template_id");
CREATE INDEX idx_notebooks_user_template ON "Notebooks" ("user_id", "template_id");
```

---

## 🧪 Testing Examples

### Test 1: Copy sổ tay free
```bash
# 1. Kiểm tra có thể copy
curl -X GET http://localhost:3000/api/notebooks/{id}/can-copy \
  -H "Authorization: Bearer {token}"

# 2. Thực hiện copy
curl -X POST http://localhost:3000/api/notebooks/{id}/copy \
  -H "Authorization: Bearer {token}"

# 3. Verify trong database
SELECT * FROM "Notebooks" WHERE template_id = '{id}';
```

### Test 2: Copy sổ tay premium (không có subscription)
```bash
curl -X POST http://localhost:3000/api/notebooks/{premium-id}/copy \
  -H "Authorization: Bearer {token}"

# Expected: 403 Forbidden
```

### Test 3: Copy lần 2 (duplicate)
```bash
# Copy lần 1
curl -X POST http://localhost:3000/api/notebooks/{id}/copy \
  -H "Authorization: Bearer {token}"

# Copy lần 2
curl -X POST http://localhost:3000/api/notebooks/{id}/copy \
  -H "Authorization: Bearer {token}"

# Expected: 409 Conflict
```

### Test 4: Admin xem thống kê
```bash
curl -X GET http://localhost:3000/api/admin/notebooks/template/{id}/stats \
  -H "Authorization: Bearer {admin-token}"
```

---

## 📊 Use Cases

### Use Case 1: User học HSK
```
1. User xem danh sách sổ tay hệ thống
2. Chọn "HSK 1 - Từ vựng cơ bản"
3. Click "Sao chép vào sổ tay của tôi"
4. Hệ thống tạo bản copy với 150 từ vựng
5. User bắt đầu học và đánh dấu tiến độ
```

### Use Case 2: User premium
```
1. User có subscription active
2. Xem sổ tay premium "HSK 6 - Nâng cao"
3. Copy thành công
4. Học với nội dung premium
```

### Use Case 3: Admin theo dõi
```
1. Admin tạo template "HSK 1"
2. Theo dõi số lượng user copy
3. Phân tích template nào phổ biến
4. Cải thiện nội dung dựa trên feedback
```

---

## 🚀 Integration Guide

### Bước 1: Chạy Migration
```bash
psql -U your_user -d your_database -f config/migrations/add_template_id_to_notebooks.sql
```

### Bước 2: Đăng ký Routes
```javascript
// app.js
const notebookCopyRoutes = require('./routes/notebookCopyRoutes');
app.use('/api', notebookCopyRoutes);
```

### Bước 3: Test API
```bash
npm start
# Test với Postman hoặc cURL
```

---

## 🔍 Troubleshooting

### Lỗi: "Sổ tay hệ thống không tồn tại"
**Nguyên nhân:** 
- Sổ tay không phải system notebook (user_id != NULL)
- Sổ tay có status = 'draft'
- ID không tồn tại

**Giải pháp:** Kiểm tra lại ID và status

### Lỗi: "Bạn đã sao chép sổ tay này rồi"
**Nguyên nhân:** User đã copy template này trước đó

**Giải pháp:** 
- Sử dụng sổ tay đã copy
- Hoặc xóa sổ tay cũ và copy lại

### Lỗi: "Cần gói premium"
**Nguyên nhân:** Template có `is_premium = true` nhưng user không có subscription

**Giải pháp:** User cần mua gói premium

---

## 📈 Performance Considerations

### Optimization:
- ✅ Transaction đảm bảo atomicity
- ✅ Batch insert vocabularies
- ✅ Index trên template_id
- ✅ Composite index (user_id, template_id)

### Estimated Time:
- Copy notebook với 100 từ: ~100ms
- Copy notebook với 1000 từ: ~500ms
- Check can copy: ~50ms

---

## 🎯 Future Enhancements

### Version 2.0:
- [ ] Cho phép copy nhiều lần (với tên khác nhau)
- [ ] Sync updates từ template về copied notebooks
- [ ] Template versioning
- [ ] Copy với filter (chỉ copy một số từ vựng)

### Version 3.0:
- [ ] Share copied notebooks với user khác
- [ ] Collaborative notebooks
- [ ] Template marketplace

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Author:** Development Team
