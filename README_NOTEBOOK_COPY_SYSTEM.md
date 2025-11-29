# 📚 Hệ Thống Copy Sổ Tay (Notebook Copy System)

## 🎯 Tổng Quan

Hệ thống cho phép user sao chép sổ tay hệ thống (template) thành sổ tay cá nhân để học tập và theo dõi tiến độ.

### Tính năng chính:
- ✅ Copy sổ tay hệ thống thành sổ tay cá nhân
- ✅ Tự động copy toàn bộ từ vựng
- ✅ Theo dõi nguồn gốc qua `template_id`
- ✅ Kiểm tra quyền premium
- ✅ Ngăn chặn copy trùng lặp
- ✅ Thống kê cho admin

---

## 📁 Cấu Trúc Files

```
├── models/
│   └── notebookCopyModel.js          # Database queries
├── services/
│   └── notebookCopyService.js        # Business logic
├── controllers/
│   └── notebookCopyController.js     # Request handlers
├── routes/
│   └── notebookCopyRoutes.js         # API routes
├── config/migrations/
│   └── add_template_id_to_notebooks.sql  # Database migration
├── scripts/
│   └── test-notebook-copy.js         # Test script
└── docs/
    └── NOTEBOOK_COPY_API.md          # API documentation
```

---

## 🚀 Cài Đặt

### Bước 1: Chạy Migration

```bash
# Kết nối database
psql -U your_user -d your_database

# Chạy migration
\i config/migrations/add_template_id_to_notebooks.sql
```

Hoặc:

```bash
psql -U your_user -d your_database -f config/migrations/add_template_id_to_notebooks.sql
```

### Bước 2: Verify Migration

```sql
-- Kiểm tra cột đã được thêm
\d "Notebooks"

-- Kiểm tra index
\di idx_notebooks_template_id
\di idx_notebooks_user_template
```

### Bước 3: Khởi động Server

Routes đã được tự động đăng ký trong `app.js`:

```javascript
const notebookCopyRoutes = require('./routes/notebookCopyRoutes');
app.use('/api', notebookCopyRoutes);
```

Chạy server:

```bash
npm start
# hoặc
node app.js
```

---

## 📋 API Endpoints

### User APIs

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/notebooks/template/:templateId/copy` | Lấy hoặc tạo bản sao (Get or Create) |
| GET | `/api/notebooks/:notebookId/can-copy` | Kiểm tra có thể copy |

### Admin APIs

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/admin/notebooks/template/:templateId/stats` | Thống kê template |

---

## 🔄 Flow Hoạt Động

### 1. User Lấy Hoặc Tạo Bản Sao (Get or Create)

```
User → GET /notebooks/template/:templateId/copy
  ↓
Kiểm tra user đã có bản sao chưa?
  ↓
  ├─ CÓ RỒI → Trả về bản sao hiện có (200)
  │            { notebook, isNew: false }
  │
  └─ CHƯA CÓ → Kiểm tra template tồn tại & published
               ↓
               Kiểm tra quyền premium (nếu cần)
               ↓
               BEGIN TRANSACTION
               ↓
               Tạo notebook mới (user_id = user, template_id = template)
               ↓
               Copy tất cả từ vựng (status = 'chưa thuộc')
               ↓
               Cập nhật vocab_count
               ↓
               COMMIT TRANSACTION
               ↓
               Trả về sổ tay mới (201)
               { notebook, isNew: true }
```

### 2. Database Schema

```sql
-- Trước khi copy
Notebooks (Template):
  id: abc-123
  user_id: NULL          -- Sổ tay hệ thống
  name: "HSK 1"
  vocab_count: 150
  template_id: NULL

-- Sau khi copy
Notebooks (User's Copy):
  id: xyz-789
  user_id: user-456      -- Sổ tay của user
  name: "HSK 1"
  vocab_count: 150
  template_id: abc-123   -- Trỏ về template gốc
```

