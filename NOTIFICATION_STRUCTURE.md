# 📢 CẤU TRÚC THÔNG BÁO ĐÃ CHUẨN HÓA

## 🎯 Format Thống Nhất

Tất cả các thông báo trong hệ thống đã được chuẩn hóa theo format sau:

```javascript
await notificationService.createNotification({
  recipient_id: userId,           // ID người nhận
  audience: 'user',                // 'user' | 'admin' | 'all'
  type: 'violation',               // 'violation' | 'community' | 'system' | 'achievement'
  title: '🤖 Tiêu đề ngắn gọn',   // Tiêu đề hiển thị
  content: {                       // ✅ JSON OBJECT với html
    html: '<p>Nội dung HTML...</p>'  // HTML content để hiển thị rich text
  },
  redirect_type: 'post',           // Loại đối tượng
  data: {
    id: objectId,                  // ✅ ID của đối tượng
    data: 'Thông tin chi tiết...'  // ✅ Mô tả văn bản (plain text)
  },
  priority: 2,                     // (Optional) 1-3
  from_system: true                // (Optional) true/false
}, true); // auto push = true
```

**LƯU Ý QUAN TRỌNG:** 
- `content` phải là **JSON object** với key `html` (không phải chuỗi thuần túy)
- `content.html` chứa HTML markup để hiển thị rich text với format đẹp
- Database schema định nghĩa `content` là kiểu `JSON/JSONB`
- `data.id` là ID (UUID) của đối tượng liên quan
- `data.data` là chuỗi văn bản plain text để hiển thị chi tiết (dùng `\n` để xuống dòng)

## 📋 CÁC LOẠI REDIRECT_TYPE

| Redirect Type | Mô tả | Ví dụ |
|--------------|-------|-------|
| `post` | Bài viết | Vi phạm bài viết, like bài viết |
| `comment` | Bình luận | Vi phạm bình luận |
| `achievement` | Thành tích | Đạt achievement mới |
| `profile` | Hồ sơ người dùng | Nhận huy hiệu mới |
| `subscription` | Gói đăng ký | Hết hạn, sắp hết hạn |

## ✅ CÁC HÀM ĐÃ CHUẨN HÓA

### 1. **createPost** - Auto Moderation (AI gỡ bài)
- **File:** `controllers/postController.js`
- **Type:** `violation`
- **Redirect:** `post`
- **Content:** Thông tin chi tiết về vi phạm, lý do AI gỡ bài
- **Data:** ID bài viết + mô tả vi phạm

### 2. **moderatePost** - Admin Remove Post
- **File:** `controllers/postController.js`
- **Type:** `violation`
- **Redirect:** `post`
- **Content:** Lý do gỡ, các rule vi phạm, độ nghiêm trọng
- **Data:** ID bài viết + chi tiết vi phạm

### 3. **moderatePost** - Admin Restore Post
- **File:** `controllers/postController.js`
- **Type:** `community`
- **Redirect:** `post`
- **Content:** Lý do khôi phục, số vi phạm đã xóa
- **Data:** ID bài viết + thông tin khôi phục

### 4. **toggleLikePost** - Someone Liked Post
- **File:** `controllers/postController.js`
- **Type:** `community`
- **Redirect:** `post`
- **Content:** Ai đã like, tổng số like, thời gian
- **Data:** ID bài viết + thông tin người like

### 5. **updateUserBadge** - New Badge Unlocked
- **File:** `models/userModel.js`
- **Type:** `system`
- **Redirect:** `profile`
- **Content:** Tên huy hiệu, level, điểm, mô tả
- **Data:** ID user + thông tin huy hiệu
- **Priority:** 2 (cao)

### 6. **addAchievement** - New Achievement Unlocked
- **File:** `models/userModel.js`
- **Type:** `system`
- **Redirect:** `achievement`
- **Content:** Tên achievement, mô tả, điểm nhận được
- **Data:** ID achievement + chi tiết
- **Priority:** 2 (cao)

