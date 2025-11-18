# 📬 Thiết Kế Chi Tiết Thông Báo - Tất Cả Trường Hợp

## 📋 Mục Lục

1. [Thông Báo Cộng Đồng](#1-thông-báo-cộng-đồng)
2. [Thông Báo Kiểm Duyệt](#2-thông-báo-kiểm-duyệt)
3. [Thông Báo Thành Tích](#3-thông-báo-thành-tích)
4. [Thông Báo Thanh Toán](#4-thông-báo-thanh-toán)
5. [Thông Báo Hệ Thống](#5-thông-báo-hệ-thống)
6. [Thông Báo Học Tập](#6-thông-báo-học-tập)

---

## 1️⃣ THÔNG BÁO CỘNG ĐỒNG

### 1.1. Like Bài Viết

**Khi nào:** Khi có người like bài viết của bạn (không phải tự like)

**Thiết kế:**
```json
{
  "type": "community",
  "title": "❤️ {username} đã thích bài viết của bạn",
  "content": {
    "message": "{username} đã thích bài viết \"{post_title}\""
  },
  "redirect_type": "post",
  "redirect_data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001"
  },
  "related_type": "post",
  "related_id": "660e8400-e29b-41d4-a716-446655440001",
  "data": {
    "liker_id": "770e8400-e29b-41d4-a716-446655440002",
    "liker_name": "John Doe",
    "liker_avatar": "https://...",
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
    "post_title": "Cách học tiếng Trung hiệu quả"
  },
  "priority": 1
}
```

**Biến thể:**
- Nhiều người like: "❤️ {username} và {count} người khác đã thích bài viết của bạn"

---

### 1.2. Comment Bài Viết

**Khi nào:** Khi có người comment bài viết của bạn (không phải tự comment)

**Thiết kế:**
```json
{
  "type": "community",
  "title": "💬 {username} đã bình luận bài viết của bạn",
  "content": {
    "message": "{username} đã bình luận: \"{comment_preview}...\""
  },
  "redirect_type": "post_comment",
  "redirect_data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
    "comment_id": "880e8400-e29b-41d4-a716-446655440003"
  },
  "related_type": "comment",
  "related_id": "880e8400-e29b-41d4-a716-446655440003",
  "data": {
    "commenter_id": "990e8400-e29b-41d4-a716-446655440004",
    "commenter_name": "Jane Smith",
    "commenter_avatar": "https://...",
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
    "comment_id": "880e8400-e29b-41d4-a716-446655440003",
    "comment_preview": "Bài viết rất hay, cảm ơn bạn!"
  },
  "priority": 1
}
```

---

### 1.3. Reply Comment (Phản Hồi Bình Luận)

**Khi nào:** Khi có người reply comment của bạn (không phải tự reply)

**Thiết kế:**
```json
{
  "type": "community",
  "title": "↩️ {username} đã phản hồi bình luận của bạn",
  "content": {
    "message": "{username} đã phản hồi: \"{reply_preview}...\""
  },
  "redirect_type": "post_comment",
  "redirect_data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
    "comment_id": "990e8400-e29b-41d4-a716-446655440005"
  },
  "related_type": "comment",
  "related_id": "990e8400-e29b-41d4-a716-446655440005",
  "data": {
    "replier_id": "aa0e8400-e29b-41d4-a716-446655440006",
    "replier_name": "Alex Nguyen",
    "replier_avatar": "https://...",
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
    "parent_comment_id": "880e8400-e29b-41d4-a716-446655440003",
    "reply_comment_id": "990e8400-e29b-41d4-a716-446655440005",
    "reply_preview": "Tôi cũng nghĩ vậy!"
  },
  "priority": 1
}
```

---

## 2️⃣ THÔNG BÁO KIỂM DUYỆT

### 2.1. Cấm Bình Luận Tạm Thời

**Khi nào:** Admin xử lý báo cáo vi phạm với biện pháp cấm bình luận

**Thiết kế:**
```json
{
  "type": "comment_ban",
  "title": "⚠️ Bạn đã bị cấm bình luận tạm thời",
  "content": {
    "message": "Bạn bị cấm bình luận trong {ban_days} ngày do vi phạm: {reason}"
  },
  "redirect_type": "community_rules",
  "redirect_data": {},
  "related_type": "user",
  "related_id": "{user_id}",
  "data": {
    "ban_days": "7",
    "reason": "Ngôn từ không phù hợp",
    "report_id": "bb0e8400-e29b-41d4-a716-446655440007",
    "violation_id": "cc0e8400-e29b-41d4-a716-446655440008",
    "expires_at": "2024-01-23T10:00:00Z"
  },
  "expires_at": "2024-01-23T10:00:00Z",
  "priority": 3,
  "from_system": true
}
```

**Biến thể:**
- Cấm vĩnh viễn: "🚫 Tài khoản bị cấm bình luận vĩnh viễn" (expires_at = null)

---

### 2.2. Gỡ Nội Dung Vi Phạm

**Khi nào:** Admin gỡ bài viết/comment vi phạm

**Thiết kế - Gỡ Bài Viết:**
```json
{
  "type": "moderation",
  "title": "🗑️ Bài viết của bạn đã bị gỡ",
  "content": {
    "message": "Bài viết \"{post_title}\" đã bị gỡ do vi phạm: {reason}"
  },
  "redirect_type": "community_rules",
  "redirect_data": {},
  "related_type": "post",
  "related_id": "660e8400-e29b-41d4-a716-446655440001",
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

**Thiết kế - Gỡ Bình Luận:**
```json
{
  "type": "moderation",
  "title": "🗑️ Bình luận của bạn đã bị gỡ",
  "content": {
    "message": "Bình luận \"{comment_preview}...\" đã bị gỡ do vi phạm: {reason}"
  },
  "redirect_type": "community_rules",
  "redirect_data": {},
  "related_type": "comment",
  "related_id": "880e8400-e29b-41d4-a716-446655440003",
  "data": {
    "target_type": "comment",
    "target_id": "880e8400-e29b-41d4-a716-446655440003",
    "comment_preview": "Nội dung bình luận",
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
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

### 2.3. Cảnh Báo Vi Phạm (Không Gỡ)

**Khi nào:** Admin cảnh báo user nhưng chưa gỡ nội dung

**Thiết kế:**
```json
{
  "type": "warning",
  "title": "⚠️ Cảnh báo vi phạm quy định cộng đồng",
  "content": {
    "message": "Nội dung của bạn vi phạm quy định: {reason}. Đây là lần cảnh báo thứ {warning_count}."
  },
  "redirect_type": "community_rules",
  "redirect_data": {},
  "related_type": "{target_type}",
  "related_id": "{target_id}",
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

### 2.4. Chấp Nhận Khiếu Nại

**Khi nào:** Admin chấp nhận khiếu nại của user

**Thiết kế:**
```json
{
  "type": "appeal_accepted",
  "title": "✅ Khiếu nại của bạn đã được chấp nhận",
  "content": {
    "message": "Khiếu nại về {target_type} đã được xem xét và chấp nhận. Nội dung đã được khôi phục."
  },
  "redirect_type": "post",
  "redirect_data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001"
  },
  "related_type": "{target_type}",
  "related_id": "{target_id}",
  "data": {
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

### 2.5. Từ Chối Khiếu Nại

**Khi nào:** Admin từ chối khiếu nại của user

**Thiết kế:**
```json
{
  "type": "appeal_rejected",
  "title": "❌ Khiếu nại của bạn đã bị từ chối",
  "content": {
    "message": "Khiếu nại về {target_type} đã được xem xét nhưng không được chấp nhận. Lý do: {reason}"
  },
  "redirect_type": "community_rules",
  "redirect_data": {},
  "related_type": "{target_type}",
  "related_id": "{target_id}",
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

**Khi nào:** User đạt được thành tích (achievement)

**Thiết kế:**
```json
{
  "type": "achievement",
  "title": "🏆 Chúc mừng! Bạn đã đạt thành tích mới",
  "content": {
    "message": "Bạn đã đạt thành tích \"{achievement_name}\" và nhận được {points} điểm!"
  },
  "redirect_type": "achievement",
  "redirect_data": {
    "achievement_id": "ee0e8400-e29b-41d4-a716-446655440010"
  },
  "related_type": "achievement",
  "related_id": "ee0e8400-e29b-41d4-a716-446655440010",
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

**Các loại thành tích:**
- Bài viết: "📝 Tác Giả Năng Suất" (10/50/100 bài)
- Like nhận được: "❤️ Người Được Yêu Thích" (50/200/500 likes)
- Comment: "💬 Người Tích Cực" (20/100/300 comments)
- Streak: "🔥 Người Kiên Trì" (7/30/100 ngày)
- Điểm cộng đồng: "⭐ Thành Viên Xuất Sắc" (100/500/1000 điểm)

---

### 3.2. Lên Cấp Độ

**Khi nào:** User lên cấp độ mới (level up)

**Thiết kế:**
```json
{
  "type": "level_up",
  "title": "🎉 Chúc mừng! Bạn đã lên cấp {new_level}",
  "content": {
    "message": "Bạn đã đạt cấp độ {new_level} với {total_points} điểm cộng đồng!"
  },
  "redirect_type": "profile",
  "redirect_data": {
    "user_id": "{user_id}"
  },
  "related_type": "user",
  "related_id": "{user_id}",
  "data": {
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

**Khi nào:** User thanh toán và đăng ký gói thành công

**Thiết kế:**
```json
{
  "type": "payment_success",
  "title": "✅ Thanh toán thành công!",
  "content": {
    "message": "Bạn đã đăng ký gói {package_name} thành công. Gói sẽ có hiệu lực đến {expires_at}."
  },
  "redirect_type": "subscription",
  "redirect_data": {
    "subscription_id": "ff0e8400-e29b-41d4-a716-446655440011"
  },
  "related_type": "subscription",
  "related_id": "ff0e8400-e29b-41d4-a716-446655440011",
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

**Khi nào:** Admin chấp nhận yêu cầu hoàn tiền

**Thiết kế:**
```json
{
  "type": "refund_approved",
  "title": "✅ Yêu cầu hoàn tiền đã được chấp nhận",
  "content": {
    "message": "Yêu cầu hoàn tiền cho gói {package_name} đã được chấp nhận. Tiền sẽ được hoàn về tài khoản trong 3-5 ngày làm việc."
  },
  "redirect_type": "refund_detail",
  "redirect_data": {
    "refund_id": "hh0e8400-e29b-41d4-a716-446655440013"
  },
  "related_type": "refund",
  "related_id": "hh0e8400-e29b-41d4-a716-446655440013",
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

**Khi nào:** Admin từ chối yêu cầu hoàn tiền

**Thiết kế:**
```json
{
  "type": "refund_rejected",
  "title": "❌ Yêu cầu hoàn tiền đã bị từ chối",
  "content": {
    "message": "Yêu cầu hoàn tiền cho gói {package_name} không được chấp nhận. Lý do: {reason}"
  },
  "redirect_type": "refund_detail",
  "redirect_data": {
    "refund_id": "hh0e8400-e29b-41d4-a716-446655440013"
  },
  "related_type": "refund",
  "related_id": "hh0e8400-e29b-41d4-a716-446655440013",
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

**Khi nào:** Gói của user sắp hết hạn (7 ngày, 3 ngày, 1 ngày)

**Thiết kế:**
```json
{
  "type": "subscription_expiring",
  "title": "⏰ Gói {package_name} sắp hết hạn",
  "content": {
    "message": "Gói {package_name} của bạn sẽ hết hạn vào {expires_at}. Gia hạn ngay để tiếp tục sử dụng!"
  },
  "redirect_type": "subscription_renew",
  "redirect_data": {
    "subscription_id": "ff0e8400-e29b-41d4-a716-446655440011"
  },
  "related_type": "subscription",
  "related_id": "ff0e8400-e29b-41d4-a716-446655440011",
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

**Biến thể:**
- 7 ngày: "⏰ Gói sắp hết hạn trong 7 ngày"
- 3 ngày: "⚠️ Gói sắp hết hạn trong 3 ngày"
- 1 ngày: "🚨 Gói sẽ hết hạn vào ngày mai"

---

### 4.5. Gói Đã Hết Hạn

**Khi nào:** Gói của user đã hết hạn

**Thiết kế:**
```json
{
  "type": "subscription_expired",
  "title": "❌ Gói {package_name} đã hết hạn",
  "content": {
    "message": "Gói {package_name} của bạn đã hết hạn. Gia hạn ngay để tiếp tục truy cập các tính năng Premium!"
  },
  "redirect_type": "subscription_renew",
  "redirect_data": {
    "subscription_id": "ff0e8400-e29b-41d4-a716-446655440011"
  },
  "related_type": "subscription",
  "related_id": "ff0e8400-e29b-41d4-a716-446655440011",
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

---

## 5️⃣ THÔNG BÁO HỆ THỐNG

### 5.1. Chào Mừng User Mới

**Khi nào:** User mới đăng ký tài khoản

**Thiết kế:**
```json
{
  "type": "system",
  "title": "🎉 Chào mừng bạn đến với Hán Tự!",
  "content": {
    "message": "Cảm ơn bạn đã đăng ký. Hãy bắt đầu hành trình học tiếng Trung ngay hôm nay!"
  },
  "redirect_type": "onboarding",
  "redirect_data": {},
  "data": {
    "welcome_bonus": "100",
    "free_trial_days": "7"
  },
  "priority": 2,
  "from_system": true
}
```

---

### 5.2. Bảo Trì Hệ Thống

**Khi nào:** Hệ thống sắp bảo trì

**Thiết kế:**
```json
{
  "type": "system",
  "title": "⚠️ Thông báo bảo trì hệ thống",
  "content": {
    "message": "Hệ thống sẽ bảo trì vào {scheduled_time}. Thời gian dự kiến: {duration} phút."
  },
  "redirect_type": "maintenance",
  "redirect_data": {
    "scheduled_at": "2024-01-20T02:00:00Z",
    "duration_minutes": "30"
  },
  "data": {
    "scheduled_at": "2024-01-20T02:00:00Z",
    "scheduled_time": "2h sáng ngày 20/01/2024",
    "duration_minutes": "30",
    "affected_services": "Tất cả dịch vụ"
  },
  "expires_at": "2024-01-20T03:00:00Z",
  "priority": 3,
  "from_system": true
}
```

---

### 5.3. Cập Nhật Tính Năng Mới

**Khi nào:** Có tính năng mới được ra mắt

**Thiết kế:**
```json
{
  "type": "system",
  "title": "🎉 Tính năng mới: {feature_name}",
  "content": {
    "message": "{feature_description}. Hãy khám phá ngay!"
  },
  "redirect_type": "feature_intro",
  "redirect_data": {
    "feature_id": "hsk3-vocab"
  },
  "data": {
    "feature_id": "hsk3-vocab",
    "feature_name": "Từ vựng HSK 3.0",
    "feature_description": "Chúng tôi vừa cập nhật bộ từ vựng HSK 3.0 mới nhất",
    "version": "2.5.0"
  },
  "priority": 2,
  "from_system": true
}
```

---

### 5.4. Thông Báo Quan Trọng

**Khi nào:** Admin gửi thông báo quan trọng

**Thiết kế:**
```json
{
  "type": "system",
  "title": "📢 Thông báo quan trọng",
  "content": {
    "message": "{custom_message}"
  },
  "redirect_type": "announcement",
  "redirect_data": {
    "announcement_id": "ii0e8400-e29b-41d4-a716-446655440014"
  },
  "data": {
    "announcement_id": "ii0e8400-e29b-41d4-a716-446655440014",
    "category": "important"
  },
  "priority": 3,
  "from_system": true
}
```

---

## 6️⃣ THÔNG BÁO HỌC TẬP

### 6.1. Nhắc Nhở Học Bài

**Khi nào:** User chưa học bài trong ngày

**Thiết kế:**
```json
{
  "type": "learning_reminder",
  "title": "📚 Đã đến giờ học rồi!",
  "content": {
    "message": "Bạn chưa học bài hôm nay. Hãy dành 10 phút để ôn tập nhé!"
  },
  "redirect_type": "lesson_today",
  "redirect_data": {},
  "data": {
    "streak_days": "5",
    "last_study": "2024-01-15T10:00:00Z"
  },
  "priority": 1,
  "from_system": true
}
```

---

### 6.2. Kết Quả Thi

**Khi nào:** User hoàn thành bài thi

**Thiết kế - Đỗ:**
```json
{
  "type": "exam_result",
  "title": "🎉 Chúc mừng! Bạn đã đỗ kỳ thi {exam_name}",
  "content": {
    "message": "Bạn đã đạt {score}/{total} điểm trong kỳ thi {exam_name}. Xuất sắc!"
  },
  "redirect_type": "exam_result",
  "redirect_data": {
    "exam_id": "jj0e8400-e29b-41d4-a716-446655440015",
    "attempt_id": "kk0e8400-e29b-41d4-a716-446655440016"
  },
  "related_type": "exam",
  "related_id": "jj0e8400-e29b-41d4-a716-446655440015",
  "data": {
    "exam_id": "jj0e8400-e29b-41d4-a716-446655440015",
    "exam_name": "HSK 3 - Đề thi thử",
    "attempt_id": "kk0e8400-e29b-41d4-a716-446655440016",
    "score": "85",
    "total": "100",
    "passing_score": "60",
    "passed": "true",
    "rank": "Xuất sắc",
    "completed_at": "2024-01-16T14:30:00Z"
  },
  "priority": 2,
  "from_system": true
}
```

**Thiết kế - Trượt:**
```json
{
  "type": "exam_result",
  "title": "📊 Kết quả thi {exam_name}",
  "content": {
    "message": "Bạn đạt {score}/{total} điểm. Chưa đạt yêu cầu. Hãy cố gắng lần sau nhé!"
  },
  "redirect_type": "exam_result",
  "redirect_data": {
    "exam_id": "jj0e8400-e29b-41d4-a716-446655440015",
    "attempt_id": "kk0e8400-e29b-41d4-a716-446655440016"
  },
  "related_type": "exam",
  "related_id": "jj0e8400-e29b-41d4-a716-446655440015",
  "data": {
    "exam_id": "jj0e8400-e29b-41d4-a716-446655440015",
    "exam_name": "HSK 3 - Đề thi thử",
    "attempt_id": "kk0e8400-e29b-41d4-a716-446655440016",
    "score": "45",
    "total": "100",
    "passing_score": "60",
    "passed": "false",
    "can_retake": "true",
    "completed_at": "2024-01-16T14:30:00Z"
  },
  "priority": 2,
  "from_system": true
}
```

---

### 6.3. Hoàn Thành Khóa Học

**Khi nào:** User hoàn thành một khóa học

**Thiết kế:**
```json
{
  "type": "course_completed",
  "title": "🎓 Chúc mừng! Bạn đã hoàn thành khóa học",
  "content": {
    "message": "Bạn đã hoàn thành khóa học \"{course_name}\". Hãy nhận chứng chỉ của bạn!"
  },
  "redirect_type": "course_certificate",
  "redirect_data": {
    "course_id": "ll0e8400-e29b-41d4-a716-446655440017",
    "certificate_id": "mm0e8400-e29b-41d4-a716-446655440018"
  },
  "related_type": "course",
  "related_id": "ll0e8400-e29b-41d4-a716-446655440017",
  "data": {
    "course_id": "ll0e8400-e29b-41d4-a716-446655440017",
    "course_name": "HSK 3 - Toàn Diện",
    "certificate_id": "mm0e8400-e29b-41d4-a716-446655440018",
    "completion_rate": "100",
    "total_lessons": "50",
    "completed_at": "2024-01-16T16:00:00Z"
  },
  "priority": 2,
  "from_system": true
}
```

---

### 6.4. Streak Đạt Mốc

**Khi nào:** User đạt mốc streak (7, 30, 100 ngày)

**Thiết kế:**
```json
{
  "type": "streak_milestone",
  "title": "🔥 Xuất sắc! Bạn đã học {streak_days} ngày liên tiếp",
  "content": {
    "message": "Bạn đã duy trì streak {streak_days} ngày! Tiếp tục phát huy nhé!"
  },
  "redirect_type": "streak_stats",
  "redirect_data": {},
  "data": {
    "streak_days": "30",
    "milestone": "30",
    "next_milestone": "100",
    "bonus_points": "50"
  },
  "priority": 2,
  "from_system": true
}
```

---

## 7️⃣ THÔNG BÁO KHÁC

### 7.1. Mention User

**Khi nào:** User được mention trong bài viết/comment

**Thiết kế:**
```json
{
  "type": "mention",
  "title": "📣 {username} đã nhắc đến bạn",
  "content": {
    "message": "{username} đã nhắc đến bạn trong {content_type}: \"{preview}...\""
  },
  "redirect_type": "post_comment",
  "redirect_data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
    "comment_id": "880e8400-e29b-41d4-a716-446655440003"
  },
  "related_type": "{content_type}",
  "related_id": "{content_id}",
  "data": {
    "mentioner_id": "nn0e8400-e29b-41d4-a716-446655440019",
    "mentioner_name": "John Doe",
    "content_type": "comment",
    "content_id": "880e8400-e29b-41d4-a716-446655440003",
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
    "preview": "Tôi đồng ý với @username về vấn đề này"
  },
  "priority": 1
}
```

---

### 7.2. Follow User

**Khi nào:** Có người follow user

**Thiết kế:**
```json
{
  "type": "follow",
  "title": "👤 {username} đã theo dõi bạn",
  "content": {
    "message": "{username} đã bắt đầu theo dõi bạn"
  },
  "redirect_type": "profile",
  "redirect_data": {
    "user_id": "oo0e8400-e29b-41d4-a716-446655440020"
  },
  "related_type": "user",
  "related_id": "oo0e8400-e29b-41d4-a716-446655440020",
  "data": {
    "follower_id": "oo0e8400-e29b-41d4-a716-446655440020",
    "follower_name": "Jane Smith",
    "follower_avatar": "https://...",
    "follower_level": "5",
    "followed_at": "2024-01-16T10:00:00Z"
  },
  "priority": 1
}
```

---

### 7.3. Bài Viết Được Duyệt

**Khi nào:** Bài viết của user được admin duyệt

**Thiết kế:**
```json
{
  "type": "post_approved",
  "title": "✅ Bài viết của bạn đã được duyệt",
  "content": {
    "message": "Bài viết \"{post_title}\" đã được phê duyệt và xuất bản"
  },
  "redirect_type": "post",
  "redirect_data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001"
  },
  "related_type": "post",
  "related_id": "660e8400-e29b-41d4-a716-446655440001",
  "data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
    "post_title": "Cách học tiếng Trung hiệu quả",
    "approved_by": "admin",
    "approved_at": "2024-01-16T10:00:00Z"
  },
  "priority": 2,
  "from_system": true
}
```

---

### 7.4. Bài Viết Bị Từ Chối

**Khi nào:** Bài viết của user bị admin từ chối

**Thiết kế:**
```json
{
  "type": "post_rejected",
  "title": "❌ Bài viết của bạn không được duyệt",
  "content": {
    "message": "Bài viết \"{post_title}\" không được phê duyệt. Lý do: {reason}"
  },
  "redirect_type": "post_edit",
  "redirect_data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001"
  },
  "related_type": "post",
  "related_id": "660e8400-e29b-41d4-a716-446655440001",
  "data": {
    "post_id": "660e8400-e29b-41d4-a716-446655440001",
    "post_title": "Tiêu đề bài viết",
    "reason": "Nội dung không phù hợp với chủ đề",
    "rejected_by": "admin",
    "rejected_at": "2024-01-16T10:00:00Z",
    "can_edit": "true"
  },
  "priority": 2,
  "from_system": true
}
```

---

## 📊 BẢNG TỔNG HỢP REDIRECT TYPES

| Redirect Type | Use Cases | Required Data |
|---------------|-----------|---------------|
| `post` | Like, Approved, Featured | `post_id` |
| `post_comment` | Comment, Reply, Mention | `post_id`, `comment_id` |
| `post_edit` | Rejected post | `post_id` |
| `profile` | Follow, Level up | `user_id` |
| `achievement` | Achievement unlocked | `achievement_id` |
| `community_rules` | Ban, Warning, Violation | - |
| `subscription` | Payment success | `subscription_id` |
| `subscription_renew` | Expiring, Expired | `subscription_id` |
| `refund_detail` | Refund approved/rejected | `refund_id` |
| `exam_result` | Exam completed | `exam_id`, `attempt_id` |
| `course_certificate` | Course completed | `course_id`, `certificate_id` |
| `lesson_today` | Learning reminder | - |
| `streak_stats` | Streak milestone | - |
| `onboarding` | Welcome new user | - |
| `maintenance` | System maintenance | `scheduled_at`, `duration_minutes` |
| `feature_intro` | New feature | `feature_id` |
| `announcement` | Important announcement | `announcement_id` |
| `none` | Info only | - |

---

## 📋 BẢNG TỔNG HỢP NOTIFICATION TYPES

| Type | Priority | From System | Use Cases |
|------|----------|-------------|-----------|
| `community` | 1 | ❌ | Like, Comment, Reply, Follow |
| `mention` | 1 | ❌ | Mention in post/comment |
| `comment_ban` | 3 | ✅ | Ban comment |
| `moderation` | 2 | ✅ | Remove content |
| `warning` | 2 | ✅ | Warning violation |
| `appeal_accepted` | 2 | ✅ | Appeal accepted |
| `appeal_rejected` | 2 | ✅ | Appeal rejected |
| `achievement` | 2 | ✅ | Achievement unlocked |
| `level_up` | 2 | ✅ | Level up |
| `payment_success` | 2 | ✅ | Payment success |
| `refund_approved` | 2 | ✅ | Refund approved |
| `refund_rejected` | 2 | ✅ | Refund rejected |
| `subscription_expiring` | 2 | ✅ | Subscription expiring |
| `subscription_expired` | 3 | ✅ | Subscription expired |
| `post_approved` | 2 | ✅ | Post approved |
| `post_rejected` | 2 | ✅ | Post rejected |
| `exam_result` | 2 | ✅ | Exam result |
| `course_completed` | 2 | ✅ | Course completed |
| `streak_milestone` | 2 | ✅ | Streak milestone |
| `learning_reminder` | 1 | ✅ | Learning reminder |
| `system` | 1-3 | ✅ | System announcements |

---

## ✅ CHECKLIST THIẾT KẾ

### Mỗi thông báo cần có:
- [x] `type` - Loại thông báo rõ ràng
- [x] `title` - Tiêu đề ngắn gọn, có emoji
- [x] `content.message` - Nội dung chi tiết
- [x] `redirect_type` - Loại điều hướng
- [x] `redirect_data` - Dữ liệu điều hướng
- [x] `related_type` & `related_id` - Liên kết đối tượng
- [x] `data` - Dữ liệu bổ sung (tất cả string)
- [x] `priority` - Độ ưu tiên (1-3)
- [x] `from_system` - Từ hệ thống hay không

### Nguyên tắc thiết kế:
- ✅ Title ngắn gọn, có emoji phù hợp
- ✅ Message rõ ràng, dễ hiểu
- ✅ Redirect type phù hợp với use case
- ✅ Data đầy đủ để hiển thị UI
- ✅ Priority hợp lý (1=thấp, 3=cao)
- ✅ Tất cả values trong data là string

---

**File thiết kế này là cơ sở để implement code cho tất cả các loại thông báo! 🚀**