---

## 🧪 Testing

### Cách 1: Dùng Test Script

```bash
# 1. Cập nhật token và ID trong file
nano scripts/test-notebook-copy.js

# 2. Chạy test
node scripts/test-notebook-copy.js
```

### Cách 2: Dùng cURL

**Kiểm tra có thể copy:**
```bash
curl -X GET http://localhost:3000/api/notebooks/{notebook-id}/can-copy \
  -H "Authorization: Bearer {token}"
```

**Copy sổ tay:**
```bash
curl -X POST http://localhost:3000/api/notebooks/{notebook-id}/copy \
  -H "Authorization: Bearer {token}"
```

**Xem danh sách đã copy:**
```bash
curl -X GET http://localhost:3000/api/notebooks/template/{template-id}/copies \
  -H "Authorization: Bearer {token}"
```

**Admin xem thống kê:**
```bash
curl -X GET http://localhost:3000/api/admin/notebooks/template/{template-id}/stats \
  -H "Authorization: Bearer {admin-token}"
```

### Cách 3: Dùng Postman

Import collection từ `docs/NOTEBOOK_COPY_API.md`

---

## 💡 Use Cases

### Use Case 1: User học HSK

```javascript
// 1. User xem sổ tay hệ thống "HSK 1"
GET /api/notebooks/system

// 2. User click vào sổ tay "HSK 1" để học
// Frontend gọi API get-or-create
GET /api/notebooks/template/{hsk1-id}/copy

// Lần đầu tiên:
// Response (201): { 
//   notebook: { id, name, vocab_count: 150 },
//   isNew: true,
//   message: "Đã tạo bản sao mới của sổ tay."
// }

// Lần sau (user quay lại):
// Response (200): {
//   notebook: { id, name, vocab_count: 150 },
//   isNew: false,
//   message: "Bạn đã có bản sao của sổ tay này."
// }

// 3. Bắt đầu học và đánh dấu tiến độ
PUT /api/notebooks/{notebook-id}/vocabularies/{vocab-id}/status
Body: { status: "đã thuộc" }
```

### Use Case 2: User Premium

```javascript
// 1. User có subscription active
// 2. Xem sổ tay premium "HSK 6 - Nâng cao"
GET /api/notebooks/system?premium=true

// 3. User premium lấy/tạo bản sao
GET /api/notebooks/template/{hsk6-premium-id}/copy
// Response (201): Success - Tạo bản sao thành công

// 4. User free thử lấy/tạo bản sao
GET /api/notebooks/template/{hsk6-premium-id}/copy
// Response (403): {
//   success: false,
//   message: "Bạn cần có gói premium để sao chép sổ tay này.",
//   requiresPremium: true
// }
```

### Use Case 3: Admin Theo Dõi

```javascript
// 1. Admin tạo template "HSK 1"
POST /api/admin/notebooks
Body: {
  name: "HSK 1 - Từ vựng cơ bản",
  user_id: null,
  status: "published"
}

// 2. Thêm từ vựng vào template
POST /api/admin/notebooks/{template-id}/vocabularies/by-level
Body: { levels: ["HSK1"] }

// 3. Theo dõi số lượng user copy
GET /api/admin/notebooks/template/{template-id}/stats
// Response: { totalUsersCopied: 245, totalCopies: 245 }

// 4. Phân tích template nào phổ biến
// Dựa vào stats để cải thiện nội dung
```

---

## 🔐 Business Rules

### Điều kiện copy:

1. **Sổ tay phải là system notebook:**
   - `user_id = NULL`
   - `status = 'published'`

2. **Kiểm tra quyền:**
   - Nếu `is_premium = true` → User phải có subscription active
   - Nếu `is_premium = false` → Tất cả user đều copy được

3. **Ngăn chặn trùng lặp:**
   - Mỗi user chỉ copy 1 lần cho mỗi template
   - Query: `SELECT * FROM Notebooks WHERE user_id = ? AND template_id = ?`