### 7. **moderatePost** (AI) - Auto Remove Post
- **File:** `services/autoModerationService.js`
- **Type:** `violation`
- **Redirect:** `post`
- **Content:** Chi tiết vi phạm, confidence score, các rule
- **Data:** ID bài viết + thông tin AI detection

### 8. **moderateComment** (AI) - Auto Remove Comment
- **File:** `services/autoModerationService.js`
- **Type:** `violation`
- **Redirect:** `comment`
- **Content:** Chi tiết vi phạm comment, confidence score
- **Data:** ID comment + thông tin AI detection

### 9. **checkAndNotifyExpiringSubscriptions** - Expiring Soon
- **File:** `services/userSubscriptionService.js`
- **Type:** `system`
- **Redirect:** `subscription`
- **Content:** Thông tin gói, số ngày còn lại, giá
- **Data:** ID subscription + chi tiết gói
- **Priority:** 2 (cao)

### 10. **checkAndNotifyExpiringSubscriptions** - Expired
- **File:** `services/userSubscriptionService.js`
- **Type:** `system`
- **Redirect:** `subscription`
- **Content:** Thông báo hết hạn, đã chuyển về Free
- **Data:** ID subscription + thông tin hết hạn
- **Priority:** 2 (cao)

### 11. **createComment** - New Comment on Post
- **File:** `controllers/commentController.js`
- **Type:** `community`
- **Redirect:** `post_comment`
- **Content:** Thông báo có người bình luận bài viết
- **Data:** ID comment + thông tin người bình luận

### 12. **createComment** - Reply to Comment
- **File:** `controllers/commentController.js`
- **Type:** `community`
- **Redirect:** `post_comment`
- **Content:** Thông báo có người trả lời bình luận
- **Data:** ID comment + thông tin người trả lời

### 13. **restoreComment** - Admin Restore Comment
- **File:** `controllers/commentController.js`
- **Type:** `community`
- **Redirect:** `post_comment`
- **Content:** Lý do khôi phục, số vi phạm đã xóa
- **Data:** ID comment + thông tin khôi phục

### 14. **removeCommentWithViolation** - Admin Remove Comment
- **File:** `controllers/commentController.js`
- **Type:** `violation`
- **Redirect:** `post_comment`
- **Content:** Lý do gỡ, các rule vi phạm, độ nghiêm trọng
- **Data:** ID comment + chi tiết vi phạm

## 🎨 MẪU CONTENT CHI TIẾT

### Ví dụ 1: Vi phạm bài viết (AI Auto-Remove)
```javascript
{
  type: 'violation',
  title: '🤖 Bài viết của bạn đã bị gỡ tự động',
  content: {
    html: `<p>Bài viết <strong>"Tiêu đề bài viết"</strong> của bạn đã bị hệ thống AI tự động phát hiện và gỡ bỏ do vi phạm quy tắc cộng đồng.</p>
<p><strong>Lý do:</strong> Ngôn từ thù địch<br>
<strong>Độ nghiêm trọng:</strong> <span class="badge-high">high</span><br>
<strong>Phát hiện bởi:</strong> AI tự động</p>
<p><strong>Các quy tắc bị vi phạm:</strong></p>
<ul>
  <li><strong>Ngôn từ thù địch</strong> (high): Không được sử dụng ngôn từ kích động thù địch</li>
  <li><strong>Spam</strong> (medium): Không spam nội dung</li>
</ul>
<p><strong>Chi tiết phát hiện:</strong></p>
<ul>
  <li>Loại: content, Nhãn: hate_speech, Độ tin cậy: 95.5%</li>
  <li>Loại: title, Nhãn: spam, Độ tin cậy: 87.3%</li>
</ul>
<p><em>Nội dung bài viết:</em> "Lorem ipsum dolor sit amet..."</p>
<p><small>Bạn có thể khiếu nại quyết định này nếu cho rằng đây là nhầm lẫn.</small></p>`
  },
  data: {
    id: "post-uuid-123",
    data: "Bài viết: Tiêu đề bài viết\nLý do: Ngôn từ thù địch\nĐộ nghiêm trọng: high\n..."
  }
}
```

