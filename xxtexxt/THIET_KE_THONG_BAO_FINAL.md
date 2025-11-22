# 📬 Thiết Kế Thông Báo - Phiên Bản Cuối Cùng

## 📋 Cấu Trúc Mới (Đơn Giản Hóa)

### Thay Đổi:
- ❌ Bỏ `related_type` và `related_id`
- ❌ Bỏ `redirect_data` riêng
- ✅ Gộp tất cả vào `data` duy nhất
- ✅ Thêm `redirect_type` để xác định loại điều hướng

### Format Mới:
```json
{
  "type": "community",
  "title": "❤️ John Doe đã thích bài viết của bạn",
  "content": {
    "message": "John Doe đã thích bài viết \"Cách học tiếng Trung\""
  },
  "redirect_type": "post",
  "data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
    "liker_id": "770e8400-e29b-41d4-a716-446655440002",
    "liker_name": "John Doe",
    "liker_avatar": "https://..."
  },
  "priority": 1
}
```

---

## 1️⃣ THÔNG BÁO CỘNG ĐỒNG

### 1.1. Like Bài Viết

```json
{
  "type": "community",
  "title": "❤️ {username} đã thích bài viết của bạn",
  "content": {
    "message": "{username} đã thích bài viết \"{post_title}\""
  },
  "redirect_type": "post",
  "data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
    "post_title": "Cách học tiếng Trung hiệu quả",
    "liker_id": "770e8400-e29b-41d4-a716-446655440002",
    "liker_name": "John Doe",
    "liker_avatar": "https://example.com/avatar.jpg"
  },
  "priority": 1
}
```

---

### 1.2. Comment Bài Viết

```json
{
  "type": "community",
  "title": "💬 {username} đã bình luận bài viết của bạn",
  "content": {
    "message": "{username} đã bình luận: \"{comment_preview}...\""
  },
  "redirect_type": "post_comment",
  "data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
    "comment_id": "880e8400-e29b-41d4-a716-446655440003",
    "commenter_id": "990e8400-e29b-41d4-a716-446655440004",
    "commenter_name": "Jane Smith",
    "commenter_avatar": "https://example.com/avatar2.jpg",
    "comment_preview": "Bài viết rất hay, cảm ơn bạn!"
  },
  "priority": 1
}
```

---

### 1.3. Reply Comment

```json
{
  "type": "community",
  "title": "↩️ {username} đã phản hồi bình luận của bạn",
  "content": {
    "message": "{username} đã phản hồi: \"{reply_preview}...\""
  },
  "redirect_type": "post_comment",
  "data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
    "comment_id": "990e8400-e29b-41d4-a716-446655440005",
    "parent_comment_id": "880e8400-e29b-41d4-a716-446655440003",
    "replier_id": "aa0e8400-e29b-41d4-a716-446655440006",
    "replier_name": "Alex Nguyen",
    "replier_avatar": "https://example.com/avatar3.jpg",
    "reply_preview": "Tôi cũng nghĩ vậy!"
  },
  "priority": 1
}
```

---


---

## 2️⃣ THÔNG BÁO KIỂM DUYỆT


---

### 2.2. Gỡ Bài Viết

```json
{
  "type": "moderation",
  "title": "🗑️ Bài viết của bạn đã bị gỡ",
  "content": {
    "message": "Bài viết \"{post_title}\" đã bị gỡ do vi phạm: {reason}"
  },
  "redirect_type": "community_rules",
  "data": {
    "target_type": "post",
    "target_id": "660e8400-e29b-41d4-a716-446655440001",
    "post_title": "Tiêu đề bài viết",
    "reason": "Nội dung spam",
    "report_id": "bb0e8400-e29b-41d4-a716-446655440007",
    "violation_id": "cc0e8400-e29b-41d4-a716-446655440008",
    "removed_by": "admin",
    "removed_at": "2024-01-16T10:00:00Z"
  },
  "priority": 2,
  "from_system": true
}
```

---

### 2.3. Gỡ Bình Luận

```json
{
  "type": "moderation",
  "title": "🗑️ Bình luận của bạn đã bị gỡ",
  "content": {
    "message": "Bình luận \"{comment_preview}...\" đã bị gỡ do vi phạm: {reason}"
  },
  "redirect_type": "community_rules",
  "data": {
    "target_type": "comment",
    "target_id": "880e8400-e29b-41d4-a716-446655440003",
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
    "comment_preview": "Nội dung bình luận",
    "reason": "Ngôn từ không phù hợp",
    "report_id": "bb0e8400-e29b-41d4-a716-446655440007",
    "violation_id": "cc0e8400-e29b-41d4-a716-446655440008",
    "removed_by": "admin",
    "removed_at": "2024-01-16T10:00:00Z"
  },
  "priority": 2,
  "from_system": true
}
```

