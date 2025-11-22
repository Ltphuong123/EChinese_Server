# Cấu Trúc Trả Về Kết Quả Bài Thi (Sau Cập Nhật)

## API Endpoint
```
GET /api/attempts/:attemptId/result
```

## Cấu Trúc Response Chung

```json
{
  "success": true,
  "message": "Lấy kết quả thành công.",
  "data": {
    "id": "uuid",
    "start_time": "2024-01-15T10:00:00.000Z",
    "end_time": "2024-01-15T11:30:00.000Z",
    "score_total": 251,
    "is_passed": true,
    "exam_name": "HSK 3 Practice Test",
    "section_scores": [...],
    "questions": [...]
  }
}
```

## Chi Tiết Theo Loại Bài Thi

### 1. HSK (3 phần: Listening, Reading, Writing)

#### Response Example
```json
{
  "success": true,
  "message": "Lấy kết quả thành công.",
  "data": {
    "id": "attempt-uuid-123",
    "start_time": "2024-01-15T10:00:00.000Z",
    "end_time": "2024-01-15T11:30:00.000Z",
    "score_total": 251,
    "is_passed": true,
    "exam_name": "HSK 3 Practice Test",
    "section_scores": [
      {
        "section_id": "section-uuid-1",
        "section_name": "听力 (Listening)",
        "score": 88
      },
      {
        "section_id": "section-uuid-2",
        "section_name": "阅读 (Reading)",
        "score": 83
      },
      {
        "section_id": "section-uuid-3",
        "section_name": "书写 (Writing)",
        "score": 80
      }
    ],
    "questions": [
      {
        "question_id": "q-uuid-1",
        "question_content": "听录音，选择正确答案",
        "question_order": 0,
        "user_response": "option-uuid-a",
        "is_correct": true,
        "correct_answer_text": null,
        "correct_answers_list": null,
        "explanation": {
          "id": "exp-uuid-1",
          "content": "正确答案是A，因为..."
        },
        "options": [
          {
            "id": "option-uuid-a",
            "label": "A",
            "content": "去图书馆",
            "is_correct": true
          },
          {
            "id": "option-uuid-b",
            "label": "B",
            "content": "去电影院",
            "is_correct": false
          },
          {
            "id": "option-uuid-c",
            "label": "C",
            "content": "去公园",
            "is_correct": false
          },
          {
            "id": "option-uuid-d",
            "label": "D",
            "content": "去商店",
            "is_correct": false
          }
        ]
      }
    ]
  }
}
```

#### Đặc Điểm HSK
- **Tổng điểm:** 300 (HSK 3-6) hoặc 200 (HSK 1-2)
- **Điểm từng phần:** 0-100 (tính theo công thức: (Số câu đúng / Tổng câu) × 100)
- **Điều kiện đạt:** 
  - HSK 1-2: `score_total >= 120`
  - HSK 3-6: `score_total >= 180`
- **Số phần:** 2 (HSK 1-2) hoặc 3 (HSK 3-6)

### 2. HSKK (1 phần: Speaking)

#### Response Example
```json
{
  "success": true,
  "message": "Lấy kết quả thành công.",
  "data": {
    "id": "attempt-uuid-456",
    "start_time": "2024-01-15T14:00:00.000Z",
    "end_time": "2024-01-15T14:30:00.000Z",
    "score_total": 75,
    "is_passed": true,
    "exam_name": "HSKK 中级",
    "section_scores": [
      {
        "section_id": "section-uuid-4",
        "section_name": "口语 (Speaking)",
        "score": 75
      }
    ],
    "questions": [
      {
        "question_id": "q-uuid-10",
        "question_content": "请根据图片描述场景",
        "question_order": 0,
        "user_response": "https://storage.example.com/audio/user-recording-123.mp3",
        "is_correct": true,
        "correct_answer_text": null,
        "correct_answers_list": null,
        "explanation": null,
        "options": null
      },
      {
        "question_id": "q-uuid-11",
        "question_content": "请回答以下问题：你最喜欢的季节是什么？为什么？",
        "question_order": 1,
        "user_response": "https://storage.example.com/audio/user-recording-124.mp3",
        "is_correct": true,
        "correct_answer_text": null,
        "correct_answers_list": null,
        "explanation": null,
        "options": null
      }
    ]
  }
}
```

