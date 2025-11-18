# API: Kiểm tra đề thi đã có người làm chưa

## 🎯 Mục đích

Cho phép admin kiểm tra xem một đề thi đã có người làm chưa, bao nhiêu người đã làm, và thời gian làm bài đầu tiên/cuối cùng.

## 📋 Endpoint

```
GET /api/admin/exams/:id/check-attempts
```

## 🔐 Authentication

Yêu cầu JWT token với quyền admin:
```
Authorization: Bearer <admin_token>
```

## 📥 Request

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | uuid | Yes | ID của đề thi cần kiểm tra |

### Example Request

```bash
GET /api/admin/exams/550e8400-e29b-41d4-a716-446655440000/check-attempts
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📤 Response

### Success Response (200) - Đã có người làm

```json
{
  "success": true,
  "message": "Đề thi đã có 15 người làm (23 lượt)",
  "data": {
    "exam_id": "550e8400-e29b-41d4-a716-446655440000",
    "has_attempts": true,
    "total_attempts": 23,
    "unique_users": 15,
    "first_attempt_at": "2024-01-10T08:30:00.000Z",
    "last_attempt_at": "2024-01-15T14:20:00.000Z"
  }
}
```

### Success Response (200) - Chưa có người làm

```json
{
  "success": true,
  "message": "Đề thi chưa có ai làm",
  "data": {
    "exam_id": "550e8400-e29b-41d4-a716-446655440000",
    "has_attempts": false,
    "total_attempts": 0,
    "unique_users": 0,
    "first_attempt_at": null,
    "last_attempt_at": null
  }
}
```

### Error Response (404) - Đề thi không tồn tại

```json
{
  "success": false,
  "message": "Bài thi không tồn tại."
}
```

### Error Response (401) - Chưa đăng nhập

```json
{
  "success": false,
  "message": "Token không hợp lệ hoặc đã hết hạn"
}
```

### Error Response (403) - Không có quyền admin

```json
{
  "success": false,
  "message": "Bạn không có quyền truy cập"
}
```

### Error Response (500) - Lỗi server

```json
{
  "success": false,
  "message": "Lỗi khi kiểm tra đề thi",
  "error": "Chi tiết lỗi..."
}
```

## 📊 Response Fields

| Field | Type | Description |
|-------|------|-------------|
| exam_id | uuid | ID của đề thi |
| has_attempts | boolean | `true` nếu đã có người làm, `false` nếu chưa |
| total_attempts | number | Tổng số lượt làm bài (1 người có thể làm nhiều lần) |
| unique_users | number | Số người duy nhất đã làm bài |
| first_attempt_at | timestamp/null | Thời gian làm bài đầu tiên |
| last_attempt_at | timestamp/null | Thời gian làm bài gần nhất |

## 💡 Use Cases

### 1. Trước khi cập nhật đề thi

```javascript
// Kiểm tra trước khi cho phép sửa
const checkResult = await fetch(`/api/admin/exams/${examId}/check-attempts`);
const { data } = await checkResult.json();

if (data.has_attempts) {
  alert(`⚠️ Đề thi đã có ${data.unique_users} người làm. 
         Khi cập nhật, hệ thống sẽ tạo bản sao mới.`);
} else {
  alert('✅ Đề thi chưa có ai làm. Bạn có thể cập nhật trực tiếp.');
}
```

### 2. Hiển thị cảnh báo trong UI

```javascript
const ExamEditPage = ({ examId }) => {
  const [attemptInfo, setAttemptInfo] = useState(null);

  useEffect(() => {
    checkExamAttempts(examId).then(setAttemptInfo);
  }, [examId]);

  return (
    <div>
      {attemptInfo?.has_attempts && (
        <Alert type="warning">
          ⚠️ Đề thi này đã có {attemptInfo.unique_users} người làm 
          ({attemptInfo.total_attempts} lượt).
          Khi cập nhật, hệ thống sẽ tạo version mới.
        </Alert>
      )}
      
      <ExamEditForm examId={examId} />
    </div>
  );
};
```

### 3. Quyết định có cho phép xóa không

```javascript
const handleDelete = async (examId) => {
  const { data } = await checkExamAttempts(examId);
  
  if (data.has_attempts) {
    const confirm = window.confirm(
      `Đề thi đã có ${data.unique_users} người làm. 
       Bạn có chắc muốn xóa không?`
    );
    if (!confirm) return;
  }
  
  await deleteExam(examId);
};
```

## 🎨 UI Suggestions

### Badge hiển thị trạng thái

```jsx
{attemptInfo.has_attempts ? (
  <Badge color="orange">
    👥 {attemptInfo.unique_users} người đã làm
  </Badge>
) : (
  <Badge color="green">
    ✨ Chưa có ai làm
  </Badge>
)}
```

### Thông tin chi tiết

```
┌─────────────────────────────────────────────┐
│ Thống kê đề thi                             │
├─────────────────────────────────────────────┤
│ 👥 Số người làm: 15 người                   │
│ 📊 Tổng lượt làm: 23 lượt                   │
│ 📅 Lần đầu: 10/01/2024 08:30               │
│ 📅 Lần cuối: 15/01/2024 14:20              │
└─────────────────────────────────────────────┘
```

## 🔄 Integration với Update API

```javascript
const updateExam = async (examId, examData) => {
  // 1. Kiểm tra trước
  const checkResult = await fetch(
    `/api/admin/exams/${examId}/check-attempts`
  );
  const { data: attemptInfo } = await checkResult.json();

  // 2. Hiển thị thông báo phù hợp
  if (attemptInfo.has_attempts) {
    console.log('Sẽ tạo version mới');
  } else {
    console.log('Sẽ cập nhật trực tiếp');
  }

  // 3. Thực hiện update
  const updateResult = await fetch(
    `/api/admin/exams/${examId}`,
    {
      method: 'PUT',
      body: JSON.stringify(examData)
    }
  );

  return updateResult.json();
};
```

## 📝 Notes

- API này chỉ đếm số lượt làm bài, không quan tâm đến trạng thái hoàn thành
- Nếu user bắt đầu làm bài nhưng chưa nộp, vẫn được tính là "đã có người làm"
- Thời gian `first_attempt_at` và `last_attempt_at` dựa trên `start_time` của attempt
- `unique_users` đếm số user duy nhất, 1 user làm nhiều lần chỉ tính 1

## 🧪 Testing

### Test case 1: Đề thi mới (chưa có ai làm)

```bash
curl -X GET \
  http://localhost:3000/api/admin/exams/exam-id/check-attempts \
  -H "Authorization: Bearer admin-token"

# Expected:
# has_attempts: false
# total_attempts: 0
# unique_users: 0
```

### Test case 2: Đề thi đã có người làm

```bash
# 1. User làm bài
POST /api/exams/exam-id/start-attempt

# 2. Kiểm tra
GET /api/admin/exams/exam-id/check-attempts

# Expected:
# has_attempts: true
# total_attempts: 1
# unique_users: 1
```

### Test case 3: Nhiều user làm bài

```bash
# User A làm 2 lần, User B làm 1 lần

# Expected:
# has_attempts: true
# total_attempts: 3
# unique_users: 2
```

## 🔗 Related APIs

- `PUT /api/admin/exams/:id` - Cập nhật đề thi (sử dụng kết quả check này)
- `GET /api/admin/exams/:id` - Xem chi tiết đề thi
- `DELETE /api/admin/exams/:id/force` - Xóa vĩnh viễn đề thi
