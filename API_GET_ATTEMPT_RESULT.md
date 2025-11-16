# API: Lấy Kết Quả Bài Thi

## Endpoint
```
GET /api/attempts/:attemptId/result
```

## Authentication
Yêu cầu token JWT trong header:
```
Authorization: Bearer <token>
```

## Parameters

### Path Parameters
- `attemptId` (UUID, required): ID của lượt làm bài

### Headers
- `Authorization` (string, required): Bearer token

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Lấy kết quả thành công.",
  "data": {
    "id": "uuid",
    "start_time": "2024-01-15T10:00:00.000Z",
    "end_time": "2024-01-15T11:30:00.000Z",
    "score_total": 85,
    "is_passed": true,
    "exam_name": "TOEIC Practice Test 1",
    "section_scores": [
      {
        "section_id": "uuid",
        "section_name": "Listening",
        "score": 45
      },
      {
        "section_id": "uuid",
        "section_name": "Reading",
        "score": 40
      }
    ],
    "questions": [
      {
        "question_id": "uuid",
        "question_content": "What is the main topic?",
        "question_order": 0,
        "user_response": "option-uuid-123",
        "is_correct": true,
        "correct_answer_text": null,
        "correct_answers_list": null,
        "explanation": {
          "id": "uuid",
          "content": "The correct answer is A because..."
        },
        "options": [
          {
            "id": "option-uuid-123",
            "label": "A",
            "content": "Business meeting",
            "is_correct": true
          },
          {
            "id": "option-uuid-456",
            "label": "B",
            "content": "Social event",
            "is_correct": false
          },
          {
            "id": "option-uuid-789",
            "label": "C",
            "content": "Conference",
            "is_correct": false
          }
        ]
      },
      {
        "question_id": "uuid",
        "question_content": "Arrange the words: [beautiful, is, very, she]",
        "question_order": 1,
        "user_response": "she is very beautiful",
        "is_correct": true,
        "correct_answer_text": null,
        "correct_answers_list": [
          "she is very beautiful",
          "she's very beautiful"
        ],
        "explanation": null,
        "options": null
      },
      {
        "question_id": "uuid",
        "question_content": "What is the capital of France?",
        "question_order": 2,
        "user_response": "Paris",
        "is_correct": true,
        "correct_answer_text": "Paris",
        "correct_answers_list": [
          "Paris",
          "paris"
        ],
        "explanation": {
          "id": "uuid",
          "content": "Paris is the capital and largest city of France."
        },
        "options": null
      }
    ]
  }
}
```

## Cấu Trúc Chi Tiết

### Root Object
| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Trạng thái thành công |
| `message` | string | Thông báo |
| `data` | object | Dữ liệu kết quả |

### Data Object
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | ID của lượt làm bài |
| `start_time` | ISO 8601 | Thời gian bắt đầu |
| `end_time` | ISO 8601 | Thời gian kết thúc |
| `score_total` | number | Tổng điểm |
| `is_passed` | boolean | Đạt/Không đạt |
| `exam_name` | string | Tên bài thi |
| `section_scores` | array | Điểm từng phần |
| `questions` | array | Chi tiết từng câu hỏi |

### Section Score Object
| Field | Type | Description |
|-------|------|-------------|
| `section_id` | UUID | ID của phần thi |
| `section_name` | string | Tên phần thi |
| `score` | number | Điểm của phần này |

### Question Object
| Field | Type | Description |
|-------|------|-------------|
| `question_id` | UUID | ID câu hỏi |
| `question_content` | string | Nội dung câu hỏi |
| `question_order` | number | Thứ tự câu hỏi |
| `user_response` | string/null | Câu trả lời của người dùng |
| `is_correct` | boolean/null | Đúng/Sai (null nếu chưa trả lời) |
| `correct_answer_text` | string/null | Đáp án đúng (dạng text) |
| `correct_answers_list` | array/null | Danh sách đáp án đúng |
| `explanation` | object/null | Giải thích |
| `options` | array/null | Các lựa chọn (cho câu trắc nghiệm) |

### Option Object
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | ID của option |
| `label` | string | Nhãn (A, B, C, D) |
| `content` | string | Nội dung lựa chọn |
| `is_correct` | boolean | Đây có phải đáp án đúng không |

### Explanation Object
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | ID của giải thích |
| `content` | string | Nội dung giải thích |

## Các Loại Câu Hỏi

### 1. Câu Trắc Nghiệm (Multiple Choice)
```json
{
  "question_id": "uuid",
  "question_content": "What is the main topic?",
  "user_response": "option-uuid-123",
  "is_correct": true,
  "correct_answer_text": null,
  "correct_answers_list": null,
  "explanation": { "id": "uuid", "content": "..." },
  "options": [
    { "id": "uuid", "label": "A", "content": "...", "is_correct": true },
    { "id": "uuid", "label": "B", "content": "...", "is_correct": false }
  ]
}
```
- `user_response`: ID của option được chọn
- `options`: Mảng các lựa chọn, có `is_correct` để hiển thị đáp án đúng
- `correct_answer_text`: null
- `correct_answers_list`: null

### 2. Câu Sắp Xếp (Ordering)
```json
{
  "question_id": "uuid",
  "question_content": "Arrange: [beautiful, is, very, she]",
  "user_response": "she is very beautiful",
  "is_correct": true,
  "correct_answer_text": null,
  "correct_answers_list": [
    "she is very beautiful",
    "she's very beautiful"
  ],
  "explanation": null,
  "options": null
}
```
- `user_response`: Chuỗi đã sắp xếp
- `correct_answers_list`: Mảng các đáp án đúng có thể chấp nhận
- `options`: null

### 3. Câu Viết (Short Answer)
```json
{
  "question_id": "uuid",
  "question_content": "What is the capital of France?",
  "user_response": "Paris",
  "is_correct": true,
  "correct_answer_text": "Paris",
  "correct_answers_list": ["Paris", "paris"],
  "explanation": { "id": "uuid", "content": "..." },
  "options": null
}
```
- `user_response`: Câu trả lời dạng text
- `correct_answer_text`: Đáp án chính
- `correct_answers_list`: Các biến thể được chấp nhận
- `options`: null

### 4. Câu Ghi Âm (Audio Response)
```json
{
  "question_id": "uuid",
  "question_content": "Describe the picture",
  "user_response": "https://storage.example.com/audio/abc123.mp3",
  "is_correct": true,
  "correct_answer_text": null,
  "correct_answers_list": null,
  "explanation": null,
  "options": null
}
```
- `user_response`: URL của file ghi âm
- `is_correct`: true nếu có ghi âm, false nếu không
- Tất cả các trường khác: null

## Error Responses

### 403 Forbidden - Lượt làm bài không hợp lệ
```json
{
  "success": false,
  "message": "Lượt làm bài không hợp lệ."
}
```
**Nguyên nhân:**
- `attemptId` không thuộc về `userId` trong token
- Người dùng cố truy cập kết quả của người khác

### 404 Not Found - Chưa hoàn thành
```json
{
  "success": false,
  "message": "Lượt làm bài không hợp lệ hoặc chưa hoàn thành."
}
```
**Nguyên nhân:**
- Bài thi chưa được nộp (`score_total IS NULL`)
- `attemptId` không tồn tại

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Lỗi khi lấy kết quả",
  "error": "Error message"
}
```

