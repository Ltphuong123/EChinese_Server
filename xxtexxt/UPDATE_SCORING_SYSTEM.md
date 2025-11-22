# Cập Nhật Hệ Thống Tính Điểm Bài Thi

## Tổng Quan Thay Đổi

Hệ thống tính điểm đã được cập nhật để hỗ trợ 3 loại bài thi: **HSK**, **HSKK**, và **TOCFL** với công thức tính điểm riêng biệt theo tiêu chuẩn quốc tế.

## Các Thay Đổi Chính

### 1. Model: `attemptModel.js`

#### a) Cập nhật `findAttemptByIdAndUser`
**Mục đích:** Lấy thêm thông tin về loại bài thi (exam_type)

**Trước:**
```javascript
SELECT a.*
FROM "User_Exam_Attempts" a
WHERE a.id = $1 AND a.user_id = $2;
```

**Sau:**
```javascript
SELECT a.*, e.exam_type_id, et.name as exam_type_name
FROM "User_Exam_Attempts" a
JOIN "Exams" e ON a.exam_id = e.id
JOIN "Exam_Types" et ON e.exam_type_id = et.id
WHERE a.id = $1 AND a.user_id = $2;
```

**Kết quả:** Trả về thêm `exam_type_id` và `exam_type_name` (HSK, HSKK, TOCFL, etc.)

#### b) Thêm hàm mới `getSectionQuestionCounts`
**Mục đích:** Lấy tổng số câu hỏi trong mỗi phần thi

```javascript
getSectionQuestionCounts: async (examId) => {
  const queryText = `
    SELECT 
      s.id as section_id,
      s.name as section_name,
      COUNT(q.id) as total_questions
    FROM "Sections" s
    JOIN "Subsections" ss ON ss.section_id = s.id
    JOIN "Questions" q ON q.subsection_id = ss.id
    WHERE s.exam_id = $1
    GROUP BY s.id, s.name
    ORDER BY s."order" ASC;
  `;
  const result = await db.query(queryText, [examId]);
  return result.rows;
}
```

**Trả về:**
```javascript
[
  { section_id: 'uuid', section_name: 'Listening', total_questions: 20 },
  { section_id: 'uuid', section_name: 'Reading', total_questions: 30 }
]
```

### 2. Service: `attemptService.js`

#### Cập nhật `submitAndGradeAttempt`

**Logic mới:**

1. **Lấy thông tin tổng số câu hỏi mỗi phần:**
```javascript
const sectionQuestionCounts = await attemptModel.getSectionQuestionCounts(attempt.exam_id);
const sectionCountsMap = new Map(
  sectionQuestionCounts.map(s => [s.section_id, { total: parseInt(s.total_questions), correct: 0 }])
);
```

2. **Đếm số câu đúng trong mỗi phần:**
```javascript
// Logic kiểm tra đúng/sai giữ nguyên
if (isCorrect && sectionCountsMap.has(item.section_id)) {
    const sectionData = sectionCountsMap.get(item.section_id);
    sectionData.correct += 1;
}
```

3. **Tính điểm theo loại bài thi:**

##### a) HSK
```javascript
if (examTypeName === 'HSK') {
    // Điểm từng phần = (Số câu đúng / Tổng số câu) × 100
    for (const [section_id, data] of sectionCountsMap.entries()) {
        const sectionScore = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
        sectionScores.push({ section_id, score: sectionScore });
        totalScore += sectionScore;
    }
}
```

**Công thức:**
```
Điểm phần = (Số câu đúng / Tổng số câu) × 100
Tổng điểm = Σ Điểm các phần
```

**Ví dụ:**
- Listening: 18/20 đúng → (18/20) × 100 = 90 điểm
- Reading: 25/30 đúng → (25/30) × 100 = 83 điểm
- Writing: 8/10 đúng → (8/10) × 100 = 80 điểm
- **Tổng: 90 + 83 + 80 = 253/300**

##### b) HSKK
```javascript
else if (examTypeName === 'HSKK') {
    // Điểm từng phần = (Số câu đúng / Tổng số câu) × 100
    // Tổng = 100 điểm
    for (const [section_id, data] of sectionCountsMap.entries()) {
        const sectionScore = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
        sectionScores.push({ section_id, score: sectionScore });
        totalScore += sectionScore;
    }
}
```

**Công thức:** Giống HSK nhưng tổng điểm tối đa là 100

