# Mô Tả Chi Tiết Cách Tính Điểm Bài Thi

## API Endpoint
```
POST /api/attempts/:attemptId/submit
```

## Luồng Xử Lý

### 1. Controller (`attemptController.submitAttempt`)
- Nhận `attemptId` từ params
- Lấy `userId` từ token (đã xác thực)
- Gọi `attemptService.submitAndGradeAttempt(attemptId, userId)`
- Trả về kết quả

### 2. Service (`attemptService.submitAndGradeAttempt`)

#### Bước 1: Xác thực lượt làm bài
```javascript
const attempt = await attemptModel.findAttemptByIdAndUser(attemptId, userId);
if (!attempt) {
    throw new Error('Lượt làm bài không hợp lệ.');
}
```

#### Bước 2: Lấy tất cả câu hỏi và câu trả lời
```javascript
const allQuestionsAndAnswers = await attemptModel.getAllQuestionsAndUserAnswersForGrading(attemptId);
```

**Dữ liệu lấy được bao gồm:**
- `user_answer_id`: ID của câu trả lời
- `user_response`: Câu trả lời của người dùng
- `question_id`: ID câu hỏi
- `question_points`: Điểm của câu hỏi
- `question_type_name`: Loại câu hỏi
- `section_id`: ID phần thi
- `correct_answers`: Mảng đáp án đúng (JSON)
- `options`: Mảng các lựa chọn (JSON)

#### Bước 3: Xử lý trường hợp đặc biệt
```javascript
if (allQuestionsAndAnswers.length === 0) {
    await attemptModel.finalizeAttempt(attemptId, 0, false, []);
    return { attemptId };
}
```
- Nếu không có câu trả lời nào → Điểm = 0, Không đạt

#### Bước 4: Tính điểm từng câu

**Khởi tạo:**
```javascript
let totalScore = 0;
const sectionScoresMap = new Map(); // Lưu điểm từng phần
```

**Lặp qua từng câu hỏi:**
```javascript
for (const item of allQuestionsAndAnswers) {
    let isCorrect = false;
    const userResponse = item.user_response;
    const questionPoints = item.question_points || 0;
    
    if (userResponse) {
        // Logic chấm điểm theo loại câu hỏi
    }
    
    if (isCorrect) {
        totalScore += questionPoints;
        // Cộng điểm vào phần thi tương ứng
        const currentSectionScore = sectionScoresMap.get(item.section_id) || 0;
        sectionScoresMap.set(item.section_id, currentSectionScore + questionPoints);
    }
    
    // Cập nhật kết quả vào database
    await attemptModel.updateAnswerResult(item.user_answer_id, isCorrect);
}
```

### 3. Logic Chấm Điểm Theo Loại Câu Hỏi

#### A. Câu Trắc Nghiệm (Multiple Choice)
**Áp dụng cho:**
- `Đúng/Sai`
- `Trắc nghiệm (3 đáp án)`
- `Trắc nghiệm (4 đáp án)`
- `Trắc nghiệm (5 đáp án - Nối)`

**Cách chấm:**
```javascript
isCorrect = item.options.some(opt => 
    opt.id === userResponse && opt.is_correct
);
```
- So sánh `userResponse` (ID của option được chọn) với các options
- Nếu option được chọn có `is_correct = true` → Đúng
- **Điểm:** Nếu đúng → Cộng `questionPoints`, sai → 0 điểm

#### B. Câu Sắp Xếp
**Áp dụng cho:**
- `Sắp xếp từ`
- `Sắp xếp câu`

**Cách chấm:**
```javascript
isCorrect = item.correct_answers.some(ans => 
    ans.answer === userResponse
);
```
- So sánh `userResponse` (chuỗi đã sắp xếp) với danh sách đáp án đúng
- Nếu khớp với bất kỳ đáp án nào trong `correct_answers` → Đúng
- **Điểm:** Nếu đúng → Cộng `questionPoints`, sai → 0 điểm

#### C. Câu Viết Câu Trả Lời (Short Answer)
**Áp dụng cho:**
- `Viết câu trả lời`

**Cách chấm:**
```javascript
if (item.correct_answers.length > 0) {
    // Có đáp án mẫu → So sánh (không phân biệt hoa thường)
    isCorrect = item.correct_answers.some(ans => 
        ans.answer.toLowerCase() === userResponse.toLowerCase()
    );
} else {
    // Không có đáp án mẫu → Chỉ cần có nội dung
    isCorrect = userResponse.trim().length > 0;
}
```
- **Trường hợp 1:** Có đáp án mẫu trong `correct_answers`
  - So sánh không phân biệt hoa/thường
  - Phải khớp chính xác với một trong các đáp án
- **Trường hợp 2:** Không có đáp án mẫu
  - Chỉ cần có nội dung (không rỗng) → Đúng