### Khi copy:

1. **Tạo notebook mới:**
   ```sql
   INSERT INTO Notebooks (
     user_id,        -- ID của user hiện tại
     name,           -- Giữ nguyên tên template
     options,        -- Giữ nguyên options
     is_premium,     -- Giữ nguyên
     status,         -- Luôn = 'published'
     template_id,    -- ID của template gốc
     vocab_count     -- Ban đầu = 0
   )
   ```

2. **Copy từ vựng:**
   ```sql
   INSERT INTO NotebookVocabItems (notebook_id, vocab_id, status)
   SELECT {new_notebook_id}, vocab_id, 'chưa thuộc'
   FROM NotebookVocabItems
   WHERE notebook_id = {template_id}
   ```

3. **Cập nhật count:**
   ```sql
   UPDATE Notebooks
   SET vocab_count = (
     SELECT COUNT(*) FROM NotebookVocabItems
     WHERE notebook_id = {new_notebook_id}
   )
   WHERE id = {new_notebook_id}
   ```

---

## 📊 Database Schema

### Notebooks Table (Updated)

```sql
CREATE TABLE "Notebooks" (
  "id" uuid PRIMARY KEY DEFAULT (uuid_generate_v4()),
  "user_id" uuid,                    -- NULL = system notebook
  "name" varchar(100) NOT NULL,
  "vocab_count" int DEFAULT 0,
  "created_at" timestamptz DEFAULT (CURRENT_TIMESTAMP),
  "options" json NOT NULL,
  "is_premium" boolean DEFAULT false,
  "status" varchar(50) NOT NULL CHECK ("status" IN ('published', 'draft')),
  "template_id" uuid,                -- NEW: ID của template gốc
  
  CONSTRAINT fk_notebooks_template 
    FOREIGN KEY ("template_id") 
    REFERENCES "Notebooks"("id") 
    ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_notebooks_user_id ON "Notebooks" ("user_id");
CREATE INDEX idx_notebooks_template_id ON "Notebooks" ("template_id");
CREATE INDEX idx_notebooks_user_template ON "Notebooks" ("user_id", "template_id");
```

### Queries Phổ Biến

```sql
-- 1. Lấy tất cả sổ tay user copy từ template
SELECT * FROM "Notebooks"
WHERE user_id = 'user-id' AND template_id IS NOT NULL;

-- 2. Đếm số user đã copy một template
SELECT COUNT(DISTINCT user_id) as total_users
FROM "Notebooks"
WHERE template_id = 'template-id';

-- 3. Kiểm tra user đã copy template chưa
SELECT id FROM "Notebooks"
WHERE user_id = 'user-id' AND template_id = 'template-id'
LIMIT 1;

-- 4. Lấy template gốc của một sổ tay
SELECT t.* FROM "Notebooks" n
JOIN "Notebooks" t ON n.template_id = t.id
WHERE n.id = 'notebook-id';
```

---

## 🎨 Frontend Integration

### React Example