#### Đặc Điểm HSKK
- **Tổng điểm:** 100
- **Điểm từng phần:** 0-100 (tính theo công thức: (Số câu đúng / Tổng câu) × 100)
- **Điều kiện đạt:** `score_total >= 60`
- **Số phần:** 1 (Speaking)
- **Loại câu hỏi:** Chủ yếu là ghi âm (`user_response` là URL file audio)

### 3. TOCFL (2 phần: Listening, Reading)

#### Response Example
```json
{
  "success": true,
  "message": "Lấy kết quả thành công.",
  "data": {
    "id": "attempt-uuid-789",
    "start_time": "2024-01-15T09:00:00.000Z",
    "end_time": "2024-01-15T11:00:00.000Z",
    "score_total": 146,
    "is_passed": true,
    "exam_name": "TOCFL Band B",
    "section_scores": [
      {
        "section_id": "section-uuid-5",
        "section_name": "聽力測驗 (Listening)",
        "score": 70
      },
      {
        "section_id": "section-uuid-6",
        "section_name": "閱讀測驗 (Reading)",
        "score": 76
      }
    ],
    "questions": [
      {
        "question_id": "q-uuid-20",
        "question_content": "請聽錄音，選擇正確答案",
        "question_order": 0,
        "user_response": "option-uuid-x",
        "is_correct": true,
        "correct_answer_text": null,
        "correct_answers_list": null,
        "explanation": {
          "id": "exp-uuid-20",
          "content": "正確答案是A..."
        },
        "options": [
          {
            "id": "option-uuid-x",
            "label": "A",
            "content": "去圖書館",
            "is_correct": true
          },
          {
            "id": "option-uuid-y",
            "label": "B",
            "content": "去電影院",
            "is_correct": false
          },
          {
            "id": "option-uuid-z",
            "label": "C",
            "content": "去公園",
            "is_correct": false
          }
        ]
      }
    ]
  }
}
```

#### Đặc Điểm TOCFL
- **Tổng điểm:** 160
- **Điểm từng phần:** 0-80 (tính theo công thức: (Số câu đúng / Tổng câu) × 80)
- **Điều kiện đạt:** `score_total >= 120`
- **Số phần:** 2 (Listening + Reading)

### 4. Loại Bài Thi Khác (Mặc định)

#### Response Example
```json
{
  "success": true,
  "message": "Lấy kết quả thành công.",
  "data": {
    "id": "attempt-uuid-999",
    "start_time": "2024-01-15T15:00:00.000Z",
    "end_time": "2024-01-15T16:00:00.000Z",
    "score_total": 85,
    "is_passed": true,
    "exam_name": "Chinese Grammar Test",
    "section_scores": [
      {
        "section_id": "section-uuid-7",
        "section_name": "Grammar",
        "score": 45
      },
      {
        "section_id": "section-uuid-8",
        "section_name": "Vocabulary",
        "score": 40
      }
    ],
    "questions": [
      {
        "question_id": "q-uuid-30",
        "question_content": "选择正确的语法结构",
        "question_order": 0,
        "user_response": "option-uuid-m",
        "is_correct": true,
        "correct_answer_text": null,
        "correct_answers_list": null,
        "explanation": {
          "id": "exp-uuid-30",
          "content": "这是正确的语法..."
        },
        "options": [
          {
            "id": "option-uuid-m",
            "label": "A",
            "content": "我喜欢吃苹果",
            "is_correct": true
          },
          {
            "id": "option-uuid-n",
            "label": "B",
            "content": "我吃喜欢苹果",
            "is_correct": false
          }
        ]
      }
    ]
  }
}
```

