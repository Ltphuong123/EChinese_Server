# Cập nhật API GET /api/attempts/:attemptId/result

## Tổng quan thay đổi

API `GET /api/attempts/:attemptId/result` đã được cập nhật để trả về **cấu trúc đề thi đầy đủ** giống như API admin `GET /api/admin/exams/:id`, đồng thời bổ sung thêm:
- ✅ Đáp án đúng của tất cả câu hỏi
- ✅ Đáp án người dùng đã chọn
- ✅ Trạng thái đúng/sai của từng câu
- ✅ Thông tin điểm số và kết quả tổng hợp

## File đã thay đổi

### 1. `models/attemptModel.js` - Method `getFinalResult`

**Thay đổi chính:**
- Query trả về **toàn bộ cấu trúc đề thi** theo format chuẩn (sections → subsections → prompts + questions)
- Mỗi question có thêm 2 field:
  - `user_response`: Đáp án người dùng đã chọn
  - `is_correct`: Câu trả lời đúng hay sai
- Giữ nguyên tất cả thông tin: options, correct_answers, explanation
- Thêm field `section_scores` để hiển thị điểm từng phần

## Cấu trúc Response mới

```json
{
  "success": true,
  "message": "Lấy kết quả thành công.",
  "data": {
    // === THÔNG TIN ATTEMPT ===
    "attempt_id": "uuid",
    "start_time": "2024-01-01T10:00:00Z",
    "end_time": "2024-01-01T11:30:00Z",
    "score_total": 180,
    "is_passed": true,
    "attempt_number": 1,
    
    // === THÔNG TIN ĐỀ THI ===
    "id": "exam_uuid",
    "name": "HSK 3 - Đề thi mẫu 1",
    "description": "Mô tả đề thi",
    "instructions": "Hướng dẫn làm bài",
    "total_time_minutes": 90,
    "exam_type_id": "uuid",
    "exam_type_name": "HSK",
    "exam_level_id": "uuid",
    "exam_level_name": "HSK 3",
    "is_published": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    
    // === ĐIỂM TỪNG PHẦN ===
    "section_scores": [
      {
        "section_id": "uuid",
        "section_name": "Nghe hiểu",
        "score": 60,
        "correct_count": 15,
        "total_questions": 20
      },
      {
        "section_id": "uuid",
        "section_name": "Đọc hiểu",
        "score": 65,
        "correct_count": 18,
        "total_questions": 20
      },
      {
        "section_id": "uuid",
        "section_name": "Viết",
        "score": 55,
        "correct_count": 12,
        "total_questions": 20
      }
    ],
    
    // === CẤU TRÚC ĐỀ THI ĐẦY ĐỦ ===
    "sections": [
      {
        "id": "section_uuid",
        "exam_id": "exam_uuid",
        "name": "Nghe hiểu",
        "description": "Phần nghe",
        "order": 1,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        
        "subsections": [
          {
            "id": "subsection_uuid",
            "section_id": "section_uuid",
            "name": "Phần 1",
            "description": "Nghe và chọn đáp án đúng",
            "order": 1,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            
            // === PROMPTS (Đoạn văn/Audio dùng chung) ===
            "prompts": [
              {
                "id": "prompt_uuid",
                "subsection_id": "subsection_uuid",
                "content": "Nội dung đoạn văn hoặc null nếu chỉ có audio",
                "image_json": { "url": "...", "alt": "..." },
                "audio_url": "https://...",
                "order": 1
              }
            ],
            
            // === QUESTIONS (Câu hỏi) ===
            "questions": [
              {
                "id": "question_uuid",
                "subsection_id": "subsection_uuid",
                "question_type_id": "uuid",
                "content": "Nội dung câu hỏi",
                "image": { "url": "...", "alt": "..." },
                "audio_url": "https://...",
                "correct_answer": "Đáp án đúng (cho câu điền từ/sắp xếp)",
                "points": 1,
                "order": 1,
                "prompt_id": "prompt_uuid hoặc null",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
                
                // === ĐÁP ÁN NGƯỜI DÙNG ĐÃ CHỌN ===
                "user_response": "option_uuid hoặc text",
                "is_correct": true,
                
                // === CÁC LỰA CHỌN (Cho câu trắc nghiệm) ===
                "options": [
                  {
                    "id": "option_uuid",
                    "question_id": "question_uuid",
                    "label": "A",
                    "content": "Nội dung đáp án A",
                    "image": { "url": "...", "alt": "..." },
                    "audio_url": "https://...",
                    "is_correct": true,  // ✅ ĐÁP ÁN ĐÚNG
                    "order": 1,
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                  }
                ],
                
                // === ĐÁP ÁN ĐÚNG (Cho câu điền từ/sắp xếp) ===
                "correct_answers": [
                  {
                    "id": "uuid",
                    "question_id": "question_uuid",
                    "answer": "đáp án 1",
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                  }
                ],
                
                // === GIẢI THÍCH ===
                "explanation": {
                  "id": "uuid",
                  "content": "Giải thích tại sao đáp án này đúng",
                  "question_id": "question_uuid"
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

## So sánh với API cũ

### API cũ (Flat structure)
```json
{
  "questions": [
    {
      "question_id": "...",
      "question_content": "...",
      "user_response": "...",
      "is_correct": true,
      "options": [...]
    }
  ]
}
```

### API mới (Hierarchical structure)
```json
{
  "sections": [
    {
      "subsections": [
        {
          "prompts": [...],
          "questions": [
            {
              "user_response": "...",
              "is_correct": true,
              "options": [...],
              "correct_answers": [...],
              "explanation": {...}
            }
          ]
        }
      ]
    }
  ]
}
```

## Lợi ích của cấu trúc mới

1. **Cấu trúc đầy đủ**: Giữ nguyên cấu trúc phân cấp của đề thi (sections → subsections → questions)
2. **Dễ render UI**: Frontend có thể render theo đúng layout của đề thi
3. **Có prompts**: Hiển thị được đoạn văn/audio dùng chung cho nhiều câu hỏi
4. **Đầy đủ metadata**: Có tất cả thông tin về đề thi, loại đề, cấp độ
5. **Điểm chi tiết**: Có điểm từng phần và tổng điểm
6. **Review dễ dàng**: Người dùng có thể xem lại toàn bộ bài làm với đáp án đúng

## Sử dụng

API endpoint không thay đổi:
```
GET /api/attempts/:attemptId/result
```

Headers:
```
Authorization: Bearer <token>
```

Response giống như trên, với cấu trúc đầy đủ của đề thi + đáp án người dùng + đáp án đúng.

## Lưu ý

- API chỉ trả về kết quả nếu bài thi đã được nộp (`score_total IS NOT NULL`)
- Chỉ người làm bài mới xem được kết quả của mình (kiểm tra `user_id`)
- Tất cả đáp án đúng đều được trả về (field `is_correct` trong options, `correct_answers` array)
- Field `user_response` và `is_correct` được thêm vào mỗi question để biết người dùng đã chọn gì và đúng/sai