- **Điểm:** Nếu đúng → Cộng `questionPoints`, sai → 0 điểm

#### D. Câu Trả Lời Bằng Ghi Âm (Audio Response)
**Áp dụng cho:**
- `Trả lời bằng ghi âm`

**Cách chấm:**
```javascript
isCorrect = !!userResponse; // Chỉ cần có câu trả lời là được
```
- Chỉ kiểm tra có câu trả lời hay không
- Không chấm nội dung (vì cần chấm thủ công)
- **Điểm:** Có câu trả lời → Cộng `questionPoints`, không có → 0 điểm

### 4. Tính Điểm Từng Phần (Section Scores)

```javascript
const sectionScores = Array.from(sectionScoresMap, 
    ([section_id, score]) => ({ section_id, score })
);
```

**Cách hoạt động:**
- Mỗi khi một câu hỏi được chấm đúng, điểm sẽ được cộng vào phần thi tương ứng
- Sử dụng `Map` để nhóm điểm theo `section_id`
- Kết quả: Mảng các object `{ section_id, score }`

### 5. Xác Định Đạt/Không Đạt

```javascript
const isPassed = totalScore > 0;
```

**Logic hiện tại:**
- Đạt nếu `totalScore > 0` (có ít nhất 1 điểm)
- Không đạt nếu `totalScore = 0`

**⚠️ Lưu ý:** Logic này khá đơn giản. Bạn có thể thay đổi thành:
```javascript
// Ví dụ: Đạt nếu >= 50% tổng điểm
const totalPossibleScore = allQuestionsAndAnswers.reduce(
    (sum, item) => sum + (item.question_points || 0), 0
);
const isPassed = totalScore >= (totalPossibleScore * 0.5);
```

### 6. Lưu Kết Quả Vào Database

```javascript
await attemptModel.finalizeAttempt(attemptId, totalScore, isPassed, sectionScores);
```

**Hàm `finalizeAttempt` thực hiện:**
1. Cập nhật bảng `User_Exam_Attempts`:
   - `end_time = CURRENT_TIMESTAMP`
   - `score_total = totalScore`
   - `is_passed = isPassed`

2. Thêm điểm từng phần vào bảng `User_Section_Scores`:
   ```sql
   INSERT INTO "User_Section_Scores" (attempt_id, section_id, score)
   VALUES ($1, $2, $3);
   ```

3. Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu

## Tóm Tắt Công Thức Tính Điểm

```
Tổng Điểm = Σ (Điểm câu hỏi i nếu trả lời đúng)

Điểm Phần j = Σ (Điểm câu hỏi i thuộc phần j nếu trả lời đúng)

Đạt/Không Đạt = totalScore > 0
```

## Ví Dụ Minh Họa

**Giả sử bài thi có:**
- Section 1: 
  - Câu 1 (Trắc nghiệm): 2 điểm → Đúng
  - Câu 2 (Sắp xếp): 3 điểm → Sai
- Section 2:
  - Câu 3 (Viết): 5 điểm → Đúng
  - Câu 4 (Ghi âm): 2 điểm → Có trả lời

**Kết quả:**
- Section 1 Score: 2 điểm (chỉ câu 1 đúng)
- Section 2 Score: 7 điểm (câu 3 + câu 4)
- Total Score: 9 điểm
- Is Passed: true (vì 9 > 0)

## Điểm Mạnh & Điểm Yếu

### ✅ Điểm Mạnh
1. Hỗ trợ nhiều loại câu hỏi khác nhau
2. Tính điểm từng phần thi
3. Sử dụng transaction đảm bảo tính toàn vẹn
4. Lưu kết quả chi tiết từng câu (`is_correct`)

### ⚠️ Điểm Cần Cải Thiện
1. **Logic đạt/không đạt quá đơn giản:** Chỉ cần > 0 điểm là đạt
2. **Câu ghi âm:** Không có cơ chế chấm thủ công
3. **Câu viết:** So sánh chính xác, không có fuzzy matching
4. **Không có điểm âm:** Không trừ điểm khi sai
5. **Không có trọng số:** Tất cả câu hỏi có giá trị bằng `points` của nó

## Khuyến Nghị Cải Tiến

1. **Thêm ngưỡng đạt linh hoạt:**
   ```javascript
   const passingPercentage = exam.passing_percentage || 50;
   const isPassed = (totalScore / totalPossibleScore * 100) >= passingPercentage;
   ```

2. **Thêm chấm thủ công cho câu ghi âm:**
   - Lưu trạng thái `pending_review`
   - Admin chấm sau và cập nhật điểm

3. **Cải thiện so sánh câu viết:**
   - Sử dụng Levenshtein distance
   - Cho phép sai sót nhỏ về chính tả

4. **Thêm log chi tiết:**
   - Lưu lại quá trình chấm điểm
   - Giúp debug và audit
