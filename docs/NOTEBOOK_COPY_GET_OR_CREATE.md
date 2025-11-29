# 📚 API: Get or Create Notebook Copy

## 🎯 Tổng Quan

API này cho phép user lấy bản sao sổ tay từ template. Nếu chưa có bản sao thì tự động tạo mới, nếu đã có thì trả về bản sao hiện có.

**Đặc điểm:**
- ✅ Idempotent: Gọi nhiều lần vẫn trả về cùng 1 notebook
- ✅ Tự động tạo nếu chưa có
- ✅ Kiểm tra quyền premium
- ✅ Mỗi user chỉ có 1 bản sao cho mỗi template

---

## 📋 API Endpoint

### Get or Create Notebook Copy

**Endpoint:** `GET /api/notebooks/template/:templateId/copy`

**Method:** GET

**Authentication:** Required (JWT Token)

**Parameters:**
- `templateId` (path, uuid): ID của sổ tay hệ thống (template)

---

## 📤 Request

```bash
GET /api/notebooks/template/123e4567-e89b-12d3-a456-426614174000/copy
Authorization: Bearer <user-token>
```

---

## 📥 Response

### Lần đầu tiên (Tạo mới) - 201 Created

```json
{
  "success": true,
  "message": "Đã tạo bản sao mới của sổ tay.",
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
    "isNew": true,
    "template": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "HSK 1 - Từ vựng cơ bản"
    }
  }
}
```

### Lần sau (Trả về hiện có) - 200 OK

```json
{
  "success": true,
  "message": "Bạn đã có bản sao của sổ tay này.",
  "data": {
    "notebook": {
      "id": "987fcdeb-51a2-43d7-9876-543210fedcba",
      "user_id": "user-uuid",
      "name": "HSK 1 - Từ vựng cơ bản",
      "vocab_count": 150,
      "created_at": "2024-01-15T10:30:00Z",
      "template_id": "123e4567-e89b-12d3-a456-426614174000"
    },
    "isNew": false,
    "template": {
      "id": "123e4567-e89b-12d3-a456-426614174000"
    }
  }
}
```

---

## ❌ Error Responses

### 404 Not Found - Template không tồn tại

```json
{
  "success": false,
  "message": "Sổ tay hệ thống không tồn tại hoặc chưa được xuất bản."
}
```

### 403 Forbidden - Cần premium

```json
{
  "success": false,
  "message": "Bạn cần có gói premium để sao chép sổ tay này.",
  "requiresPremium": true
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Lỗi khi lấy hoặc tạo bản sao sổ tay",
  "error": "Chi tiết lỗi..."
}
```

---

## 🔄 Flow Diagram

```
User Request
    ↓
Kiểm tra user đã có bản sao?
    ↓
    ├─ CÓ → Trả về bản sao (200)
    │        { notebook, isNew: false }
    │
    └─ CHƯA CÓ
         ↓
         Kiểm tra template tồn tại & published
         ↓
         Kiểm tra quyền premium (nếu cần)
         ↓
         BEGIN TRANSACTION
         ↓
         Tạo notebook mới
         ↓
         Copy vocabularies
         ↓
         Update vocab_count
         ↓
         COMMIT
         ↓
         Trả về notebook mới (201)
         { notebook, isNew: true }
```

---

## 💻 Frontend Integration

### React Example

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const NotebookViewer = ({ templateId, token }) => {
  const [notebook, setNotebook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    const getOrCreateNotebook = async () => {
      try {
        const response = await axios.get(
          `/api/notebooks/template/${templateId}/copy`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setNotebook(response.data.data.notebook);
        setIsNew(response.data.data.isNew);

        if (response.data.data.isNew) {
          // Hiển thị thông báo "Đã tạo bản sao mới"
          toast.success('Đã tạo bản sao sổ tay cho bạn!');
        }
      } catch (error) {
        if (error.response?.status === 403) {
          // Redirect đến trang premium
          navigate('/premium');
        } else {
          toast.error('Không thể tải sổ tay');
        }
      } finally {
        setLoading(false);
      }
    };

    getOrCreateNotebook();
  }, [templateId]);

  if (loading) return <div>Đang tải...</div>;

  return (
    <div>
      {isNew && (
        <div className="alert alert-success">
          🎉 Đã tạo bản sao mới! Bắt đầu học ngay nào!
        </div>
      )}
      
      <h2>{notebook.name}</h2>
      <p>Tổng số từ: {notebook.vocab_count}</p>
      
      {/* Hiển thị danh sách từ vựng */}
      <VocabularyList notebookId={notebook.id} />
    </div>
  );
};
```

### Vue Example

```javascript
<template>
  <div v-if="!loading">
    <div v-if="isNew" class="alert alert-success">
      🎉 Đã tạo bản sao mới! Bắt đầu học ngay nào!
    </div>
    
    <h2>{{ notebook.name }}</h2>
    <p>Tổng số từ: {{ notebook.vocab_count }}</p>
    
    <VocabularyList :notebookId="notebook.id" />
  </div>
  <div v-else>Đang tải...</div>
</template>