---

### 2.4. Cảnh Báo Vi Phạm

```json
{
  "type": "warning",
  "title": "⚠️ Cảnh báo vi phạm quy định cộng đồng",
  "content": {
    "message": "Nội dung của bạn vi phạm quy định: {reason}. Đây là lần cảnh báo thứ {warning_count}."
  },
  "redirect_type": "community_rules",
  "data": {
    "target_type": "post",
    "target_id": "660e8400-e29b-41d4-a716-446655440001",
    "reason": "Nội dung không phù hợp",
    "warning_count": "1",
    "total_warnings": "3",
    "violation_id": "cc0e8400-e29b-41d4-a716-446655440008"
  },
  "priority": 2,
  "from_system": true
}
```

---

### 2.5. Chấp Nhận Khiếu Nại

```json
{
  "type": "appeal_accepted",
  "title": "✅ Khiếu nại của bạn đã được chấp nhận",
  "content": {
    "message": "Khiếu nại về {target_type} đã được xem xét và chấp nhận. Nội dung đã được khôi phục."
  },
  "redirect_type": "post",
  "data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
    "appeal_id": "dd0e8400-e29b-41d4-a716-446655440009",
    "violation_id": "cc0e8400-e29b-41d4-a716-446655440008",
    "target_type": "post",
    "target_id": "660e8400-e29b-41d4-a716-446655440001",
    "resolved_by": "admin",
    "resolved_at": "2024-01-16T15:00:00Z",
    "admin_notes": "Sau khi xem xét, nội dung không vi phạm"
  },
  "priority": 2,
  "from_system": true
}
```

---

### 2.6. Từ Chối Khiếu Nại

```json
{
  "type": "appeal_rejected",
  "title": "❌ Khiếu nại của bạn đã bị từ chối",
  "content": {
    "message": "Khiếu nại về {target_type} đã được xem xét nhưng không được chấp nhận. Lý do: {reason}"
  },
  "redirect_type": "community_rules",
  "data": {
    "appeal_id": "dd0e8400-e29b-41d4-a716-446655440009",
    "violation_id": "cc0e8400-e29b-41d4-a716-446655440008",
    "target_type": "post",
    "target_id": "660e8400-e29b-41d4-a716-446655440001",
    "reason": "Nội dung vẫn vi phạm quy định cộng đồng",
    "resolved_by": "admin",
    "resolved_at": "2024-01-16T15:00:00Z",
    "admin_notes": "Vi phạm rõ ràng"
  },
  "priority": 2,
  "from_system": true
}
```

---



## 3️⃣ THÔNG BÁO THÀNH TÍCH

### 3.1. Đạt Thành Tích Mới

```json
{
  "type": "achievement",
  "title": "🏆 Chúc mừng! Bạn đã đạt thành tích mới",
  "content": {
    "message": "Bạn đã đạt thành tích \"{achievement_name}\" và nhận được {points} điểm!"
  },
  "redirect_type": "achievement",
  "data": {
    "achievement_id": "ee0e8400-e29b-41d4-a716-446655440010",
    "achievement_name": "Người Mới Bắt Đầu",
    "achievement_description": "Tạo 5 bài viết đầu tiên",
    "achievement_icon": "🌟",
    "points": "50",
    "achieved_at": "2024-01-16T10:00:00Z",
    "progress_current": "5",
    "progress_required": "5"
  },
  "priority": 2,
  "from_system": true
}
```

---

### 3.2. Lên Cấp Độ

```json
{
  "type": "level_up",
  "title": "🎉 Chúc mừng! Bạn đã lên cấp {new_level}",
  "content": {
    "message": "Bạn đã đạt cấp độ {new_level} với {total_points} điểm cộng đồng!"
  },
  "redirect_type": "profile",
  "data": {
    "user_id": "{user_id}",
    "old_level": "5",
    "new_level": "6",
    "total_points": "1250",
    "next_level_points": "1500",
    "level_name": "Học Viên Xuất Sắc",
    "unlocked_features": "Tạo poll, Đăng video"
  },
  "priority": 2,
  "from_system": true
}
```

