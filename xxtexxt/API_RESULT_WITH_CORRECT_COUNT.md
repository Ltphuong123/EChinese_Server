# API Result với Correct Count và Total Questions

## Endpoint
```
GET /api/attempts/:attemptId/result
```

## Cấu Trúc Response Mới

### Response Example (HSK 3)
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
        "score": 88,
        "correct_count": 35,
        "total_questions": 40
      },
      {
        "section_id": "section-uuid-2",
        "section_name": "阅读 (Reading)",
        "score": 83,
        "correct_count": 25,
        "total_questions": 30
      },
      {
        "section_id": "section-uuid-3",
        "section_name": "书写 (Writing)",
        "score": 80,
        "correct_count": 8,
        "total_questions": 10
      }
    ],
    "questions": [...]
  }
}
```

## Thay Đổi Chính

### Section Score Object - TRƯỚC
```json
{
  "section_id": "uuid",
  "section_name": "Listening",
  "score": 88
}
```

### Section Score Object - SAU
```json
{
  "section_id": "uuid",
  "section_name": "Listening",
  "score": 88,
  "correct_count": 35,      // ⭐ MỚI: Số câu trả lời đúng
  "total_questions": 40     // ⭐ MỚI: Tổng số câu hỏi
}
```

## Cách Tính

### correct_count
Đếm số câu trả lời đúng trong phần thi:
```sql
SELECT COUNT(*)
FROM "User_Answers" ua
JOIN "Questions" q ON ua.question_id = q.id
JOIN "Subsections" ss ON q.subsection_id = ss.id
WHERE ss.section_id = s.id 
AND ua.attempt_id = a.id 
AND ua.is_correct = true
```

### total_questions
Đếm tổng số câu hỏi trong phần thi:
```sql
SELECT COUNT(*)
FROM "Questions" q
JOIN "Subsections" ss ON q.subsection_id = ss.id
WHERE ss.section_id = s.id
```

## Ví Dụ Theo Loại Bài Thi

### 1. HSK 3
```json
{
  "score_total": 251,
  "is_passed": true,
  "section_scores": [
    {
      "section_name": "Listening",
      "score": 88,
      "correct_count": 35,
      "total_questions": 40
    },
    {
      "section_name": "Reading",
      "score": 83,
      "correct_count": 25,
      "total_questions": 30
    },
    {
      "section_name": "Writing",
      "score": 80,
      "correct_count": 8,
      "total_questions": 10
    }
  ]
}
```

**Giải thích:**
- Listening: 35/40 đúng → (35/40) × 100 = 87.5 → 88 điểm
- Reading: 25/30 đúng → (25/30) × 100 = 83.33 → 83 điểm
- Writing: 8/10 đúng → (8/10) × 100 = 80 điểm
- Tổng: 88 + 83 + 80 = 251/300
- Đạt: 251 ≥ 180 ✅

### 2. HSKK
```json
{
  "score_total": 75,
  "is_passed": true,
  "section_scores": [
    {
      "section_name": "Speaking",
      "score": 75,
      "correct_count": 15,
      "total_questions": 20
    }
  ]
}
```

**Giải thích:**
- Speaking: 15/20 đúng → (15/20) × 100 = 75 điểm
- Tổng: 75/100
- Đạt: 75 ≥ 60 ✅

### 3. TOCFL
```json
{
  "score_total": 146,
  "is_passed": true,
  "section_scores": [
    {
      "section_name": "Listening",
      "score": 70,
      "correct_count": 35,
      "total_questions": 40
    },
    {
      "section_name": "Reading",
      "score": 76,
      "correct_count": 38,
      "total_questions": 40
    }
  ]
}
```

**Giải thích:**
- Listening: 35/40 đúng → (35/40) × 80 = 70 điểm
- Reading: 38/40 đúng → (38/40) × 80 = 76 điểm
- Tổng: 70 + 76 = 146/160
- Đạt: 146 ≥ 120 ✅

### 4. Loại Khác (Mặc định)
```json
{
  "score_total": 85,
  "is_passed": true,
  "section_scores": [
    {
      "section_name": "Grammar",
      "score": 45,
      "correct_count": 18,
      "total_questions": 20
    },
    {
      "section_name": "Vocabulary",
      "score": 40,
      "correct_count": 16,
      "total_questions": 20
    }
  ]
}
```

**Giải thích:**
- Grammar: 18/20 đúng, mỗi câu 2.5 điểm → 18 × 2.5 = 45 điểm
- Vocabulary: 16/20 đúng, mỗi câu 2.5 điểm → 16 × 2.5 = 40 điểm
- Tổng: 45 + 40 = 85 điểm
- Đạt: 85 > 0 ✅

## Use Cases

### 1. Hiển thị Tỷ Lệ Đúng
```javascript
const section = result.data.section_scores[0];
const percentage = (section.correct_count / section.total_questions * 100).toFixed(1);