#### Đặc Điểm Loại Khác
- **Tổng điểm:** Tùy thuộc vào `points` của từng câu hỏi
- **Điểm từng phần:** Tổng `points` của các câu đúng trong phần đó
- **Điều kiện đạt:** `score_total > 0` (có điểm là đạt)
- **Số phần:** Tùy ý

## So Sánh Điểm Số

### Bảng So Sánh

| Loại | Điểm Listening | Điểm Reading | Điểm Writing/Speaking | Tổng | Đạt |
|------|----------------|--------------|----------------------|------|-----|
| **HSK 3** | 88/100 | 83/100 | 80/100 | 251/300 | ✅ (≥180) |
| **HSK 1** | 65/100 | 58/100 | - | 123/200 | ✅ (≥120) |
| **HSKK** | - | - | 75/100 | 75/100 | ✅ (≥60) |
| **TOCFL** | 70/80 | 76/80 | - | 146/160 | ✅ (≥120) |
| **Khác** | 45 pts | 40 pts | - | 85 pts | ✅ (>0) |

## Cấu Trúc Chi Tiết Các Trường

### Root Level
```typescript
{
  success: boolean,
  message: string,
  data: AttemptResult
}
```

### AttemptResult Object
```typescript
{
  id: UUID,                    // ID của lượt làm bài
  start_time: ISO8601,         // Thời gian bắt đầu
  end_time: ISO8601,           // Thời gian kết thúc
  score_total: number,         // Tổng điểm (đã tính theo công thức mới)
  is_passed: boolean,          // Đạt/Không đạt (theo ngưỡng mới)
  exam_name: string,           // Tên bài thi
  section_scores: SectionScore[], // Điểm từng phần
  questions: Question[]        // Chi tiết từng câu hỏi
}
```

### SectionScore Object
```typescript
{
  section_id: UUID,     // ID của phần thi
  section_name: string, // Tên phần thi
  score: number         // Điểm của phần này (đã tính theo công thức)
}
```

**Lưu ý về `score`:**
- **HSK/HSKK:** 0-100 (công thức: (Đúng/Tổng) × 100)
- **TOCFL:** 0-80 (công thức: (Đúng/Tổng) × 80)
- **Khác:** Tổng points của các câu đúng

### Question Object
```typescript
{
  question_id: UUID,
  question_content: string,
  question_order: number,
  user_response: string | null,        // ID option hoặc text hoặc URL
  is_correct: boolean | null,          // Đúng/Sai
  correct_answer_text: string | null,  // Đáp án text (cho câu điền)
  correct_answers_list: string[] | null, // Danh sách đáp án (cho câu sắp xếp)
  explanation: Explanation | null,     // Giải thích
  options: Option[] | null             // Các lựa chọn (cho trắc nghiệm)
}
```

### Option Object
```typescript
{
  id: UUID,
  label: string,        // A, B, C, D
  content: string,      // Nội dung lựa chọn
  is_correct: boolean   // Đây có phải đáp án đúng không
}
```

### Explanation Object
```typescript
{
  id: UUID,
  content: string       // Nội dung giải thích
}
```

## Ví Dụ Tính Điểm

### HSK 3 - Chi Tiết
```
Bài thi có:
- Listening: 40 câu
- Reading: 30 câu
- Writing: 10 câu

Kết quả làm bài:
- Listening: 35/40 đúng
- Reading: 25/30 đúng
- Writing: 8/10 đúng

Tính điểm:
- Listening: (35/40) × 100 = 87.5 → 88 (làm tròn)
- Reading: (25/30) × 100 = 83.33 → 83 (làm tròn)
- Writing: (8/10) × 100 = 80

Response:
{
  "score_total": 251,  // 88 + 83 + 80
  "is_passed": true,   // 251 >= 180
  "section_scores": [
    { "section_name": "Listening", "score": 88 },
    { "section_name": "Reading", "score": 83 },
    { "section_name": "Writing", "score": 80 }
  ]
}
```