<script>
export default {
  data() {
    return {
      notebook: null,
      isNew: false,
      loading: true
    };
  },
  async mounted() {
    try {
      const response = await this.$axios.get(
        `/api/notebooks/template/${this.templateId}/copy`
      );
      
      this.notebook = response.data.data.notebook;
      this.isNew = response.data.data.isNew;
      
      if (this.isNew) {
        this.$toast.success('Đã tạo bản sao sổ tay cho bạn!');
      }
    } catch (error) {
      if (error.response?.status === 403) {
        this.$router.push('/premium');
      } else {
        this.$toast.error('Không thể tải sổ tay');
      }
    } finally {
      this.loading = false;
    }
  }
};
</script>
```

---

## 🧪 Testing

### Test với cURL

```bash
# Lần 1: Tạo mới (expect: 201)
curl -X GET http://localhost:3000/api/notebooks/template/{template-id}/copy \
  -H "Authorization: Bearer {token}" \
  -v

# Lần 2: Trả về hiện có (expect: 200)
curl -X GET http://localhost:3000/api/notebooks/template/{template-id}/copy \
  -H "Authorization: Bearer {token}" \
  -v
```

### Test Script

```bash
node scripts/test-notebook-copy.js
```

---

## 🎯 Use Cases

### Use Case 1: User học HSK lần đầu

```
1. User vào trang "Sổ tay hệ thống"
2. Click vào "HSK 1 - Từ vựng cơ bản"
3. Frontend gọi: GET /notebooks/template/{hsk1-id}/copy
4. Backend tạo bản sao mới → Response 201
5. Frontend hiển thị: "Đã tạo bản sao! Bắt đầu học ngay"
6. User bắt đầu học và đánh dấu tiến độ
```

### Use Case 2: User quay lại học tiếp

```
1. User vào lại trang "HSK 1"
2. Frontend gọi: GET /notebooks/template/{hsk1-id}/copy
3. Backend trả về bản sao hiện có → Response 200
4. Frontend hiển thị tiến độ học tập đã lưu
5. User tiếp tục học từ chỗ đã dừng
```

### Use Case 3: User thử học sổ tay premium

```
1. User free click vào "HSK 6 - Premium"
2. Frontend gọi: GET /notebooks/template/{hsk6-id}/copy
3. Backend kiểm tra subscription → Response 403
4. Frontend hiển thị popup: "Nâng cấp Premium để học"
5. User click "Nâng cấp" → Redirect đến trang pricing
```

---

## 🔐 Security

### Authentication
- ✅ Yêu cầu JWT token hợp lệ
- ✅ Token được verify qua middleware

### Authorization
- ✅ Chỉ tạo notebook cho chính user đó
- ✅ Kiểm tra quyền premium cho template premium
- ✅ Không cho phép copy template draft

### Data Validation
- ✅ Kiểm tra template tồn tại
- ✅ Kiểm tra template published
- ✅ Kiểm tra subscription active (nếu premium)

---

## 📊 Performance

### Metrics
- **Lần đầu (tạo mới):** ~200ms (với 150 từ vựng)
- **Lần sau (trả về):** ~50ms
- **Database queries:** 2-3 queries

### Optimization
- ✅ Transaction đảm bảo atomicity
- ✅ Batch insert vocabularies
- ✅ Index trên (user_id, template_id)
- ✅ Connection pooling

---

## 🐛 Troubleshooting

### Lỗi: "Template không tồn tại"

**Nguyên nhân:**
- Template đã bị xóa
- Template có status = 'draft'
- Template không phải system notebook (user_id != NULL)

**Giải pháp:**
```sql
-- Kiểm tra template
SELECT id, user_id, status FROM "Notebooks" 
WHERE id = 'template-id';

-- Đảm bảo: user_id = NULL, status = 'published'
```

### Lỗi: "Cần gói premium"

**Nguyên nhân:** Template có `is_premium = true` nhưng user không có subscription

**Giải pháp:**
- User cần mua gói premium
- Hoặc admin đổi template thành free

### Lỗi: Transaction failed

**Nguyên nhân:** Lỗi database khi copy

**Giải pháp:**
1. Kiểm tra database connection
2. Kiểm tra disk space
3. Xem logs chi tiết
4. Retry request

---

## 🎨 UI/UX Recommendations

### Loading State
```javascript
// Hiển thị skeleton hoặc spinner khi đang load
<Skeleton count={5} />
```

### Success Message
```javascript
// Nếu isNew = true
<Alert type="success">
  🎉 Đã tạo bản sao sổ tay! Bắt đầu học ngay nào!
</Alert>

// Nếu isNew = false
<Alert type="info">
  📚 Tiếp tục học từ chỗ đã dừng
</Alert>
```

### Error Handling
```javascript
// 403 - Cần premium
<Modal>
  <h3>Nâng cấp Premium</h3>
  <p>Sổ tay này chỉ dành cho thành viên Premium</p>
  <Button onClick={goToPremium}>Nâng cấp ngay</Button>
</Modal>

// 404 - Không tìm thấy
<Alert type="error">
  Sổ tay không tồn tại hoặc đã bị gỡ
</Alert>
```

---

## 📈 Analytics

### Track Events

```javascript
// Khi tạo bản sao mới
analytics.track('notebook_copied', {
  template_id: templateId,
  template_name: notebook.name,
  vocab_count: notebook.vocab_count,
  is_premium: notebook.is_premium
});

// Khi trả về bản sao hiện có
analytics.track('notebook_accessed', {
  notebook_id: notebook.id,
  template_id: templateId
});
```

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Author:** Development Team