**Ví dụ:**
- Speaking: 15/20 đúng → (15/20) × 100 = 75 điểm
- **Tổng: 75/100**

##### c) TOCFL
```javascript
else if (examTypeName === 'TOCFL') {
    // Điểm từng phần = (Số câu đúng / Tổng số câu) × 80
    for (const [section_id, data] of sectionCountsMap.entries()) {
        const sectionScore = data.total > 0 ? Math.round((data.correct / data.total) * 80) : 0;
        sectionScores.push({ section_id, score: sectionScore });
        totalScore += sectionScore;
    }
}
```

**Công thức:**
```
Điểm phần = (Số câu đúng / Tổng số câu) × 80
Tổng điểm = Σ Điểm các phần (tối đa 160)
```

**Ví dụ:**
- Listening: 35/40 đúng → (35/40) × 80 = 70 điểm
- Reading: 38/40 đúng → (38/40) × 80 = 76 điểm
- **Tổng: 70 + 76 = 146/160**

##### d) Loại khác (Mặc định)
```javascript
else {
    // Tính theo điểm gốc (points) - giống logic cũ
    if (isCorrect) {
        const questionPoints = item.question_points || 0;
        totalScore += questionPoints;
        const currentScore = sectionScoresMap.get(item.section_id) || 0;
        sectionScoresMap.set(item.section_id, currentScore + questionPoints);
    }
}
```

**Công thức:** Cộng điểm theo trường `points` của mỗi câu hỏi

4. **Xác định đạt/không đạt:**

```javascript
let isPassed = false;
const numSections = sectionScores.length;

if (examTypeName === 'HSK') {
    // HSK 1-2: ≥120/200 (2 phần)
    // HSK 3-6: ≥180/300 (3 phần)
    if (numSections === 2) {
        isPassed = totalScore >= 120;
    } else if (numSections === 3) {
        isPassed = totalScore >= 180;
    } else {
        isPassed = totalScore > 0;
    }
} else if (examTypeName === 'HSKK') {
    // HSKK: Tổng ≥60/100
    isPassed = totalScore >= 60;
} else if (examTypeName === 'TOCFL') {
    // TOCFL: Tổng ≥120/160
    isPassed = totalScore >= 120;
} else {
    // Mặc định: Có điểm là đạt
    isPassed = totalScore > 0;
}
```

## Bảng So Sánh

| Loại Bài Thi | Công Thức Điểm Phần | Tổng Điểm | Điều Kiện Đạt |
|--------------|---------------------|-----------|---------------|
| **HSK 1-2** | (Đúng/Tổng) × 100 | 200 | ≥ 120 |
| **HSK 3-6** | (Đúng/Tổng) × 100 | 300 | ≥ 180 |
| **HSKK** | (Đúng/Tổng) × 100 | 100 | ≥ 60 |
| **TOCFL** | (Đúng/Tổng) × 80 | 160 | ≥ 120 |
| **Khác** | Σ points | Tùy | > 0 |

## Ví Dụ Chi Tiết

### Ví Dụ 1: HSK 3 (3 phần)
```
Bài thi có:
- Listening: 40 câu
- Reading: 30 câu  
- Writing: 10 câu

Kết quả:
- Listening: 35/40 đúng → (35/40) × 100 = 88 điểm
- Reading: 25/30 đúng → (25/30) × 100 = 83 điểm
- Writing: 8/10 đúng → (8/10) × 100 = 80 điểm

Tổng: 88 + 83 + 80 = 251/300
Đạt: 251 ≥ 180 → ✅ ĐẠT
```

### Ví Dụ 2: HSKK
```
Bài thi có:
- Speaking: 20 câu

Kết quả:
- Speaking: 14/20 đúng → (14/20) × 100 = 70 điểm

Tổng: 70/100
Đạt: 70 ≥ 60 → ✅ ĐẠT
```

### Ví Dụ 3: TOCFL
```
Bài thi có:
- Listening: 40 câu
- Reading: 40 câu

Kết quả:
- Listening: 30/40 đúng → (30/40) × 80 = 60 điểm
- Reading: 32/40 đúng → (32/40) × 80 = 64 điểm

Tổng: 60 + 64 = 124/160
Đạt: 124 ≥ 120 → ✅ ĐẠT
```