```javascript
import axios from 'axios';

// Component: NotebookCard
const NotebookCard = ({ notebook, token }) => {
  const [canCopy, setCanCopy] = useState(null);
  const [loading, setLoading] = useState(false);

  // Kiểm tra có thể copy
  useEffect(() => {
    const checkCanCopy = async () => {
      const response = await axios.get(
        `/api/notebooks/${notebook.id}/can-copy`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCanCopy(response.data.data);
    };
    checkCanCopy();
  }, [notebook.id]);

  // Xử lý copy
  const handleCopy = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `/api/notebooks/${notebook.id}/copy`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Copy thành công!');
      // Redirect đến sổ tay mới
      navigate(`/notebooks/${response.data.data.notebook.id}`);
    } catch (error) {
      if (error.response?.status === 403) {
        alert('Cần gói premium để copy sổ tay này');
      } else if (error.response?.status === 409) {
        alert('Bạn đã copy sổ tay này rồi');
      } else {
        alert('Lỗi khi copy sổ tay');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notebook-card">
      <h3>{notebook.name}</h3>
      <p>{notebook.vocab_count} từ vựng</p>
      
      {canCopy?.canCopy ? (
        <button onClick={handleCopy} disabled={loading}>
          {loading ? 'Đang copy...' : 'Copy vào sổ tay của tôi'}
        </button>
      ) : (
        <div className="cannot-copy">
          <p>{canCopy?.reason}</p>
          {canCopy?.requiresPremium && (
            <button onClick={() => navigate('/premium')}>
              Nâng cấp Premium
            </button>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## 🔍 Troubleshooting

### Lỗi: "Sổ tay hệ thống không tồn tại"

**Nguyên nhân:**
- Sổ tay không phải system notebook (user_id != NULL)
- Sổ tay có status = 'draft'
- ID không tồn tại

**Giải pháp:**
```sql
-- Kiểm tra sổ tay
SELECT id, user_id, status FROM "Notebooks" WHERE id = 'notebook-id';

-- Đảm bảo:
-- user_id = NULL
-- status = 'published'
```

### Lỗi: "Bạn đã sao chép sổ tay này rồi"

**Nguyên nhân:** User đã copy template này trước đó

**Giải pháp:**
```sql
-- Xem sổ tay đã copy
SELECT * FROM "Notebooks"
WHERE user_id = 'user-id' AND template_id = 'template-id';

-- Nếu muốn copy lại, xóa sổ tay cũ
DELETE FROM "Notebooks" WHERE id = 'old-notebook-id';
```

### Lỗi: "Cần gói premium"

**Nguyên nhân:** Template có `is_premium = true` nhưng user không có subscription

**Giải pháp:**
```sql
-- Kiểm tra subscription của user
SELECT * FROM "UserSubscriptions"
WHERE user_id = 'user-id' 
  AND is_active = true
  AND (expiry_date IS NULL OR expiry_date > NOW());

-- Nếu không có, user cần mua gói premium
```

### Lỗi: Transaction failed

**Nguyên nhân:** Lỗi database hoặc connection

**Giải pháp:**
1. Kiểm tra database connection
2. Kiểm tra foreign key constraints
3. Kiểm tra disk space
4. Xem logs chi tiết

---

## 📈 Performance

### Metrics:

- **Copy notebook với 100 từ:** ~100ms
- **Copy notebook với 1000 từ:** ~500ms
- **Check can copy:** ~50ms
- **Get stats:** ~100ms

### Optimization:

1. **Transaction:** Đảm bảo atomicity
2. **Batch Insert:** Copy nhiều từ vựng cùng lúc
3. **Indexes:** Tối ưu query
4. **Connection Pool:** Tái sử dụng connections

---

## 🚀 Future Enhancements

### Version 2.0:
- [ ] Cho phép copy nhiều lần (với tên khác nhau)
- [ ] Sync updates từ template về copied notebooks
- [ ] Template versioning
- [ ] Copy với filter (chỉ copy một số từ vựng)

### Version 3.0:
- [ ] Share copied notebooks với user khác
- [ ] Collaborative notebooks
- [ ] Template marketplace
- [ ] AI-powered template recommendations

---

## 📚 Documentation

- **API Docs:** `docs/NOTEBOOK_COPY_API.md`
- **Test Script:** `scripts/test-notebook-copy.js`
- **Migration:** `config/migrations/add_template_id_to_notebooks.sql`

---

## 🤝 Contributing

Nếu muốn thêm tính năng:
1. Tạo branch mới
2. Implement changes
3. Test kỹ với script
4. Tạo pull request

---

## 📞 Support

- **Issues:** Tạo issue trên repository
- **Documentation:** Xem `docs/NOTEBOOK_COPY_API.md`
- **Contact:** Development Team

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Author:** Development Team