### TOCFL - Chi Tiết
```
Bài thi có:
- Listening: 40 câu
- Reading: 40 câu

Kết quả làm bài:
- Listening: 35/40 đúng
- Reading: 38/40 đúng

Tính điểm:
- Listening: (35/40) × 80 = 70
- Reading: (38/40) × 80 = 76

Response:
{
  "score_total": 146,  // 70 + 76
  "is_passed": true,   // 146 >= 120
  "section_scores": [
    { "section_name": "Listening", "score": 70 },
    { "section_name": "Reading", "score": 76 }
  ]
}
```

## Các Trường Hợp Đặc Biệt

### 1. Không Trả Lời Câu Nào
```json
{
  "score_total": 0,
  "is_passed": false,
  "section_scores": [
    { "section_id": "...", "section_name": "Listening", "score": 0 },
    { "section_id": "...", "section_name": "Reading", "score": 0 }
  ],
  "questions": [
    {
      "question_id": "...",
      "user_response": null,
      "is_correct": null,
      ...
    }
  ]
}
```

### 2. Trả Lời Một Số Câu
```json
{
  "score_total": 125,
  "is_passed": false,  // HSK 3: 125 < 180
  "section_scores": [
    { "section_name": "Listening", "score": 50 },
    { "section_name": "Reading", "score": 45 },
    { "section_name": "Writing", "score": 30 }
  ]
}
```

### 3. Câu Ghi Âm (HSKK)
```json
{
  "question_id": "...",
  "question_content": "请描述这张图片",
  "user_response": "https://storage.example.com/audio/recording.mp3",
  "is_correct": true,  // Có file = đúng
  "correct_answer_text": null,
  "correct_answers_list": null,
  "explanation": null,
  "options": null
}
```

## Thay Đổi So Với Trước

### Trước Cập Nhật
```json
{
  "score_total": 63,  // Tổng points của các câu đúng
  "is_passed": true,  // Chỉ cần > 0
  "section_scores": [
    { "section_name": "Listening", "score": 36 },  // Tổng points
    { "section_name": "Reading", "score": 27 }
  ]
}
```

### Sau Cập Nhật (HSK)
```json
{
  "score_total": 251,  // Tính theo công thức (Đúng/Tổng) × 100
  "is_passed": true,   // Theo ngưỡng 180/300
  "section_scores": [
    { "section_name": "Listening", "score": 88 },  // (35/40) × 100
    { "section_name": "Reading", "score": 83 }     // (25/30) × 100
  ]
}
```

## Lưu Ý Quan Trọng

### ⚠️ Điểm Số
- **HSK/HSKK:** Điểm không phụ thuộc vào trường `points` trong Questions
- **TOCFL:** Điểm không phụ thuộc vào trường `points` trong Questions
- **Loại khác:** Vẫn sử dụng trường `points`

### ⚠️ Làm Tròn
- Sử dụng `Math.round()` để làm tròn đến số nguyên gần nhất
- Ví dụ: 87.5 → 88, 83.33 → 83

### ⚠️ Điều Kiện Đạt
- **HSK 1-2:** ≥120/200
- **HSK 3-6:** ≥180/300
- **HSKK:** ≥60/100
- **TOCFL:** ≥120/160
- **Khác:** >0

### ⚠️ Tương Thích Ngược
- Các bài thi đã nộp trước khi update vẫn giữ nguyên điểm số cũ
- Chỉ bài thi nộp sau khi update mới dùng công thức mới

## Tóm Tắt

✅ Cấu trúc JSON giữ nguyên  
✅ Giá trị `score_total` và `section_scores[].score` thay đổi theo công thức mới  
✅ Giá trị `is_passed` thay đổi theo ngưỡng mới  
✅ Các trường khác (`questions`, `options`, etc.) không thay đổi  
✅ Hỗ trợ đầy đủ HSK, HSKK, TOCFL và các loại khác