### Ví dụ 2: Đạt achievement
```javascript
{
  type: 'achievement',
  title: '🏆 Bạn đã đạt thành tích mới!',
  content: {
    html: `<h3>🎉 Chúc mừng! Bạn đã mở khóa thành tích mới!</h3>
<p>Bạn đã đạt thành tích <strong>"Người đóng góp tích cực"</strong>.</p>
<p><em>Đăng 10 bài viết chất lượng trong tháng</em></p>
<p>🎁 <strong>Phần thưởng:</strong> +50 điểm cộng đồng</p>
<p>📈 <strong>Tiến độ:</strong> 10/10</p>
<p><small>Hãy tiếp tục phát huy để mở khóa thêm nhiều thành tích khác!</small></p>`
  },
  data: {
    id: "achievement-uuid-456",
    data: "Thành tích: Người đóng góp tích cực\nMô tả: Đăng 10 bài viết chất lượng\nĐiểm: 50\nTiến độ: 10/10"
  }
}
```

### Ví dụ 3: Có người like bài viết
```javascript
{
  type: 'community',
  title: '❤️ Có người thích bài viết của bạn',
  content: {
    html: `<p><strong>Nguyễn Văn A</strong> đã thích bài viết <strong>"Học tiếng Trung hiệu quả"</strong> của bạn.</p>
<p>❤️ Tổng số lượt thích: <strong>25</strong></p>
<p><em>Nội dung bài viết:</em> "Chia sẻ kinh nghiệm học tiếng Trung..."</p>`
  },
  data: {
    id: "post-uuid-789",
    data: "Bài viết: Học tiếng Trung hiệu quả\nNgười thích: Nguyễn Văn A\nTổng lượt thích: 25"
  }
}
```

### Ví dụ 4: Gói sắp hết hạn
```javascript
{
  type: 'system',
  title: '⏰ Gói đăng ký sắp hết hạn trong 3 ngày',
  content: {
    html: `<p>Gói <strong>"Premium"</strong> của bạn sẽ hết hạn vào <strong>25/11/2025</strong> (còn 3 ngày).</p>
<p>Gia hạn ngay để không bị gián đoạn dịch vụ.</p>
<p><strong>Thông tin gói:</strong></p>
<ul>
  <li>Tên gói: Premium</li>
  <li>Giá: 99,000 VNĐ</li>
  <li>Thời hạn: 1 tháng</li>
  <li>Tự động gia hạn: Không</li>
  <li>Ngày hết hạn: 25/11/2025</li>
</ul>`
  },
  data: {
    id: "subscription-uuid-101",
    data: "Gói: Premium\nGiá: 99,000 VNĐ\nThời hạn: 1 tháng\nCòn lại: 3 ngày\nHết hạn: 25/11/2025"
  }
}
```

### Ví dụ 5: Có người bình luận bài viết
```javascript
{
  type: 'community',
  title: '💬 Có người bình luận bài viết của bạn',
  content: {
    html: `<p><strong>Nguyễn Văn A</strong> đã bình luận vào bài viết <strong>"Học tiếng Trung hiệu quả"</strong> của bạn.</p>
<p><em>Nội dung bình luận:</em> "Cảm ơn bạn đã chia sẻ, rất hữu ích!"</p>`
  },
  data: {
    id: "comment-uuid-202",
    data: "Bài viết: Học tiếng Trung hiệu quả\nNgười bình luận: Nguyễn Văn A\nNội dung: Cảm ơn bạn đã chia sẻ...\nThời gian: 22/11/2025 15:30:00"
  }
}
```

### Ví dụ 6: Trả lời bình luận
```javascript
{
  type: 'community',
  title: '↩️ Có người trả lời bình luận của bạn',
  content: {
    html: `<p><strong>Trần Thị B</strong> đã trả lời bình luận của bạn.</p>