console.log(`${section.section_name}: ${section.correct_count}/${section.total_questions} (${percentage}%)`);
// Output: "Listening: 35/40 (87.5%)"
```

### 2. Hiển thị Progress Bar
```javascript
section_scores.forEach(section => {
  const progress = (section.correct_count / section.total_questions) * 100;
  
  // Render progress bar
  <ProgressBar 
    value={progress} 
    label={`${section.correct_count}/${section.total_questions}`}
  />
});
```

### 3. Phân Tích Chi Tiết
```javascript
const analysis = {
  totalCorrect: section_scores.reduce((sum, s) => sum + s.correct_count, 0),
  totalQuestions: section_scores.reduce((sum, s) => sum + s.total_questions, 0),
  overallPercentage: (totalCorrect / totalQuestions * 100).toFixed(1)
};

console.log(`Tổng: ${analysis.totalCorrect}/${analysis.totalQuestions} (${analysis.overallPercentage}%)`);
// Output: "Tổng: 68/80 (85.0%)"
```

### 4. So Sánh Điểm Số và Tỷ Lệ
```javascript
section_scores.forEach(section => {
  const percentage = (section.correct_count / section.total_questions * 100).toFixed(1);
  
  console.log(`${section.section_name}:`);
  console.log(`  - Điểm: ${section.score}`);
  console.log(`  - Đúng: ${section.correct_count}/${section.total_questions} (${percentage}%)`);
});

// Output:
// Listening:
//   - Điểm: 88
//   - Đúng: 35/40 (87.5%)
// Reading:
//   - Điểm: 83
//   - Đúng: 25/30 (83.3%)
```

## Lợi Ích

### ✅ Thông Tin Chi Tiết Hơn
- Người dùng biết chính xác số câu đúng/sai
- Dễ dàng tính tỷ lệ phần trăm
- Hiểu rõ hơn về kết quả

### ✅ UI/UX Tốt Hơn
- Hiển thị progress bar chính xác
- Hiển thị "35/40" thay vì chỉ "88 điểm"
- Dễ so sánh giữa các phần

### ✅ Phân Tích Dễ Dàng
- Biết phần nào yếu (tỷ lệ đúng thấp)
- So sánh giữa các lần làm bài
- Tracking tiến bộ

### ✅ Không Thay Đổi Database
- Tính toán trực tiếp trong query
- Không cần migration
- Không ảnh hưởng dữ liệu cũ

## Implementation Details

### Query SQL
```sql
SELECT jsonb_agg(jsonb_build_object(
    'section_id', s.id,
    'section_name', s.name,
    'score', uss.score,
    'correct_count', (
        SELECT COUNT(*)
        FROM "User_Answers" ua
        JOIN "Questions" q ON ua.question_id = q.id
        JOIN "Subsections" ss ON q.subsection_id = ss.id
        WHERE ss.section_id = s.id 
        AND ua.attempt_id = a.id 
        AND ua.is_correct = true
    ),
    'total_questions', (
        SELECT COUNT(*)
        FROM "Questions" q
        JOIN "Subsections" ss ON q.subsection_id = ss.id
        WHERE ss.section_id = s.id
    )
))
FROM "User_Section_Scores" uss
JOIN "Sections" s ON uss.section_id = s.id
WHERE uss.attempt_id = a.id
```

### Performance
- **Subquery cho correct_count:** Chạy cho mỗi section (thường 2-3 sections)
- **Subquery cho total_questions:** Chạy cho mỗi section
- **Impact:** Minimal, vì số section ít (2-3)
- **Optimization:** Có thể cache `total_questions` nếu cần

## Các Trường Hợp Đặc Biệt

### 1. Không Trả Lời Câu Nào
```json
{
  "section_name": "Listening",
  "score": 0,
  "correct_count": 0,
  "total_questions": 40
}
```

### 2. Trả Lời Một Số Câu
```json
{
  "section_name": "Reading",
  "score": 50,
  "correct_count": 15,
  "total_questions": 30
}
```
- Chỉ trả lời 15/30 câu
- Tất cả 15 câu đều đúng
- Điểm: (15/30) × 100 = 50

### 3. Trả Lời Tất Cả Nhưng Sai Hết
```json
{
  "section_name": "Writing",
  "score": 0,
  "correct_count": 0,
  "total_questions": 10
}
```
- Trả lời 10/10 câu
- Tất cả đều sai
- Điểm: (0/10) × 100 = 0

## TypeScript Interface

```typescript
interface SectionScore {
  section_id: string;
  section_name: string;
  score: number;
  correct_count: number;      // ⭐ NEW
  total_questions: number;    // ⭐ NEW
}

interface AttemptResult {
  id: string;
  start_time: string;
  end_time: string;
  score_total: number;
  is_passed: boolean;
  exam_name: string;
  section_scores: SectionScore[];
  questions: Question[];
}
```

## Tóm Tắt

✅ Thêm `correct_count` và `total_questions` vào `section_scores`  
✅ Tính toán trực tiếp trong SQL query  
✅ Không thay đổi database schema  
✅ Không ảnh hưởng dữ liệu cũ  
✅ Cung cấp thông tin chi tiết hơn cho người dùng  
✅ Dễ dàng hiển thị tỷ lệ phần trăm và progress bar