### Ví Dụ 4: Bài thi khác (Mặc định)
```
Bài thi có:
- Section 1: 10 câu (mỗi câu 2 điểm)
- Section 2: 5 câu (mỗi câu 5 điểm)

Kết quả:
- Section 1: 8/10 đúng → 8 × 2 = 16 điểm
- Section 2: 4/5 đúng → 4 × 5 = 20 điểm

Tổng: 16 + 20 = 36 điểm
Đạt: 36 > 0 → ✅ ĐẠT
```

## Điểm Khác Biệt Với Logic Cũ

### Logic Cũ
```javascript
// Cộng điểm theo points của câu hỏi
if (isCorrect) {
    totalScore += questionPoints;
    sectionScore += questionPoints;
}

// Đạt nếu có điểm
isPassed = totalScore > 0;
```

### Logic Mới
```javascript
// Đếm số câu đúng
if (isCorrect) {
    correctCount += 1;
}

// Tính điểm theo công thức
sectionScore = (correctCount / totalQuestions) × multiplier;

// Đạt theo ngưỡng cụ thể
isPassed = totalScore >= threshold;
```

## Lưu Ý Quan Trọng

### ⚠️ Cách Kiểm Tra Đúng/Sai
**KHÔNG THAY ĐỔI** - Logic kiểm tra câu trả lời đúng/sai vẫn giữ nguyên:
- Trắc nghiệm: So sánh ID option
- Sắp xếp: So sánh chuỗi
- Viết: So sánh text (không phân biệt hoa/thường)
- Ghi âm: Có file là đúng

### ⚠️ Trường `points` Trong Questions
- **HSK, HSKK, TOCFL:** Trường `points` **KHÔNG được sử dụng**
- **Loại khác:** Vẫn sử dụng trường `points`

### ⚠️ Làm Tròn Điểm
Sử dụng `Math.round()` để làm tròn điểm đến số nguyên gần nhất:
```javascript
Math.round(83.333) → 83
Math.round(83.5) → 84
Math.round(83.7) → 84
```

### ⚠️ Xác Định Loại Bài Thi
Dựa vào tên trong bảng `Exam_Types`:
- Tên chính xác: `'HSK'`, `'HSKK'`, `'TOCFL'`
- So sánh: `examTypeName === 'HSK'`
- Phân biệt hoa/thường

### ⚠️ Số Phần Thi
- HSK 1-2: 2 phần (Listening, Reading)
- HSK 3-6: 3 phần (Listening, Reading, Writing)
- HSKK: 1 phần (Speaking)
- TOCFL: 2 phần (Listening, Reading)

## Testing

### Test Case 1: HSK 3
```javascript
// Setup
exam_type_name = 'HSK'
sections = [
  { id: 's1', total: 40 }, // Listening
  { id: 's2', total: 30 }, // Reading
  { id: 's3', total: 10 }  // Writing
]

// Input
correct_answers = {
  s1: 35, // 35/40
  s2: 25, // 25/30
  s3: 8   // 8/10
}

// Expected Output
section_scores = [
  { section_id: 's1', score: 88 },
  { section_id: 's2', score: 83 },
  { section_id: 's3', score: 80 }
]
total_score = 251
is_passed = true // 251 >= 180
```

### Test Case 2: TOCFL
```javascript
// Setup
exam_type_name = 'TOCFL'
sections = [
  { id: 's1', total: 40 }, // Listening
  { id: 's2', total: 40 }  // Reading
]

// Input
correct_answers = {
  s1: 30, // 30/40
  s2: 32  // 32/40
}

// Expected Output
section_scores = [
  { section_id: 's1', score: 60 }, // (30/40) × 80 = 60
  { section_id: 's2', score: 64 }  // (32/40) × 80 = 64
]
total_score = 124
is_passed = true // 124 >= 120
```

## Migration Notes

### Dữ Liệu Cũ
- Các bài thi đã nộp trước khi update vẫn giữ nguyên điểm số cũ
- Không cần migrate dữ liệu

### Bài Thi Mới
- Tất cả bài thi nộp sau khi update sẽ dùng logic mới
- Cần đảm bảo `Exam_Types` có tên chính xác: `'HSK'`, `'HSKK'`, `'TOCFL'`

## Tóm Tắt

✅ Hỗ trợ 3 loại bài thi: HSK, HSKK, TOCFL  
✅ Công thức tính điểm theo tiêu chuẩn quốc tế  
✅ Ngưỡng đạt/không đạt chính xác  
✅ Logic kiểm tra đúng/sai giữ nguyên  
✅ Tương thích ngược với các loại bài thi khác  
✅ Không cần thay đổi database schema
