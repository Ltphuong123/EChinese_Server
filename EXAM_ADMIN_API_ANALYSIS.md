# PHÂN TÍCH CHI TIẾT CÁC API EXAMS CHO ADMIN

## 📋 MỤC LỤC
1. [Tổng quan hệ thống](#tổng-quan-hệ-thống)
2. [Danh sách API](#danh-sách-api)
3. [Chi tiết từng API](#chi-tiết-từng-api)
4. [Cấu trúc dữ liệu](#cấu-trúc-dữ-liệu)
5. [Xác thực và phân quyền](#xác-thực-và-phân-quyền)
6. [Xử lý lỗi](#xử-lý-lỗi)
7. [Logging](#logging)

---

## 🎯 TỔNG QUAN HỆ THỐNG

### Kiến trúc
- **Pattern**: MVC (Model-View-Controller)
- **Database**: PostgreSQL
- **Authentication**: JWT Token
- **Authorization**: Role-based (admin, super admin)

### Các thành phần chính
- **Routes** (`routes/examRoutes.js`): Định nghĩa endpoints
- **Controllers** (`controllers/examController.js`): Xử lý request/response
- **Services** (`services/examService.js`): Business logic
- **Models** (`models/examModel.js`): Database operations

---

## 📝 DANH SÁCH API

### API Quản lý Bài thi

| STT | Method | Endpoint | Chức năng | Quyền |
|-----|--------|----------|-----------|-------|
| 1 | POST | `/api/admin/exams` | Tạo bài thi mới | Admin |
| 2 | GET | `/api/admin/exams` | Lấy danh sách bài thi | Admin |
| 3 | GET | `/api/admin/exams/:id` | Lấy chi tiết bài thi | Admin |
| 4 | PUT | `/api/admin/exams/:id` | Cập nhật bài thi | Admin |
| 5 | GET | `/api/admin/exams/:id/check-attempts` | Kiểm tra đã có người làm | Admin |
| 6 | POST | `/api/admin/exams/:id/publish` | Công bố bài thi | Admin |
| 7 | POST | `/api/admin/exams/:id/unpublish` | Hủy công bố | Admin |
| 8 | POST | `/api/admin/exams/:id/delete` | Xóa mềm | Admin |
| 9 | POST | `/api/admin/exams/:id/restore` | Khôi phục | Admin |
| 10 | DELETE | `/api/admin/exams/:id/force` | Xóa vĩnh viễn | Admin |
| 11 | POST | `/api/admin/exams/:examIdToCopy/duplicate` | Sao chép bài thi | Admin |


---

## 🔍 CHI TIẾT TỪNG API

### 1. TẠO BÀI THI MỚI

**Endpoint**: `POST /api/admin/exams`

**Middleware**: 
- `authMiddleware.verifyToken` - Xác thực JWT token
- `authMiddleware.isAdmin` - Kiểm tra quyền admin

**Controller**: `examController.createFullExamAdmin`

**Request Body**:
```json
{
  "name": "Tên bài thi",
  "description": "Mô tả bài thi",
  "instructions": "Hướng dẫn làm bài",
  "total_time_minutes": 120,
  "exam_type_id": "uuid",
  "exam_level_id": "uuid",
  "is_published": false,
  "sections": [
    {
      "name": "Listening",
      "description": "Phần nghe",
      "time_minutes": 30,
      "audio_url": "https://...",
      "subsections": [
        {
          "name": "Part 1",
          "description": "Mô tả",
          "audio_url": "https://...",
          "prompts": [
            {
              "id": "temp_id_1",
              "content": "Nội dung prompt",
              "image": "url hoặc object",
              "audio_url": "https://..."
            }
          ],
          "questions": [
            {
              "question_type_id": "uuid",
              "content": "Câu hỏi",
              "points": 1,
              "image_url": "https://...",
              "audio_url": "https://...",
              "prompt_id": "temp_id_1",
              "options": [
                {
                  "label": "A",
                  "content": "Đáp án A",
                  "is_correct": true,
                  "image_url": "https://..."
                }
              ],
              "correct_answers": [
                {
                  "answer": "correct answer text"
                }
              ],
              "explanation": {
                "content": "Giải thích đáp án"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

**Response Success** (201):
```json
{
  "success": true,
  "message": "Tạo bài thi hoàn chỉnh thành công.",
  "data": {
    "id": "uuid",
    "name": "Tên bài thi",
    "description": "...",
    "is_published": false,
    "section_count": 4,
    "total_questions": 100,
    "sections": [{"name": "Listening"}, ...]
  }
}
```

**Response Error** (400):
```json
{
  "success": false,
  "message": "Thiếu thông tin bắt buộc: name, exam_type_id, hoặc sections."
}
```

**Đặc điểm**:
- Tạo toàn bộ cấu trúc bài thi trong 1 transaction
- Mapping prompt_id tạm thời với ID thực tế trong DB
- Hỗ trợ image dạng string, array hoặc object
- Tự động log hành động admin
- Rollback toàn bộ nếu có lỗi


---

### 2. LẤY DANH SÁCH BÀI THI

**Endpoint**: `GET /api/admin/exams`

**Middleware**: `verifyToken`, `isAdmin`

**Controller**: `examController.getAllExamsAdmin`

**Query Parameters**:
- `page` (number, default: 1) - Trang hiện tại
- `limit` (number, default: 10) - Số bài thi mỗi trang
- `search` (string) - Tìm kiếm theo tên
- `examTypeId` (uuid) - Lọc theo loại bài thi
- `examLevelId` (uuid) - Lọc theo cấp độ
- `is_published` (boolean) - Lọc theo trạng thái công bố

**Response Success** (200):
```json
{
  "success": true,
  "message": "Lấy danh sách bài thi thành công.",
  "data": [
    {
      "id": "uuid",
      "name": "Tên bài thi",
      "description": "...",
      "instructions": "...",
      "total_time_minutes": 120,
      "is_published": true,
      "is_deleted": false,
      "version_at": null,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "exam_type_id": "uuid",
      "exam_type_name": "TOEIC",
      "exam_level_id": "uuid",
      "exam_level_name": "Intermediate",
      "section_count": 4,
      "total_questions": 100,
      "sections": [
        {"name": "Listening"},
        {"name": "Reading"}
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

**Đặc điểm**:
- Hỗ trợ phân trang
- Sắp xếp: Bài thi có `version_at` xuống cuối, sau đó theo `created_at` giảm dần
- Hiển thị tất cả bài thi (kể cả đã xóa mềm)
- Tính toán số section và tổng số câu hỏi

---

### 3. LẤY CHI TIẾT BÀI THI

**Endpoint**: `GET /api/admin/exams/:id`

**Middleware**: `verifyToken`, `isAdmin`

**Controller**: `examController.getExamByIdAdmin`

**Response Success** (200):
```json
{
  "success": true,
  "message": "Lấy chi tiết bài thi thành công.",
  "data": {
    "id": "uuid",
    "name": "Tên bài thi",
    "exam_type_name": "TOEIC",
    "exam_level_name": "Intermediate",
    "sections": [
      {
        "id": "uuid",
        "name": "Listening",
        "description": "...",
        "time_minutes": 30,
        "audio_url": "https://...",
        "order": 0,
        "subsections": [
          {
            "id": "uuid",
            "name": "Part 1",
            "description": "...",
            "audio_url": "https://...",
            "order": 0,
            "prompts": [
              {
                "id": "uuid",
                "content": "...",
                "image_json": {
                  "type": "single_image",
                  "url": "https://..."
                },
                "audio_url": "https://...",
                "order": 0
              }
            ],
            "questions": [
              {
                "id": "uuid",
                "content": "Câu hỏi",
                "points": 1,
                "image_url": "https://...",
                "audio_url": "https://...",
                "correct_answer": "text answer",
                "prompt_id": "uuid",
                "options": [
                  {
                    "id": "uuid",
                    "label": "A",
                    "content": "Đáp án A",
                    "is_correct": true,
                    "image_url": "https://...",
                    "order": 0
                  }
                ],
                "correct_answers": [
                  {
                    "id": "uuid",
                    "question_id": "uuid",
                    "answer": "correct text"
                  }
                ],
                "explanation": {
                  "id": "uuid",
                  "content": "Giải thích",
                  "question_id": "uuid"
                }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Response Error** (404):
```json
{
  "success": false,
  "message": "Bài thi không tồn tại."
}
```

**Đặc điểm**:
- Trả về TOÀN BỘ cấu trúc bài thi (nested JSON)
- Bao gồm cả đáp án và giải thích
- Sử dụng subquery để tối ưu performance
- Prompt image được trả về dạng JSON object


---

### 4. CẬP NHẬT BÀI THI

**Endpoint**: `PUT /api/admin/exams/:id`

**Middleware**: `verifyToken`, `isAdmin`

**Controller**: `examController.updateFullExamAdmin`

**Request Body**: Giống như API tạo bài thi

**Response Success - Trường hợp 1: Chưa có ai làm** (200):
```json
{
  "success": true,
  "message": "Cập nhật bài thi hoàn chỉnh thành công.",
  "data": [
    {
      "id": "uuid-cũ",
      "name": "Tên bài thi",
      "is_published": true,
      "section_count": 4,
      "total_questions": 100
    }
  ]
}
```

**Response Success - Trường hợp 2: Đã có người làm** (200):
```json
{
  "success": true,
  "message": "Đã tạo bản sao mới (bài thi cũ đã có người làm). Cả 2 bài đều đã unpublish.",
  "data": [
    {
      "id": "uuid-cũ",
      "name": "Tên bài thi",
      "is_published": false,
      "version_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid-mới",
      "name": "Tên bài thi",
      "is_published": true,
      "version_at": null
    }
  ]
}
```

**Logic đặc biệt**:

1. **Kiểm tra attempts**:
   ```sql
   SELECT COUNT(*) FROM "User_Exam_Attempts" WHERE exam_id = $1
   ```

2. **Nếu chưa có ai làm**:
   - Xóa toàn bộ sections cũ (CASCADE xóa subsections, questions, options...)
   - Tạo lại cấu trúc mới
   - Tự động publish
   - Trả về 1 bài thi

3. **Nếu đã có người làm**:
   - Unpublish bài thi cũ
   - Set `version_at = created_at` cho bài cũ
   - Tạo bài thi mới với cấu trúc đã cập nhật
   - Publish bài mới
   - Trả về 2 bài thi (cũ và mới)

**Đặc điểm**:
- Bảo toàn dữ liệu người dùng đã làm
- Sử dụng transaction để đảm bảo tính toàn vẹn
- Tự động log hành động

---

### 5. KIỂM TRA ĐÃ CÓ NGƯỜI LÀM

**Endpoint**: `GET /api/admin/exams/:id/check-attempts`

**Middleware**: `verifyToken`, `isAdmin`

**Controller**: `examController.checkExamHasAttempts`

**Response Success** (200):
```json
{
  "success": true,
  "message": "Đề thi đã có 25 người làm (50 lượt)",
  "data": {
    "exam_id": "uuid",
    "has_attempts": true,
    "total_attempts": 50,
    "unique_users": 25,
    "first_attempt_at": "2024-01-01T10:00:00Z",
    "last_attempt_at": "2024-01-15T15:30:00Z"
  }
}
```

**Response khi chưa có ai làm**:
```json
{
  "success": true,
  "message": "Đề thi chưa có ai làm",
  "data": {
    "exam_id": "uuid",
    "has_attempts": false,
    "total_attempts": 0,
    "unique_users": 0,
    "first_attempt_at": null,
    "last_attempt_at": null
  }
}
```

**Đặc điểm**:
- Đếm tổng số lượt làm bài
- Đếm số người dùng unique
- Hiển thị thời gian làm bài đầu tiên và cuối cùng
- Hữu ích để quyết định có nên cập nhật hay không


---

### 6. CÔNG BỐ BÀI THI

**Endpoint**: `POST /api/admin/exams/:id/publish`

**Middleware**: `verifyToken`, `isAdmin`

**Controller**: `examController.publishExamAdmin`

**Response Success** (200):
```json
{
  "success": true,
  "message": "Công bố bài thi thành công.",
  "data": {
    "id": "uuid",
    "name": "Tên bài thi",
    "is_published": true,
    "section_count": 4,
    "total_questions": 100
  }
}
```

**Đặc điểm**:
- Set `is_published = true`
- Tự động log hành động với action_type: "PUBLISH_EXAM"
- Trả về format đơn giản của bài thi

---

### 7. HỦY CÔNG BỐ BÀI THI

**Endpoint**: `POST /api/admin/exams/:id/unpublish`

**Middleware**: `verifyToken`, `isAdmin`

**Controller**: `examController.unpublishExamAdmin`

**Response Success** (200):
```json
{
  "success": true,
  "message": "Hủy công bố bài thi thành công.",
  "data": {
    "id": "uuid",
    "name": "Tên bài thi",
    "is_published": false,
    "section_count": 4,
    "total_questions": 100
  }
}
```

**Đặc điểm**:
- Set `is_published = false`
- Người dùng sẽ không thấy bài thi này nữa
- Tự động log hành động với action_type: "UNPUBLISH_EXAM"

---

### 8. XÓA MỀM BÀI THI

**Endpoint**: `POST /api/admin/exams/:id/delete`

**Middleware**: `verifyToken`, `isAdmin`

**Controller**: `examController.softDeleteExamAdmin`

**Response Success** (200):
```json
{
  "success": true,
  "message": "Khôi phục bài thi thành công.",
  "data": {
    "id": "uuid",
    "name": "Tên bài thi",
    "is_deleted": true,
    "is_published": false
  }
}
```

**Đặc điểm**:
- Set `is_deleted = true`
- Tự động unpublish (`is_published = false`)
- Dữ liệu vẫn còn trong database
- Có thể khôi phục sau
- Tự động log với action_type: "TRASH_EXAM"

---

### 9. KHÔI PHỤC BÀI THI

**Endpoint**: `POST /api/admin/exams/:id/restore`

**Middleware**: `verifyToken`, `isAdmin`

**Controller**: `examController.restoreExamAdmin`

**Response Success** (200):
```json
{
  "success": true,
  "message": "Khôi phục bài thi thành công.",
  "data": {
    "id": "uuid",
    "name": "Tên bài thi",
    "is_deleted": false,
    "is_published": false
  }
}
```

**Đặc điểm**:
- Set `is_deleted = false`
- Trạng thái `is_published` vẫn là `false` (cần publish lại thủ công)
- Tự động log với action_type: "RESTORE_EXAM"


---

### 10. XÓA VĨNH VIỄN BÀI THI

**Endpoint**: `DELETE /api/admin/exams/:id/force`

**Middleware**: `verifyToken`, `isAdmin`

**Controller**: `examController.forceDeleteExamAdmin`

**Response Success** (200):
```json
{
  "success": true,
  "message": "Thành công"
}
```

**Response Error** (404):
```json
{
  "success": false,
  "message": "Bài thi không tồn tại."
}
```

**Đặc điểm**:
- XÓA VĨNH VIỄN khỏi database
- KHÔNG THỂ KHÔI PHỤC
- Xóa theo thứ tự để tránh lỗi foreign key:
  1. Options, Prompt_Questions, Correct_Answers, Explanations
  2. Questions, Prompts
  3. Subsections
  4. Sections
  5. Exam
- Sử dụng transaction
- Tự động log với action_type: "FORCE_DELETE_EXAM"

**⚠️ Cảnh báo**: API này rất nguy hiểm, nên:
- Chỉ Super Admin mới có quyền (comment trong code gợi ý)
- Cần confirm từ người dùng trước khi gọi
- Xóa toàn bộ dữ liệu liên quan

---

### 11. SAO CHÉP BÀI THI

**Endpoint**: `POST /api/admin/exams/:examIdToCopy/duplicate`

**Middleware**: `verifyToken`, `isAdmin`

**Controller**: `examController.duplicateExamAdmin`

**Response Success** (201):
```json
{
  "success": true,
  "message": "Sao chép bài thi thành công.",
  "data": {
    "id": "uuid-mới",
    "name": "Tên bài thi (Bản sao)",
    "is_published": false,
    "section_count": 4,
    "total_questions": 100
  }
}
```

**Logic sao chép**:

1. **Đọc toàn bộ cấu trúc bài thi gốc**:
   - Sử dụng `examModel.findById()` để lấy nested structure

2. **Chuẩn bị dữ liệu mới**:
   - Thêm " (Bản sao)" vào tên
   - Set `is_published = false`
   - Xóa tất cả ID cũ
   - Tạo ID tạm thời mới cho prompts để mapping

3. **Tạo bài thi mới**:
   - Tái sử dụng `examModel.createFullExam()`
   - Tất cả ID được tạo mới bởi database

**Đặc điểm**:
- Sao chép TOÀN BỘ cấu trúc (sections, subsections, prompts, questions, options, explanations)
- Bản sao mặc định là draft (unpublished)
- Tự động log với action_type: "DUPLICATE_EXAM"
- Hữu ích để tạo bài thi tương tự


---

## 🗂️ CẤU TRÚC DỮ LIỆU

### Cấu trúc Database

```
Exams (Bài thi)
├── id (uuid, PK)
├── name (varchar)
├── description (text)
├── instructions (text)
├── total_time_minutes (integer)
├── exam_type_id (uuid, FK)
├── exam_level_id (uuid, FK)
├── is_published (boolean)
├── is_deleted (boolean)
├── version_at (timestamp) - Đánh dấu bài thi cũ
├── created_by (uuid, FK)
├── created_at (timestamp)
└── updated_at (timestamp)

Sections (Phần thi - VD: Listening, Reading)
├── id (uuid, PK)
├── exam_id (uuid, FK) → Exams
├── name (varchar)
├── description (text)
├── time_minutes (integer)
├── audio_url (varchar)
├── order (integer)
└── ON DELETE CASCADE

Subsections (Phần con - VD: Part 1, Part 2)
├── id (uuid, PK)
├── section_id (uuid, FK) → Sections
├── name (varchar)
├── description (text)
├── audio_url (varchar)
├── order (integer)
└── ON DELETE CASCADE

Prompts (Đoạn văn/Hình ảnh chung cho nhiều câu hỏi)
├── id (uuid, PK)
├── subsection_id (uuid, FK) → Subsections
├── content (text)
├── image (jsonb) - Lưu dạng JSON
├── audio_url (varchar)
├── order (integer)
└── ON DELETE CASCADE

Questions (Câu hỏi)
├── id (uuid, PK)
├── subsection_id (uuid, FK) → Subsections
├── question_type_id (uuid, FK)
├── content (text)
├── points (numeric)
├── image_url (varchar)
├── audio_url (varchar)
├── correct_answer (text) - Cho câu tự luận
├── order (integer)
└── ON DELETE CASCADE

Prompt_Questions (Liên kết Prompt - Question)
├── prompt_id (uuid, FK) → Prompts
├── question_id (uuid, FK) → Questions
└── PK (prompt_id, question_id)

Options (Đáp án trắc nghiệm)
├── id (uuid, PK)
├── question_id (uuid, FK) → Questions
├── label (varchar) - A, B, C, D
├── content (text)
├── is_correct (boolean)
├── image_url (varchar)
├── order (integer)
└── ON DELETE CASCADE

Correct_Answers (Đáp án đúng cho câu điền từ)
├── id (uuid, PK)
├── question_id (uuid, FK) → Questions
├── answer (text)
└── ON DELETE RESTRICT

Explanations (Giải thích đáp án)
├── id (uuid, PK)
├── question_id (uuid, FK) → Questions
├── content (text)
└── ON DELETE RESTRICT
```

### Quan hệ CASCADE và RESTRICT

**ON DELETE CASCADE** (Tự động xóa):
- Sections → Subsections → Prompts, Questions → Options

**ON DELETE RESTRICT** (Cần xóa thủ công trước):
- Questions → Correct_Answers, Explanations
- Questions → Prompt_Questions

**Lý do**: Bảo vệ dữ liệu người dùng đã làm bài (User_Answers)


---

## 🔐 XÁC THỰC VÀ PHÂN QUYỀN

### JWT Authentication

**Header yêu cầu**:
```
Authorization: Bearer <jwt_token>
```

**Token payload**:
```json
{
  "id": "user_uuid",
  "email": "admin@example.com",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Middleware Chain

Tất cả API admin đều sử dụng:
```javascript
[authMiddleware.verifyToken, authMiddleware.isAdmin]
```

**Quy trình**:
1. `verifyToken`: Xác thực JWT token
   - Kiểm tra token có tồn tại
   - Verify signature với JWT_SECRET
   - Kiểm tra expiration
   - Gán `req.user = decoded`

2. `isAdmin`: Kiểm tra quyền
   - Cho phép: `role === 'admin'` hoặc `role === 'super admin'`
   - Từ chối: Các role khác

### Các loại lỗi xác thực

| Status | Message | Nguyên nhân |
|--------|---------|-------------|
| 401 | Không có token, truy cập bị từ chối | Thiếu Authorization header |
| 401 | Token đã hết hạn | Token expired |
| 403 | Token không hợp lệ | Invalid signature |
| 403 | Truy cập bị từ chối, chỉ dành cho admin | Không phải admin |

---

## ⚠️ XỬ LÝ LỖI

### Các loại lỗi phổ biến

#### 1. Validation Error (400)
```json
{
  "success": false,
  "message": "Thiếu thông tin bắt buộc: name, exam_type_id, hoặc sections."
}
```

#### 2. Not Found (404)
```json
{
  "success": false,
  "message": "Bài thi không tồn tại."
}
```

#### 3. Foreign Key Constraint (404)
```json
{
  "success": false,
  "message": "Lỗi ràng buộc khóa ngoại: Key (exam_type_id)=(uuid) is not present in table \"Exam_Types\"."
}
```

#### 4. Unique Constraint (409)
```json
{
  "success": false,
  "message": "Lỗi trùng lặp: duplicate key value violates unique constraint"
}
```

#### 5. Server Error (500)
```json
{
  "success": false,
  "message": "Lỗi máy chủ khi tạo bài thi",
  "error": "Chi tiết lỗi..."
}
```

### Transaction Rollback

Tất cả các thao tác phức tạp đều sử dụng transaction:
```javascript
try {
  await client.query('BEGIN');
  // ... operations
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

**Đảm bảo**:
- Tất cả thay đổi được commit cùng lúc
- Nếu có lỗi, rollback toàn bộ
- Không để database ở trạng thái không nhất quán


---

## 📊 LOGGING

### Admin Log Service

Tất cả hành động admin đều được log tự động:

```javascript
await require('../services/adminLogService').createLog(
  {
    action_type: 'CREATE_EXAM',
    target_id: newExam.id,
    description: `Tạo bài thi: ${examData.name}`
  },
  userId
);
```

### Các action_type

| Action Type | Mô tả | API |
|-------------|-------|-----|
| CREATE_EXAM | Tạo bài thi mới | POST /admin/exams |
| UPDATE_EXAM | Cập nhật bài thi | PUT /admin/exams/:id |
| DUPLICATE_EXAM | Sao chép bài thi | POST /admin/exams/:id/duplicate |
| PUBLISH_EXAM | Công bố bài thi | POST /admin/exams/:id/publish |
| UNPUBLISH_EXAM | Hủy công bố | POST /admin/exams/:id/unpublish |
| TRASH_EXAM | Xóa mềm | POST /admin/exams/:id/delete |
| RESTORE_EXAM | Khôi phục | POST /admin/exams/:id/restore |
| FORCE_DELETE_EXAM | Xóa vĩnh viễn | DELETE /admin/exams/:id/force |

### Thông tin được log

- **user_id**: Admin thực hiện hành động
- **action_type**: Loại hành động
- **target_id**: ID của bài thi
- **description**: Mô tả chi tiết
- **timestamp**: Thời gian thực hiện

---

## 🎯 BEST PRACTICES

### 1. Quy trình tạo bài thi mới

```
1. Chuẩn bị dữ liệu JSON đầy đủ
2. POST /api/admin/exams (is_published: false)
3. Kiểm tra kết quả
4. POST /api/admin/exams/:id/publish
```

### 2. Quy trình cập nhật bài thi

```
1. GET /api/admin/exams/:id/check-attempts
2. Nếu has_attempts = false:
   - PUT /api/admin/exams/:id (cập nhật trực tiếp)
3. Nếu has_attempts = true:
   - Cảnh báo người dùng
   - PUT /api/admin/exams/:id (tạo version mới)
   - Bài cũ giữ lại cho người đã làm
```

### 3. Quy trình xóa bài thi

```
1. POST /api/admin/exams/:id/delete (xóa mềm)
2. Nếu cần khôi phục:
   - POST /api/admin/exams/:id/restore
3. Nếu chắc chắn xóa vĩnh viễn:
   - DELETE /api/admin/exams/:id/force
   - ⚠️ Cần confirm từ người dùng
```

### 4. Quy trình sao chép bài thi

```
1. POST /api/admin/exams/:id/duplicate
2. GET /api/admin/exams/:newId (lấy chi tiết)
3. PUT /api/admin/exams/:newId (chỉnh sửa nếu cần)
4. POST /api/admin/exams/:newId/publish
```


---

## 🔧 TỐI ƯU HÓA PERFORMANCE

### 1. Database Query Optimization

**Sử dụng Subquery thay vì JOIN**:
```sql
-- Tránh DISTINCT với nhiều bảng
SELECT e.*, 
  (SELECT jsonb_agg(...) FROM "Sections" WHERE ...) as sections
FROM "Exams" e
```

**Lợi ích**:
- Tránh duplicate rows
- Giảm memory usage
- Dễ maintain

### 2. Transaction Management

**Connection Pooling**:
```javascript
const client = await db.pool.connect();
try {
  // operations
} finally {
  client.release(); // Luôn release
}
```

### 3. Pagination

**Luôn sử dụng LIMIT và OFFSET**:
```javascript
const { page = 1, limit = 10 } = req.query;
const offset = (page - 1) * limit;
```

### 4. Lazy Loading

**API danh sách**: Chỉ trả về thông tin cơ bản
```json
{
  "id": "uuid",
  "name": "...",
  "section_count": 4,
  "total_questions": 100
}
```

**API chi tiết**: Trả về toàn bộ nested structure

---

## 🧪 TESTING

### Test Cases quan trọng

#### 1. Tạo bài thi
- ✅ Tạo thành công với dữ liệu đầy đủ
- ✅ Tạo với prompts và questions liên kết
- ❌ Thiếu trường bắt buộc
- ❌ exam_type_id không tồn tại
- ❌ Rollback khi có lỗi giữa chừng

#### 2. Cập nhật bài thi
- ✅ Cập nhật khi chưa có ai làm
- ✅ Tạo version mới khi đã có người làm
- ✅ Bài cũ vẫn giữ nguyên cho người đã làm
- ❌ Bài thi không tồn tại

#### 3. Xóa bài thi
- ✅ Xóa mềm thành công
- ✅ Khôi phục thành công
- ✅ Xóa vĩnh viễn (cascade đúng thứ tự)
- ❌ Xóa vĩnh viễn khi còn foreign key

#### 4. Sao chép bài thi
- ✅ Sao chép toàn bộ cấu trúc
- ✅ ID mới được tạo
- ✅ Bản sao là draft
- ❌ Bài gốc không tồn tại

---

## 📝 NOTES

### 1. Trường `version_at`

**Mục đích**: Đánh dấu bài thi cũ khi có version mới

**Logic**:
- `version_at = null`: Bài thi hiện tại (active)
- `version_at = created_at`: Bài thi cũ (archived)

**Sắp xếp**:
```sql
ORDER BY 
  CASE WHEN version_at IS NULL THEN 0 ELSE 1 END,
  created_at DESC
```
→ Bài thi active lên đầu, bài archived xuống cuối

### 2. Prompt Image Format

**3 dạng được hỗ trợ**:

1. **Single Image** (string):
   ```json
   "image": "https://example.com/image.jpg"
   ```
   → Lưu DB: `{"type": "single_image", "url": "..."}`

2. **Image List** (array):
   ```json
   "image": ["url1", "url2", "url3"]
   ```
   → Lưu DB: `{"type": "image_list", "images": [...]}`

3. **Custom Object**:
   ```json
   "image": {"type": "custom", "data": {...}}
   ```
   → Lưu DB: Giữ nguyên

### 3. Question Types

Hệ thống hỗ trợ nhiều loại câu hỏi:
- **Multiple Choice**: Có options với is_correct
- **Fill in the Blank**: Có correct_answers
- **Essay**: Có correct_answer (text)
- **Listening/Reading**: Kết hợp với audio_url

### 4. Scoring

**Tính điểm**:
- Mỗi question có `points` (numeric)
- Tổng điểm = SUM(points) của các câu đúng
- Lưu trong `User_Exam_Attempts.score_total`


---

## 🚨 COMMON ISSUES & SOLUTIONS

### Issue 1: Foreign Key Constraint Error

**Lỗi**:
```
Key (exam_type_id)=(uuid) is not present in table "Exam_Types"
```

**Nguyên nhân**: exam_type_id hoặc exam_level_id không tồn tại

**Giải pháp**:
1. Kiểm tra danh sách exam types: `GET /api/exam-types`
2. Kiểm tra danh sách exam levels: `GET /api/exam-levels`
3. Sử dụng ID hợp lệ

### Issue 2: Transaction Timeout

**Lỗi**: Transaction bị timeout khi tạo/cập nhật bài thi lớn

**Giải pháp**:
1. Tăng timeout trong connection pool
2. Chia nhỏ bài thi (giảm số câu hỏi)
3. Tối ưu query (đã implement)

### Issue 3: Duplicate Prompt ID

**Lỗi**: Prompt ID mapping bị sai khi tạo/cập nhật

**Giải pháp**:
- Sử dụng ID tạm thời unique: `temp_prompt_${Date.now()}_${Math.random()}`
- Map trước khi tạo questions

### Issue 4: Cascade Delete Failed

**Lỗi**: Không thể xóa exam vì còn foreign key

**Nguyên nhân**: Bảng có ON DELETE RESTRICT (Correct_Answers, Explanations)

**Giải pháp**:
- Xóa thủ công theo thứ tự (đã implement trong forceDeleteExam)
- Hoặc sử dụng soft delete

### Issue 5: Version Conflict

**Vấn đề**: Admin A và Admin B cùng cập nhật 1 bài thi

**Giải pháp hiện tại**: Last write wins (người sau ghi đè)

**Giải pháp tốt hơn** (chưa implement):
- Thêm trường `version_number`
- Kiểm tra version trước khi update
- Trả về conflict error nếu version không khớp

---

## 📚 RELATED APIs

### APIs liên quan khác

1. **Exam Types**: `GET /api/exam-types`
   - Lấy danh sách loại bài thi (TOEIC, IELTS, ...)

2. **Exam Levels**: `GET /api/exam-levels`
   - Lấy danh sách cấp độ (Beginner, Intermediate, ...)

3. **Question Types**: `GET /api/question-types`
   - Lấy danh sách loại câu hỏi

4. **User Exam Attempts**: `GET /api/admin/attempts`
   - Xem lịch sử làm bài của users

5. **Admin Logs**: `GET /api/admin/logs`
   - Xem lịch sử hành động admin

---

## 🎓 EXAMPLE WORKFLOWS

### Workflow 1: Tạo bài thi TOEIC hoàn chỉnh

```javascript
// 1. Lấy exam_type_id và exam_level_id
const types = await fetch('/api/exam-types');
const levels = await fetch('/api/exam-levels');

// 2. Chuẩn bị dữ liệu
const examData = {
  name: "TOEIC Practice Test 1",
  description: "Full TOEIC test with 200 questions",
  instructions: "Complete all sections within time limit",
  total_time_minutes: 120,
  exam_type_id: "toeic-uuid",
  exam_level_id: "intermediate-uuid",
  is_published: false,
  sections: [
    {
      name: "Listening",
      time_minutes: 45,
      subsections: [
        {
          name: "Part 1 - Photographs",
          prompts: [
            {
              id: "temp_1",
              image: "https://...",
              audio_url: "https://..."
            }
          ],
          questions: [
            {
              question_type_id: "multiple-choice-uuid",
              content: "Question 1",
              points: 1,
              prompt_id: "temp_1",
              options: [
                { label: "A", content: "Answer A", is_correct: true },
                { label: "B", content: "Answer B", is_correct: false },
                { label: "C", content: "Answer C", is_correct: false },
                { label: "D", content: "Answer D", is_correct: false }
              ],
              explanation: {
                content: "The correct answer is A because..."
              }
            }
          ]
        }
      ]
    }
  ]
};

// 3. Tạo bài thi
const response = await fetch('/api/admin/exams', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(examData)
});

const result = await response.json();
const examId = result.data.id;

// 4. Publish
await fetch(`/api/admin/exams/${examId}/publish`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Workflow 2: Cập nhật bài thi an toàn

```javascript
// 1. Kiểm tra có ai làm chưa
const checkResponse = await fetch(
  `/api/admin/exams/${examId}/check-attempts`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
const checkData = await checkResponse.json();

// 2. Cảnh báo nếu có người làm
if (checkData.data.has_attempts) {
  const confirm = window.confirm(
    `Đã có ${checkData.data.unique_users} người làm bài này. ` +
    `Cập nhật sẽ tạo version mới. Tiếp tục?`
  );
  if (!confirm) return;
}

// 3. Cập nhật
const updateResponse = await fetch(`/api/admin/exams/${examId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(updatedExamData)
});

const result = await updateResponse.json();

// 4. Xử lý kết quả
if (result.data.length === 2) {
  console.log('Đã tạo version mới:', result.data[1].id);
  console.log('Bài cũ:', result.data[0].id);
} else {
  console.log('Cập nhật thành công:', result.data[0].id);
}
```

---

## 🔗 POSTMAN COLLECTION

### Base URL
```
http://localhost:3000/api
```

### Environment Variables
```json
{
  "base_url": "http://localhost:3000/api",
  "admin_token": "your_jwt_token_here",
  "exam_id": "uuid_here"
}
```

### Headers (Global)
```
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

---

## 📞 SUPPORT

Nếu có vấn đề hoặc câu hỏi:
1. Kiểm tra logs trong console
2. Kiểm tra admin logs: `GET /api/admin/logs`
3. Kiểm tra database constraints
4. Liên hệ team backend

---

**Tài liệu được tạo**: 2024
**Phiên bản**: 1.0
**Tác giả**: Backend Team