## Luồng Xử Lý

```
Client Request
    ↓
Controller (attemptController.getAttemptResult)
    ├─ Lấy attemptId từ params
    ├─ Lấy userId từ token
    └─ Gọi attemptService.getGradedResult(attemptId, userId)
        ↓
Service (attemptService.getGradedResult)
    └─ Gọi attemptModel.getFinalResult(attemptId, userId)
        ↓
Model (attemptModel.getFinalResult)
    ├─ Query database với điều kiện:
    │   ├─ a.id = attemptId
    │   ├─ a.user_id = userId
    │   └─ a.score_total IS NOT NULL (đã nộp bài)
    ├─ JOIN với Exams, Sections, Questions, Options, etc.
    ├─ Aggregate section_scores
    └─ Aggregate questions với đầy đủ thông tin
        ↓
Return JSON Response
```

## SQL Query Tóm Tắt

```sql
SELECT
    a.id, a.start_time, a.end_time, a.score_total, a.is_passed,
    ex.name as exam_name,
    
    -- Điểm từng phần
    (SELECT jsonb_agg(...) FROM "User_Section_Scores" ...) as section_scores,
    
    -- Chi tiết từng câu hỏi
    (SELECT jsonb_agg(question_details ORDER BY question_order ASC)
     FROM (
         SELECT
             q.id, q.content, q."order",
             ua.user_response, ua.is_correct,
             q.correct_answer,
             (SELECT jsonb_agg(ca.answer) FROM "Correct_Answers" ...) as correct_answers_list,
             (SELECT jsonb_build_object(...) FROM "Explanations" ...) as explanation,
             (SELECT jsonb_agg(...) FROM "Options" ...) as options
         FROM "Questions" q
         LEFT JOIN "User_Answers" ua ON ...
         WHERE s.exam_id = a.exam_id
     ) as question_details
    ) as questions
    
FROM "User_Exam_Attempts" a
JOIN "Exams" ex ON a.exam_id = ex.id
WHERE a.id = $1 AND a.user_id = $2 AND a.score_total IS NOT NULL;
```