<p><em>Nội dung trả lời:</em> "Mình cũng đang học theo phương pháp này!"</p>
<p><small>Nhấn để xem chuỗi bình luận đầy đủ</small></p>`
  },
  data: {
    id: "comment-uuid-203",
    data: "Người trả lời: Trần Thị B\nNội dung: Mình cũng đang học...\nThời gian: 22/11/2025 15:35:00"
  }
}
```

### Ví dụ 7: Khôi phục bình luận
```javascript
{
  type: 'community',
  title: '✅ Bình luận của bạn đã được khôi phục',
  content: {
    html: `<p>Bình luận của bạn đã được quản trị viên khôi phục.</p>
<p><strong>Lý do khôi phục:</strong> Sau khi xem xét lại, nội dung không vi phạm quy tắc cộng đồng.</p>
<p>✅ Đã xóa <strong>1</strong> vi phạm liên quan.</p>
<p><em>Nội dung bình luận:</em> "Đây là ý kiến cá nhân của tôi..."</p>
<p><small>Cảm ơn bạn đã đóng góp ý kiến cho cộng đồng!</small></p>`
  },
  data: {
    id: "comment-uuid-204",
    data: "Lý do khôi phục: Sau khi xem xét lại...\nKhôi phục bởi: Quản trị viên\nVi phạm đã xóa: 1"
  }
}
```

## 📊 THỐNG KÊ

- ✅ **14 hàm** đã được chuẩn hóa
- ✅ **6 loại redirect_type** được sử dụng (post, comment, post_comment, achievement, profile, subscription)
- ✅ **4 loại type** thông báo (violation, community, system, achievement)
- ✅ **100% auto push** được bật
- ✅ **0 lỗi syntax** sau khi chuẩn hóa
- ✅ **100% HTML content** với rich text formatting

## 🔧 LƯU Ý KHI SỬ DỤNG

1. **content** phải là **JSON object** với key `html` (không phải string thuần)
   ```javascript
   // ✅ ĐÚNG
   content: { html: "<p>Nội dung HTML...</p>" }
   
   // ❌ SAI - Sẽ gây lỗi "invalid input syntax for type json"
   content: "Nội dung chi tiết..."
   ```

2. **content.html** nên sử dụng HTML markup để format đẹp:
   - `<p>` cho đoạn văn
   - `<strong>` cho chữ đậm
   - `<em>` cho chữ nghiêng
   - `<ul><li>` cho danh sách
   - `<h3>` cho tiêu đề phụ
   - `<small>` cho chữ nhỏ
   - `<br>` để xuống dòng

3. **data.id** phải là ID (UUID/string) của đối tượng liên quan

4. **data.data** phải là plain text có format rõ ràng (dùng `\n` để xuống dòng)

5. **redirect_type** phải khớp với loại đối tượng:
   - `post` - Bài viết
   - `comment` - Bình luận
   - `achievement` - Thành tích
   - `profile` - Hồ sơ người dùng
   - `subscription` - Gói đăng ký

6. **type** phải đúng loại thông báo:
   - `violation` - Vi phạm
   - `community` - Cộng đồng (like, comment...)
   - `system` - Hệ thống (badge, subscription...)
   - `achievement` - Thành tích

7. Luôn bật **auto push = true** để gửi push notification ngay lập tức

8. Sử dụng **priority = 2** cho thông báo quan trọng (badge, achievement, subscription)

9. Thêm emoji vào **title** để thu hút sự chú ý:
   - 🤖 - AI tự động
   - ❤️ - Like/yêu thích
   - ⚠️ - Cảnh báo
   - ✅ - Thành công/khôi phục
   - 🏆 - Thành tích
   - 🎖️ - Huy hiệu
   - ⏰ - Nhắc nhở thời gian

10. Sử dụng `new Date().toLocaleString('vi-VN')` để format thời gian theo múi giờ Việt Nam

11. Thêm `<small>` ở cuối để gợi ý hành động hoặc thông tin bổ sung

---

**Cập nhật:** 22/11/2025
**Trạng thái:** ✅ Hoàn thành
