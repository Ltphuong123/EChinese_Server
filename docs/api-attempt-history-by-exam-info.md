# API: Lấy lịch sử làm bài theo thông tin bài thi

## Mục đích
Cho phép user xem tất cả các lần họ đã làm các bài thi có cùng `exam_type_id`, `exam_level_id` và `name`.

Ví dụ: Nếu có 3 bài thi cùng tên "HSK 1 - Đề thi mẫu" trong HSK Level 1, API này sẽ trả về lịch sử làm bài của cả 3 bài đó.

## Endpoint

```
GET /api/attempts/history/by-exam-info
```

## Authentication
Yêu cầu JWT token trong header:
```
Authorization: Bearer <token>
```

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| exam_type_id | uuid | Yes | ID của loại bài thi (HSK, HSKK, TOCFL) |
| exam_level_id | uuid | Yes | ID của cấp độ (HSK1, HSK2, ...) |
| exam_name | string | Yes | Tên bài thi (chính xác) |

## Request Example

```bash
GET /api/attempts/history/by-exam-info?exam_type_id=123e4567-e89b-12d3-a456-426614174000&exam_level_id=123e4567-e89b-12d3-a456-426614174001&exam_name=HSK%201%20-%20Đề%20thi%20mẫu
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Response Success (200)

```json
{
  "success": true,
  "message": "Lấy lịch sử làm bài thành công",
  "data": [
    {
      "attempt_id": "550e8400-e29b-41d4-a716-446655440000",
      "exam_id": "660e8400-e29b-41d4-a716-446655440001",
      "exam_name": "HSK 1 - Đề thi mẫu",
      "exam_type_name": "HSK",
      "exam_level_name": "HSK 1",
      "start_time": "2024-01-15T10:00:00.000Z",
      "end_time": "2024-01-15T11:30:00.000Z",
      "score_total": 185,
      "is_passed": true,
      "attempt_number": 2,
      "created_at": "2024-01-15T10:00:00.000Z"
    },
    {
      "attempt_id": "550e8400-e29b-41d4-a716-446655440002",
      "exam_id": "660e8400-e29b-41d4-a716-446655440003",
      "exam_name": "HSK 1 - Đề thi mẫu",
      "exam_type_name": "HSK",
      "exam_level_name": "HSK 1",
      "start_time": "2024-01-10T14:00:00.000Z",
      "end_time": "2024-01-10T15:30:00.000Z",
      "score_total": 165,
      "is_passed": false,
      "attempt_number": 1,
      "created_at": "2024-01-10T14:00:00.000Z"
    }
  ]
}
```

## Response Error

### 400 - Bad Request (Thiếu tham số)
```json
{
  "success": false,
  "message": "Thiếu tham số: exam_type_id, exam_level_id, exam_name là bắt buộc"
}
```

### 401 - Unauthorized (Chưa đăng nhập)
```json
{
  "success": false,
  "message": "Token không hợp lệ hoặc đã hết hạn"
}
```

### 500 - Internal Server Error
```json
{
  "success": false,
  "message": "Lỗi khi lấy lịch sử làm bài",
  "error": "Chi tiết lỗi..."
}
```

## Use Cases

### 1. Xem lịch sử làm tất cả các đề "HSK 1 - Đề thi mẫu"
User muốn xem tất cả các lần họ đã làm các bài thi có tên "HSK 1 - Đề thi mẫu" (có thể có nhiều bài khác nhau cùng tên).

### 2. Thống kê tiến bộ
App có thể dùng API này để hiển thị biểu đồ tiến bộ của user qua các lần làm bài cùng loại.

### 3. So sánh kết quả
User có thể so sánh điểm số giữa các lần làm bài khác nhau.

## Notes

- API chỉ trả về các lần làm bài đã hoàn thành (`end_time IS NOT NULL`)
- Kết quả được sắp xếp theo thời gian tạo giảm dần (mới nhất trước)
- Nếu không có lịch sử nào, trả về mảng rỗng `[]`
- `exam_name` phải khớp chính xác (case-sensitive)

## Frontend Integration Example

```javascript
// React/React Native example
const getExamHistory = async (examTypeId, examLevelId, examName) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const params = new URLSearchParams({
      exam_type_id: examTypeId,
      exam_level_id: examLevelId,
      exam_name: examName
    });

    const response = await fetch(
      `${API_URL}/api/attempts/history/by-exam-info?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const result = await response.json();
    
    if (result.success) {
      console.log('Lịch sử làm bài:', result.data);
      return result.data;
    } else {
      console.error('Lỗi:', result.message);
    }
  } catch (error) {
    console.error('Lỗi kết nối:', error);
  }
};

// Sử dụng
const history = await getExamHistory(
  '123e4567-e89b-12d3-a456-426614174000',
  '123e4567-e89b-12d3-a456-426614174001',
  'HSK 1 - Đề thi mẫu'
);
```

## Database Query

API này thực hiện query sau:

```sql
SELECT 
  uea.id as attempt_id,
  uea.exam_id,
  e.name as exam_name,
  et.name as exam_type_name,
  el.name as exam_level_name,
  uea.start_time,
  uea.end_time,
  uea.score_total,
  uea.is_passed,
  uea.attempt_number,
  uea.created_at
FROM "User_Exam_Attempts" uea
JOIN "Exams" e ON uea.exam_id = e.id
JOIN "Exam_Types" et ON e.exam_type_id = et.id
JOIN "Exam_Levels" el ON e.exam_level_id = el.id
WHERE uea.user_id = $1
  AND e.exam_type_id = $2
  AND e.exam_level_id = $3
  AND e.name = $4
  AND uea.end_time IS NOT NULL
ORDER BY uea.created_at DESC
```

## Related APIs

- `POST /api/exams/:id/start-attempt` - Bắt đầu làm bài mới
- `GET /api/attempts/:attemptId/result` - Xem kết quả chi tiết một lần làm bài
- `GET /api/exams/:id/details` - Xem thông tin bài thi