## Use Cases

### 1. Hiển thị kết quả sau khi nộp bài
```javascript
// Sau khi submit attempt thành công
const attemptId = submitResponse.data.attemptId;

// Lấy kết quả chi tiết
const result = await fetch(`/api/attempts/${attemptId}/result`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Hiển thị:
// - Tổng điểm: result.data.score_total
// - Đạt/Không đạt: result.data.is_passed
// - Điểm từng phần: result.data.section_scores
// - Chi tiết từng câu: result.data.questions
```

### 2. Xem lại bài thi đã làm
```javascript
// Từ lịch sử làm bài
const attemptId = history[0].id;

// Lấy kết quả để review
const result = await fetch(`/api/attempts/${attemptId}/result`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Hiển thị:
// - Câu nào đúng/sai
// - Đáp án đúng là gì
// - Giải thích cho từng câu
```

## Lưu Ý Quan Trọng

### ⚠️ Bảo Mật
- API chỉ trả về kết quả nếu `userId` trong token khớp với `user_id` của attempt
- Không thể xem kết quả của người khác

### ⚠️ Điều Kiện
- Chỉ trả về kết quả nếu bài thi đã được nộp (`score_total IS NOT NULL`)
- Nếu chưa nộp → 404 Not Found

### ⚠️ Đáp Án
- API này **TRẢ VỀ ĐẦY ĐỦ ĐÁP ÁN ĐÚNG**
- `options[].is_correct`: Hiển thị option nào là đáp án đúng
- `correct_answers_list`: Danh sách các đáp án được chấp nhận
- Dùng để review sau khi làm bài, không dùng trong khi làm bài

### ⚠️ Performance
- Query khá phức tạp với nhiều subquery
- Nếu bài thi có nhiều câu hỏi (>100), có thể chậm
- Xem xét cache kết quả sau khi nộp bài

## Tóm Tắt

✅ Trả về đầy đủ thông tin kết quả bài thi  
✅ Bao gồm điểm số, đúng/sai, đáp án, giải thích  
✅ Hỗ trợ tất cả loại câu hỏi  
✅ Bảo mật: Chỉ xem được kết quả của chính mình  
✅ Điều kiện: Phải nộp bài mới có kết quả
