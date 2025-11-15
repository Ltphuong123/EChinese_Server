# Auto Moderation Guide - Hướng dẫn Kiểm duyệt Tự động

## 📋 Tổng quan

Hệ thống tự động kiểm duyệt nội dung bằng AI khi người dùng tạo post hoặc comment. Nếu phát hiện vi phạm, hệ thống sẽ:
1. Tự động gỡ nội dung
2. Tạo bản ghi vi phạm
3. Gửi thông báo cho người dùng

## 🔄 Quy trình hoạt động

### Khi tạo Post:
```
User tạo post → Lưu vào DB → Trả về response ngay lập tức
                              ↓
                    (Background) AI kiểm duyệt
                              ↓
                    Nếu vi phạm → Gỡ post + Tạo violation + Thông báo
```

### Khi tạo Comment:
```
User tạo comment → Lưu vào DB → Trả về response ngay lập tức
                                 ↓
                       (Background) AI kiểm duyệt
                                 ↓
                       Nếu vi phạm → Gỡ comment + Tạo violation + Thông báo
```

## 🎯 Ngưỡng phát hiện

### Text Moderation:
- **Confidence > 0.7**: Coi là vi phạm
- **Confidence > 0.8**: Severity = medium
- **Confidence > 0.9**: Severity = high

### Image Moderation:
- **Confidence > 0.7**: Coi là NSFW
- **Confidence > 0.8**: Severity = medium
- **Confidence > 0.9**: Severity = high

## 📝 Các loại vi phạm

### Text Violations:
- `An toàn` - Không vi phạm (bỏ qua)
- `Kích động Bạo lực` - Vi phạm
- `Ngôn từ Thù địch` - Vi phạm
- `Khiêu dâm` - Vi phạm
- `Ma túy` - Vi phạm

### Image Violations:
- `neutral` - Không vi phạm (bỏ qua)
- `drawings` - Không vi phạm (bỏ qua)
- `sexy` - Vi phạm NSFW
- `porn` - Vi phạm NSFW
- `hentai` - Vi phạm NSFW

## 🔧 Cấu hình

### 1. Bật/Tắt Auto Moderation

Để tắt tạm thời, comment out code trong controller:

```javascript
// controllers/postController.js
// autoModerationService.moderatePost(...).then(...).catch(...);
```

### 2. Điều chỉnh ngưỡng

Sửa trong `services/autoModerationService.js`:

```javascript
// Thay đổi từ 0.7 thành giá trị khác
if (textResult.isViolation && textResult.confidence > 0.7) {
  // ...
}
```

### 3. Thêm/Sửa Community Rules

Rules được tự động tạo khi phát hiện vi phạm. Hoặc tạo thủ công:

```sql
INSERT INTO "CommunityRules" (title, description, severity_default, is_active)
VALUES 
  ('Kích động Bạo lực', 'Nội dung kích động bạo lực', 'high', true),
  ('Ảnh khỏa thân và Hoạt động Tình dục của Người lớn', 'Ảnh NSFW', 'high', true);
```

## 📊 Monitoring

### Xem logs:
```bash
# Logs sẽ hiển thị khi có vi phạm
Post 123 auto-removed: Vi phạm nội dung: Kích động Bạo lực
Comment 456 auto-removed: Vi phạm nội dung: Ngôn từ Thù địch
```

### Query violations:
```sql
-- Xem các vi phạm tự động
SELECT * FROM "Violations" 
WHERE detected_by = 'auto_ai' 
ORDER BY created_at DESC;

-- Xem thống kê
SELECT 
  target_type,
  severity,
  COUNT(*) as count
FROM "Violations"
WHERE detected_by = 'auto_ai'
GROUP BY target_type, severity;
```

## 🚨 Xử lý False Positives

Nếu AI gỡ nhầm nội dung:

### 1. Admin khôi phục:
```bash
POST /api/community/posts/:postId/moderation
{
  "action": "restore",
  "post_update": {
    "status": "published",
    "deleted_at": null,
    "deleted_by": null,
    "deleted_reason": null
  }
}
```

### 2. User khiếu nại:
```bash
POST /api/moderation/appeals
{
  "violation_id": "uuid",
  "reason": "Nội dung không vi phạm, AI phát hiện nhầm"
}
```

## 📈 Performance

### Async Processing:
- AI moderation chạy background, không block response
- User nhận response ngay lập tức
- Nội dung bị gỡ sau vài giây nếu vi phạm

### Timeout:
- Text moderation: 60 giây
- Image moderation: 60 giây
- Nếu timeout → Không gỡ, log error

### Fallback:
- Nếu AI API fail → Sử dụng mock data (keyword detection)
- Mock data chỉ để test, không nên dùng production

## 🔐 Security

### 1. Rate Limiting:
AI API có rate limit, nên:
- Cache kết quả nếu có thể
- Implement queue nếu traffic cao

### 2. Privacy:
- Nội dung được gửi đến Hugging Face API
- Không lưu trữ nội dung trên HF servers
- Chỉ nhận kết quả phân tích

## 🧪 Testing

### Test với mock data:
```javascript
// Mock data tự động bật khi AI API fail
// Kiểm tra từ khóa:
// - Text: "chó", "giết", "ma túy"
// - Image URL: "anime", "hentai"
```

### Test với real API:
```bash
# Test text
curl -X POST http://localhost:5000/api/ai-moderation/test-text \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Thằng chó này, tao sẽ giết mày"}'

# Test image
curl -X POST http://localhost:5000/api/ai-moderation/test-image \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/image.jpg"}'
```

## 📝 Database Schema

### Violations Table:
```sql
- user_id: UUID của người vi phạm
- target_type: 'post' hoặc 'comment'
- target_id: ID của post/comment
- severity: 'low', 'medium', 'high'
- detected_by: 'auto_ai' (tự động) hoặc 'admin' (thủ công)
- resolution: Lý do gỡ
```

### ViolationRules Table:
```sql
- violation_id: UUID của violation
- rule_id: UUID của CommunityRule
```

### CommunityRules Table:
```sql
- title: Tên quy tắc (unique)
- description: Mô tả
- severity_default: 'low', 'medium', 'high'
- is_active: boolean
```

## 🎯 Best Practices

1. **Không block user response**: AI chạy background
2. **Log mọi thứ**: Để debug và improve
3. **Review false positives**: Cải thiện threshold
4. **Thông báo rõ ràng**: User cần biết tại sao bị gỡ
5. **Cho phép khiếu nại**: User có quyền appeal
6. **Monitor performance**: Đảm bảo AI API stable
7. **Backup plan**: Mock data khi API fail

## 🔄 Future Improvements

1. **Queue system**: Xử lý hàng loạt với Bull/Redis
2. **ML model training**: Train model riêng với data của bạn
3. **Multi-language**: Hỗ trợ nhiều ngôn ngữ
4. **Context aware**: Xem xét context của conversation
5. **User reputation**: Tin tưởng user có reputation cao hơn
6. **A/B testing**: Test các threshold khác nhau
