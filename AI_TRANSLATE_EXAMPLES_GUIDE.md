# Hướng dẫn chức năng Dịch AI với Phân tích Từ

## 🎯 Tổng quan

Chức năng mới này cho phép dịch văn bản và tự động phân tích từng từ quan trọng trong bản dịch, sinh ra các câu ví dụ thực tế.

## 🚀 Endpoint

```
POST /api/ai/translate-with-examples
```

## 📋 Request Format

```json
{
  "text": "Xin chào",
  "direction": "vi-zh"
}
```

**Parameters:**

- `text` (string, required): Văn bản cần dịch (≤ 1000 ký tự)
- `direction` (string, optional):
  - `"vi-zh"`: Việt → Trung
  - `"zh-vi"`: Trung → Việt
  - Bỏ trống: Auto-detect

## 📤 Response Format

```json
{
  "success": true,
  "data": {
    "id": 123,
    "source_text": "Xin chào",
    "translated_text": "你好",
    "source_lang": "vi",
    "target_lang": "zh",
    "word_breakdown": [
      {
        "analyzed_word": "你好",
        "word_meaning": "lời chào hỏi thân thiện",
        "pinyin": "nǐ hǎo",
        "word_type": "cụm từ",
        "usage_note": "Sử dụng trong mọi tình huống",
        "example_sentences": [
          {
            "example_zh": "你好,很高兴见到你",
            "example_vi": "Xin chào, rất vui được gặp bạn",
            "pinyin": "nǐ hǎo, hěn gāoxìng jiàn dào nǐ",
            "context": "Chào hỏi khi gặp người lần đầu"
          },
          {
            "example_zh": "你好吗?",
            "example_vi": "Bạn có khỏe không?",
            "pinyin": "nǐ hǎo ma?",
            "context": "Hỏi thăm sức khỏe"
          }
        ]
      }
    ],
    "model": "gemini-2.0-flash",
    "created_at": "2025-01-01T00:00:00.000Z"
  },
  "usage": {
    "current_usage": 6,
    "daily_limit": 10,
    "remaining": 4
  }
}
```

## ⚙️ Cấu hình môi trường

### Biến môi trường

Thêm vào file `.env`:

```env
# Giới hạn lượt dịch AI mỗi ngày (mặc định: 10)
AI_TRANSLATION_DAILY_LIMIT=10

# Gemini API Key (bắt buộc)
GEMINI_API_KEY=your_gemini_api_key_here

# Model Gemini sử dụng (tùy chọn)
GEMINI_MODEL=gemini-2.0-flash
```

## 🔒 Giới hạn sử dụng

### Rate Limiting

- **Giới hạn**: 10 lượt/ngày/user (có thể cấu hình)
- **Reset**: 00:00 UTC+7 hàng ngày
- **Status code**: 429 khi vượt quá giới hạn

### Response khi vượt giới hạn

```json
{
  "success": false,
  "message": "Bạn đã vượt quá giới hạn dịch AI hôm nay",
  "data": {
    "current_usage": 10,
    "daily_limit": 10,
    "reset_time": "00:00 UTC+7 tomorrow"
  }
}
```

## 🎨 Đặc điểm phân biệt

### So với dịch thường (`/ai/translate`)

| Feature        | Dịch thường | Dịch AI với phân tích |
| -------------- | ----------- | --------------------- |
| Phân tích từ   | ❌          | ✅                    |
| Câu ví dụ      | ❌          | ✅                    |
| Giới hạn ký tự | 5000        | 1000                  |
| Rate limit     | Không       | 10/ngày               |
| Database flag  | `ai: false` | `ai: true`            |

### Lưu trữ Database

```json
{
  "metadata": {
    "word_breakdown": [...],
    "translation_type": "with_examples",
    "ai": true
  }
}
```

## 🎯 Cách hoạt động

### 1. Quy trình phân tích

1. **Dịch**: Chuyển văn bản từ ngôn ngữ gốc sang ngôn ngữ đích
2. **Phân tích**: Trích xuất 3-5 từ quan trọng nhất từ **bản dịch**
3. **Sinh ví dụ**: Tạo 2-3 câu ví dụ cho mỗi từ được phân tích

### 2. Xử lý ngôn ngữ

- **Tiếng Trung**: Bao gồm pinyin cho từ và câu ví dụ
- **Tiếng Việt**: pinyin = null
- **Auto-detect**: Dựa trên ký tự đặc trưng

### 3. Validation

- Text không rỗng
- Độ dài ≤ 1000 ký tự
- JWT token hợp lệ
- Chưa vượt quá giới hạn ngày

## 🛠️ Troubleshooting

### Lỗi thường gặp

1. **"Thiếu text cần dịch"**

   - Kiểm tra body request có trường `text`

2. **"Text quá dài cho dịch với ví dụ"**

   - Giảm độ dài xuống ≤ 1000 ký tự

3. **"Bạn đã vượt quá giới hạn dịch AI hôm nay"**

   - Chờ đến 00:00 ngày mai hoặc tăng `AI_TRANSLATION_DAILY_LIMIT`

4. **"Gemini trả về JSON không hợp lệ"**
   - Kiểm tra GEMINI_API_KEY
   - Thử model khác

### Debug

Để debug, tạm thời uncomment các dòng console.log trong controller.

---

_Cập nhật lần cuối: 17/11/2025_
