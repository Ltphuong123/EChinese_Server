# Chức năng Update Đề Thi với Versioning

## 🎯 Mục đích

Cho phép admin cập nhật đề thi mà không ảnh hưởng đến người dùng đã làm bài, đồng thời đảm bảo tính toàn vẹn dữ liệu.

## 📋 Logic hoạt động

### Trường hợp 1: Đề thi CHƯA có người làm

```
Admin cập nhật đề thi
    ↓
Kiểm tra: Chưa có ai làm bài
    ↓
1. Unpublish đề thi (is_published = false)
2. Cập nhật nội dung như bình thường
3. Trả về đề thi đã cập nhật
```

**Kết quả:**
- ✅ Đề thi được cập nhật trực tiếp
- ✅ Đề thi bị unpublish (admin cần publish lại)
- ✅ Không tạo bản sao

### Trường hợp 2: Đề thi ĐÃ có người làm

```
Admin cập nhật đề thi
    ↓
Kiểm tra: Đã có người làm bài
    ↓
1. Unpublish đề thi cũ (is_published = false)
2. Set version_at = thời gian hiện tại cho đề cũ
3. Tạo bản sao mới với:
   - Cùng tên với đề cũ
   - Nội dung đã được cập nhật
   - is_published = false (unpublish)
   - version_at = NULL
4. Trả về cả 2 đề thi (cũ và mới)
```

**Kết quả:**
- ✅ Đề thi cũ vẫn tồn tại (cho người đã làm review)
- ✅ Đề thi cũ bị unpublish và có version_at
- ✅ Đề thi mới được tạo với nội dung cập nhật
- ✅ Đề thi mới cũng bị unpublish (admin cần publish)
- ✅ Cả 2 đề có cùng tên

## 🔌 API Endpoint

```
PUT /api/admin/exams/:id
```

### Request

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Body:**
```json
{
  "name": "HSK 1 - Đề thi mẫu",
  "exam_type_id": "uuid-here",
  "exam_level_id": "uuid-here",
  "description": {...},
  "instructions": "...",
  "total_time_minutes": 120,
  "sections": [...]
}
```

### Response - Trường hợp 1 (Chưa có người làm)

```json
{
  "success": true,
  "message": "Cập nhật bài thi thành công (chưa có người làm)",
  "action": "updated",
  "data": {
    "action": "updated",
    "message": "Cập nhật bài thi thành công (chưa có người làm)",
    "exam": {
      "id": "exam-uuid",
      "name": "HSK 1 - Đề thi mẫu",
      "is_published": false,
      "version_at": null,
      "sections": [...]
    }
  }
}
```

### Response - Trường hợp 2 (Đã có người làm)

```json
{
  "success": true,
  "message": "Đã tạo bản sao mới (bài thi cũ đã có người làm). Cả 2 bài đều đã unpublish.",
  "action": "duplicated",
  "data": {
    "action": "duplicated",
    "message": "Đã tạo bản sao mới (bài thi cũ đã có người làm). Cả 2 bài đều đã unpublish.",
    "oldExam": {
      "id": "old-exam-uuid",
      "name": "HSK 1 - Đề thi mẫu",
      "is_published": false,
      "version_at": "2024-01-15T10:30:00.000Z"
    },
    "newExam": {
      "id": "new-exam-uuid",
      "name": "HSK 1 - Đề thi mẫu",
      "is_published": false,
      "version_at": null,
      "sections": [...]
    }
  }
}
```

## 💡 Workflow cho Admin

### Khi cập nhật đề thi:

1. **Gọi API PUT /api/admin/exams/:id**
2. **Kiểm tra response.action:**
   - Nếu `action === "updated"`: 
     - Đề thi đã được cập nhật
     - Cần publish lại nếu muốn
   - Nếu `action === "duplicated"`:
     - Có 2 đề thi: cũ và mới
     - Đề cũ: Giữ lại cho người đã làm review
     - Đề mới: Chứa nội dung cập nhật
     - Cần publish đề mới nếu muốn user mới làm

### UI Suggestions:

```
┌─────────────────────────────────────────────┐
│ Cập nhật đề thi: HSK 1 - Đề thi mẫu        │
├─────────────────────────────────────────────┤
│                                             │
│ ⚠️ Thông báo:                              │
│                                             │
│ [Nếu chưa có người làm]                    │
│ Đề thi sẽ được cập nhật trực tiếp và       │
│ tự động unpublish. Bạn cần publish lại     │
│ sau khi cập nhật.                          │
│                                             │
│ [Nếu đã có người làm]                      │
│ Hệ thống sẽ tạo bản sao mới với nội dung   │
│ cập nhật. Đề cũ vẫn giữ lại cho người đã  │
│ làm. Cả 2 đề đều sẽ unpublish.            │
│                                             │
│ [Lưu thay đổi]                             │
└─────────────────────────────────────────────┘
```

