# AI Moderation API Documentation

## 📋 Tổng quan

Hệ thống tích hợp 2 model AI để tự động kiểm duyệt nội dung:
1. **Text Violation Detection** - Phát hiện vi phạm trong văn bản
2. **NSFW Image Detection** - Phát hiện ảnh không phù hợp

## 🔧 Cấu hình

Thêm HF_TOKEN vào file `.env`:
```env
HF_TOKEN=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
```

## 📡 API Endpoints

### 1. Test Text Moderation (Kiểm duyệt văn bản)

**Endpoint:** `POST /api/ai-moderation/test-text`

**Authorization:** Admin only

**Request Body:**
```json
{
  "text": "Thằng chó này, tao sẽ tìm và giết mày thuốc phiện ma túy."
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Text moderation completed",
  "data": {
    "isViolation": true,
    "label": "Kích động Bạo lực",
    "confidence": 0.9977768063545227,
    "confidences": [
      {
        "label": "Kích động Bạo lực",
        "confidence": 0.9977768063545227
      },
      {
        "label": "Ngôn từ Thù địch",
        "confidence": 0.6049338579177856
      }
    ],
    "rawResult": {
      "label": "Kích động Bạo lực",
      "confidences": [...]
    }
  }
}
```

**Các label có thể trả về:**
- `An toàn` - Nội dung an toàn
- `Kích động Bạo lực` - Kích động bạo lực
- `Ngôn từ Thù địch` - Ngôn từ th仇 địch
- `Khiêu dâm` - Nội dung khiêu dâm
- `Ma túy` - Liên quan đến ma túy

---

### 2. Test Image Moderation (Kiểm duyệt ảnh)

**Endpoint:** `POST /api/ai-moderation/test-image`

**Authorization:** Admin only

**Request Body:**
```json
{
  "imageUrl": "https://khoinguonsangtao.vn/wp-content/uploads/2022/07/hinh-anh-anime-toc-xanh.jpg"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Image moderation completed",
  "data": {
    "isNSFW": true,
    "label": "hentai",
    "confidence": 0.9922921657562256,
    "probabilities": {
      "drawings": 0.007704438176006079,
      "hentai": 0.9922921657562256,
      "neutral": 0.000002212843583038193,
      "porn": 0.0000002334946032078733,
      "sexy": 0.0000007784809099575796
    },
    "rawResult": {
      "predicted_label": "hentai",
      "predicted_confidence": 0.9922921657562256,
      "probabilities": {...}
    }
  }
}
```

**Các label có thể trả về:**
- `neutral` - Ảnh bình thường (an toàn)
- `drawings` - Ảnh vẽ (an toàn)
- `sexy` - Ảnh gợi cảm (NSFW)
- `porn` - Ảnh khiêu dâm (NSFW)
- `hentai` - Ảnh hentai (NSFW)

---

### 3. Test Content Moderation (Kiểm duyệt tổng hợp)

**Endpoint:** `POST /api/ai-moderation/test-content`

**Authorization:** Admin only

**Request Body:**
```json
{
  "text": "Đây là nội dung bài viết",
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ]
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Content moderation completed",
  "data": {
    "text": {
      "isViolation": false,
      "label": "An toàn",
      "confidence": 0.95,
      "confidences": [...]
    },
    "images": [
      {
        "url": "https://example.com/image1.jpg",
        "isNSFW": false,
        "label": "neutral",
        "confidence": 0.98,
        "probabilities": {...}
      },
      {
        "url": "https://example.com/image2.jpg",
        "isNSFW": true,
        "label": "hentai",
        "confidence": 0.99,
        "probabilities": {...}
      }
    ],
    "isViolation": true,
    "violationReasons": [
      {
        "type": "image",
        "url": "https://example.com/image2.jpg",
        "label": "hentai",
        "confidence": 0.99
      }
    ]
  }
}
```

---

## 🔨 Sử dụng trong code

### Import service:
```javascript
const aiModerationService = require('../services/aiModerationService');
```

### Kiểm duyệt văn bản:
```javascript
const result = await aiModerationService.detectTextViolation(text);
if (result.isViolation) {
  console.log(`Vi phạm: ${result.label} (${result.confidence})`);
}
```

### Kiểm duyệt ảnh:
```javascript
const result = await aiModerationService.detectImageNSFW(imageUrl);
if (result.isNSFW) {
  console.log(`NSFW: ${result.label} (${result.confidence})`);
}
```

### Kiểm duyệt nội dung tổng hợp:
```javascript
const result = await aiModerationService.moderateContent({
  text: postContent,
  images: postImages
});

if (result.isViolation) {
  console.log('Nội dung vi phạm:', result.violationReasons);
}
```

---

## 📝 Ví dụ sử dụng với cURL

### Test văn bản:
```bash
curl -X POST http://localhost:5000/api/ai-moderation/test-text \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Thằng chó này, tao sẽ tìm và giết mày"
  }'
```

### Test ảnh:
```bash
curl -X POST http://localhost:5000/api/ai-moderation/test-image \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg"
  }'
```

### Test nội dung tổng hợp:
```bash
curl -X POST http://localhost:5000/api/ai-moderation/test-content \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Nội dung bài viết",
    "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
  }'
```

---

## ⚠️ Lưu ý

1. **Timeout**: Mỗi request có timeout 30 giây
2. **Rate Limiting**: Hugging Face có giới hạn số request, nên cache kết quả nếu có thể
3. **Error Handling**: Service sẽ throw error nếu AI model không phản hồi
4. **Authorization**: Tất cả API test yêu cầu admin token
5. **Image URL**: URL ảnh phải public và accessible từ internet

---

## 🚀 Tích hợp vào workflow

### Tự động kiểm duyệt khi tạo post:
```javascript
// Trong postController.createPost
const moderationResult = await aiModerationService.moderateContent({
  text: postData.content,
  images: postData.images
});

if (moderationResult.isViolation) {
  // Đánh dấu post cần review
  postData.auto_flagged = true;
  postData.status = 'pending_review';
}
```

### Tự động kiểm duyệt khi tạo comment:
```javascript
// Trong commentController.createComment
const textResult = await aiModerationService.detectTextViolation(content);

if (textResult.isViolation && textResult.confidence > 0.8) {
  // Tự động gỡ comment
  throw new Error(`Nội dung vi phạm: ${textResult.label}`);
}
```

---

## 📊 Response Fields

### Text Moderation Response:
- `isViolation` (boolean): Có vi phạm hay không
- `label` (string): Loại vi phạm
- `confidence` (number): Độ tin cậy (0-1)
- `confidences` (array): Danh sách tất cả các label và confidence
- `rawResult` (object): Kết quả gốc từ AI model

### Image Moderation Response:
- `isNSFW` (boolean): Có phải NSFW hay không
- `label` (string): Loại ảnh
- `confidence` (number): Độ tin cậy (0-1)
- `probabilities` (object): Xác suất cho từng loại
- `rawResult` (object): Kết quả gốc từ AI model

### Content Moderation Response:
- `text` (object): Kết quả kiểm duyệt văn bản
- `images` (array): Kết quả kiểm duyệt từng ảnh
- `isViolation` (boolean): Có vi phạm tổng thể hay không
- `violationReasons` (array): Danh sách lý do vi phạm