---

## 4️⃣ THÔNG BÁO THANH TOÁN

### 4.1. Thanh Toán Thành Công

```json
{
  "type": "payment_success",
  "title": "✅ Thanh toán thành công!",
  "content": {
    "message": "Bạn đã đăng ký gói {package_name} thành công. Gói sẽ có hiệu lực đến {expires_at}."
  },
  "redirect_type": "subscription",
  "data": {
    "subscription_id": "ff0e8400-e29b-41d4-a716-446655440011",
    "package_id": "gg0e8400-e29b-41d4-a716-446655440012",
    "package_name": "Gói Premium 6 Tháng",
    "amount": "599000",
    "currency": "VND",
    "payment_method": "momo",
    "transaction_id": "TXN123456789",
    "activated_at": "2024-01-16T10:00:00Z",
    "expires_at": "2024-07-16T10:00:00Z"
  },
  "priority": 2,
  "from_system": true
}
```

---

### 4.2. Chấp Nhận Hoàn Tiền

```json
{
  "type": "refund_approved",
  "title": "✅ Yêu cầu hoàn tiền đã được chấp nhận",
  "content": {
    "message": "Yêu cầu hoàn tiền cho gói {package_name} đã được chấp nhận. Tiền sẽ được hoàn về trong 3-5 ngày."
  },
  "redirect_type": "refund_detail",
  "data": {
    "refund_id": "hh0e8400-e29b-41d4-a716-446655440013",
    "subscription_id": "ff0e8400-e29b-41d4-a716-446655440011",
    "package_name": "Gói Premium 6 Tháng",
    "refund_amount": "599000",
    "currency": "VND",
    "refund_method": "momo",
    "approved_by": "admin",
    "approved_at": "2024-01-16T15:00:00Z",
    "estimated_date": "2024-01-21T00:00:00Z"
  },
  "priority": 2,
  "from_system": true
}
```

---

### 4.3. Từ Chối Hoàn Tiền

```json
{
  "type": "refund_rejected",
  "title": "❌ Yêu cầu hoàn tiền đã bị từ chối",
  "content": {
    "message": "Yêu cầu hoàn tiền cho gói {package_name} không được chấp nhận. Lý do: {reason}"
  },
  "redirect_type": "refund_detail",
  "data": {
    "refund_id": "hh0e8400-e29b-41d4-a716-446655440013",
    "subscription_id": "ff0e8400-e29b-41d4-a716-446655440011",
    "package_name": "Gói Premium 6 Tháng",
    "refund_amount": "599000",
    "currency": "VND",
    "reason": "Đã sử dụng quá 50% thời gian gói",
    "rejected_by": "admin",
    "rejected_at": "2024-01-16T15:00:00Z"
  },
  "priority": 2,
  "from_system": true
}
```

---

### 4.4. Gói Sắp Hết Hạn

```json
{
  "type": "subscription_expiring",
  "title": "⏰ Gói {package_name} sắp hết hạn",
  "content": {
    "message": "Gói {package_name} của bạn sẽ hết hạn vào {expires_at}. Gia hạn ngay để tiếp tục sử dụng!"
  },
  "redirect_type": "subscription_renew",
  "data": {
    "subscription_id": "ff0e8400-e29b-41d4-a716-446655440011",
    "package_id": "gg0e8400-e29b-41d4-a716-446655440012",
    "package_name": "Gói Premium 6 Tháng",
    "expires_at": "2024-07-16T10:00:00Z",
    "days_remaining": "7",
    "can_renew": "true"
  },
  "priority": 2,
  "from_system": true
}
```

---

### 4.5. Gói Đã Hết Hạn

```json
{
  "type": "subscription_expired",
  "title": "❌ Gói {package_name} đã hết hạn",
  "content": {
    "message": "Gói {package_name} của bạn đã hết hạn. Gia hạn ngay để tiếp tục truy cập các tính năng Premium!"
  },
  "redirect_type": "subscription_renew",
  "data": {
    "subscription_id": "ff0e8400-e29b-41d4-a716-446655440011",
    "package_id": "gg0e8400-e29b-41d4-a716-446655440012",
    "package_name": "Gói Premium 6 Tháng",
    "expired_at": "2024-07-16T10:00:00Z",
    "can_renew": "true"
  },
  "priority": 3,
  "from_system": true
}
```