### Sau khi cập nhật thành công:

```
┌─────────────────────────────────────────────┐
│ ✅ Cập nhật thành công!                    │
├─────────────────────────────────────────────┤
│                                             │
│ [Nếu action = "updated"]                   │
│ Đề thi đã được cập nhật.                   │
│ [Publish ngay] [Xem chi tiết]              │
│                                             │
│ [Nếu action = "duplicated"]                │
│ Đã tạo bản sao mới:                        │
│                                             │
│ 📄 Đề cũ (ID: xxx)                         │
│    - Unpublished                           │
│    - Version: 15/01/2024 10:30             │
│    - [Xem chi tiết]                        │
│                                             │
│ 📄 Đề mới (ID: yyy)                        │
│    - Unpublished                           │
│    - Nội dung đã cập nhật                  │
│    - [Publish ngay] [Xem chi tiết]         │
│                                             │
└─────────────────────────────────────────────┘
```

## 🔍 Query để xem các version

```sql
-- Xem tất cả các version của một đề thi (cùng tên)
SELECT 
  id,
  name,
  is_published,
  version_at,
  created_at,
  CASE 
    WHEN version_at IS NULL THEN 'Bản mới nhất'
    ELSE 'Bản cũ'
  END as status
FROM "Exams"
WHERE exam_type_id = 'your-type-id'
  AND exam_level_id = 'your-level-id'
  AND name = 'HSK 1 - Đề thi mẫu'
ORDER BY 
  CASE WHEN version_at IS NULL THEN 0 ELSE 1 END,
  version_at DESC NULLS FIRST;
```

## 📊 Database Schema

### Bảng Exams

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | ID đề thi |
| name | varchar | Tên đề thi (có thể trùng) |
| exam_type_id | uuid | Loại đề thi |
| exam_level_id | uuid | Cấp độ |
| is_published | boolean | Trạng thái publish |
| version_at | timestamptz | Thời điểm tạo version (NULL = bản mới) |
| created_at | timestamptz | Thời điểm tạo |
| updated_at | timestamptz | Thời điểm cập nhật |

### Logic version_at:

- `version_at = NULL`: Đề thi mới nhất, đang active
- `version_at = <timestamp>`: Đề thi cũ, đã bị thay thế vào thời điểm đó

## ⚠️ Lưu ý quan trọng

1. **Cả 2 đề đều unpublish sau khi cập nhật**
   - Admin phải chủ động publish lại đề mới
   - Tránh user làm nhầm đề đang sửa

2. **Đề cũ vẫn tồn tại**
   - Người đã làm vẫn review được
   - Có thể xóa sau một thời gian (policy)

3. **Tên đề giữ nguyên**
   - Cả 2 đề có cùng tên
   - Phân biệt bằng version_at và ID

4. **Không tự động migrate attempts**
   - Attempts cũ vẫn trỏ đến đề cũ
   - Đảm bảo tính toàn vẹn lịch sử

## 🧪 Testing

### Test case 1: Cập nhật đề chưa có người làm

```javascript
// 1. Tạo đề thi mới
const exam = await createExam({...});

// 2. Cập nhật ngay (chưa có ai làm)
const result = await updateExam(exam.id, {...});

// Expect:
// - result.action === 'updated'
// - result.exam.is_published === false
// - Chỉ có 1 đề thi
```

### Test case 2: Cập nhật đề đã có người làm

```javascript
// 1. Tạo đề thi
const exam = await createExam({...});

// 2. User làm bài
await startAttempt(userId, exam.id);

// 3. Admin cập nhật
const result = await updateExam(exam.id, {...});

// Expect:
// - result.action === 'duplicated'
// - result.oldExam.is_published === false
// - result.oldExam.version_at !== null
// - result.newExam.is_published === false
// - result.newExam.version_at === null
// - Có 2 đề thi cùng tên
```

## 🔄 Rollback (nếu cần)

Nếu muốn quay lại logic cũ (không tạo bản sao):

```javascript
// Trong examService.js, đổi lại thành:
updateFullExam: async (examId, examData, userId) => {
  const updatedExam = await examModel.updateFullExam(examId, examData, userId);
  if (!updatedExam) {
    throw new Error("Bài thi không tồn tại.");
  }
  return updatedExam;
}
```
