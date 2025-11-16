# Fix Lỗi total_questions Trả Về 0

## Vấn Đề
API `GET /api/exams` (getPublishedExamsForUser) trả về `"total_questions": 0` cho tất cả các bài thi, mặc dù bài thi có câu hỏi.

## Nguyên Nhân
Query SQL trong hàm `findPublishedExams` (models/examModel.js) đang SELECT trực tiếp cột `e.total_questions` từ bảng `Exams`:

```sql
SELECT 
  e.id,
  e.name,
  e.description,
  e.total_time_minutes,
  e.total_questions,  -- ❌ Cột này không được cập nhật hoặc luôn là 0
  ...
FROM "Exams" e
```

**Vấn đề:** Cột `total_questions` trong bảng `Exams` không được tự động cập nhật khi thêm/xóa câu hỏi.

## Giải Pháp

Thay thế việc SELECT trực tiếp cột `e.total_questions` bằng một **subquery** để đếm số câu hỏi thực tế:

```sql
SELECT 
  e.id,
  e.name,
  e.description,
  e.total_time_minutes,
  (
    SELECT COUNT(*)
    FROM "Questions" q
    JOIN "Subsections" ss ON q.subsection_id = ss.id
    JOIN "Sections" s ON ss.section_id = s.id
    WHERE s.exam_id = e.id
  ) as total_questions,  -- ✅ Đếm số câu hỏi thực tế
  ...
FROM "Exams" e
```

## Code Đã Sửa

**File:** `models/examModel.js`  
**Hàm:** `findPublishedExams`  
**Dòng:** ~768

### Trước khi sửa:
```javascript
const selectQuery = `
  SELECT
    e.id,
    e.name,
    e.description,
    e.total_time_minutes,
    e.total_questions,  // ❌ Lấy từ cột trong bảng
    e.exam_type_id,
    et.name as exam_type_name,
    e.exam_level_id,
    el.name as exam_level_name
  FROM "Exams" e
  JOIN "Exam_Types" et ON e.exam_type_id = et.id
  JOIN "Exam_Levels" el ON e.exam_level_id = el.id
  ${whereClauses}
  ORDER BY e.created_at DESC
  LIMIT $${queryParams.length + 1}
  OFFSET $${queryParams.length + 2};
`;
```

### Sau khi sửa:
```javascript
const selectQuery = `
  SELECT
    e.id,
    e.name,
    e.description,
    e.total_time_minutes,
    (
      SELECT COUNT(*)
      FROM "Questions" q
      JOIN "Subsections" ss ON q.subsection_id = ss.id
      JOIN "Sections" s ON ss.section_id = s.id
      WHERE s.exam_id = e.id
    ) as total_questions,  // ✅ Đếm số câu hỏi thực tế
    e.exam_type_id,
    et.name as exam_type_name,
    e.exam_level_id,
    el.name as exam_level_name
  FROM "Exams" e
  JOIN "Exam_Types" et ON e.exam_type_id = et.id
  JOIN "Exam_Levels" el ON e.exam_level_id = el.id
  ${whereClauses}
  ORDER BY e.created_at DESC
  LIMIT $${queryParams.length + 1}
  OFFSET $${queryParams.length + 2};
`;
```

## Cách Hoạt Động

**Subquery đếm số câu hỏi:**
1. Bắt đầu từ bảng `Questions`
2. JOIN với `Subsections` (câu hỏi thuộc subsection nào)
3. JOIN với `Sections` (subsection thuộc section nào)
4. Lọc theo `exam_id` (section thuộc bài thi nào)
5. COUNT(*) để đếm tổng số câu hỏi

**Kết quả:** Mỗi bài thi sẽ có `total_questions` chính xác bằng số câu hỏi thực tế trong database.

## Ví Dụ

**Giả sử bài thi có cấu trúc:**
```
Exam (id: 123)
├── Section 1
│   ├── Subsection 1.1
│   │   ├── Question 1
│   │   └── Question 2
│   └── Subsection 1.2
│       └── Question 3
└── Section 2
    └── Subsection 2.1
        ├── Question 4
        └── Question 5
```

**Subquery sẽ đếm:**
- Question 1, 2, 3, 4, 5 → **total_questions = 5**

## Ưu & Nhược Điểm

### ✅ Ưu Điểm
1. **Chính xác 100%:** Luôn trả về số câu hỏi thực tế
2. **Không cần maintain:** Không cần cập nhật cột `total_questions` khi thêm/xóa câu hỏi
3. **Đơn giản:** Không cần trigger hoặc stored procedure

### ⚠️ Nhược Điểm
1. **Performance:** Subquery chạy cho mỗi bài thi trong danh sách
   - Với 10 bài thi → 10 subquery
   - Với 100 bài thi → 100 subquery

### 💡 Tối Ưu Hóa (Nếu Cần)

Nếu danh sách bài thi lớn và performance chậm, có thể:

**Option 1: Sử dụng LEFT JOIN với GROUP BY**
```sql
SELECT 
  e.id,
  e.name,
  e.description,
  e.total_time_minutes,
  COUNT(DISTINCT q.id) as total_questions,
  e.exam_type_id,
  et.name as exam_type_name,
  e.exam_level_id,
  el.name as exam_level_name
FROM "Exams" e
JOIN "Exam_Types" et ON e.exam_type_id = et.id
JOIN "Exam_Levels" el ON e.exam_level_id = el.id
LEFT JOIN "Sections" s ON s.exam_id = e.id
LEFT JOIN "Subsections" ss ON ss.section_id = s.id
LEFT JOIN "Questions" q ON q.subsection_id = ss.id
WHERE e.is_published = true AND e.is_deleted = false
GROUP BY e.id, et.name, el.name
ORDER BY e.created_at DESC
LIMIT 10 OFFSET 0;
```

**Option 2: Sử dụng Materialized View hoặc Cache**
- Tạo materialized view để cache số câu hỏi
- Refresh khi có thay đổi

**Option 3: Maintain cột total_questions bằng Trigger**
- Tạo trigger để tự động cập nhật khi INSERT/DELETE Question
- Phức tạp hơn nhưng performance tốt nhất

## Kết Luận

✅ Fix đã được áp dụng cho hàm `findPublishedExams`  
✅ API `GET /api/exams` giờ sẽ trả về `total_questions` chính xác  
✅ Không cần thay đổi database schema  
⚠️ Nếu có vấn đề về performance, xem xét các option tối ưu hóa ở trên
