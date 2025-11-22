# 📱 Tổng hợp Hệ thống Thông báo

## 🎯 Tổng quan

Hệ thống thông báo hoàn chỉnh với **17 loại thông báo** khác nhau, tất cả đều có **push notification tự động** qua Firebase Cloud Messaging (FCM).

---

## 📋 Danh sách đầy đủ các thông báo

### 1️⃣ **TƯƠNG TÁC CỘNG ĐỒNG** (3 loại)

| Icon | Loại | Trigger | File |
|------|------|---------|------|
| ❤️ | Like bài viết | Người khác like bài của bạn | `controllers/postController.js` |
| 💬 | Comment bài viết | Người khác comment bài của bạn | `controllers/commentController.js` |
| ↩️ | Reply comment | Người khác reply comment của bạn | `controllers/commentController.js` |

**Chi tiết:**
- Không gửi nếu tự like/comment/reply
- Có thông tin người thực hiện (tên, avatar)
- Có preview nội dung (100 ký tự)
- Redirect đến bài viết/comment

---

### 2️⃣ **VI PHẠM & KIỂM DUYỆT** (4 loại)

| Icon | Loại | Trigger | File |
|------|------|---------|------|
| 🤖 | AI gỡ bài viết | AI phát hiện vi phạm | `services/autoModerationService.js` |
| 🤖 | AI gỡ comment | AI phát hiện vi phạm | `services/autoModerationService.js` |
| ⚠️ | Admin gỡ bài viết | Admin gỡ do vi phạm | `controllers/postController.js` |
| ⚠️ | Admin gỡ comment | Admin gỡ do vi phạm | `controllers/commentController.js` |

**Chi tiết:**
- Có thông tin chi tiết vi phạm
- Danh sách rules bị vi phạm
- Độ nghiêm trọng (severity)
- AI: có confidence score
- Tự động tạo violation record

---

### 3️⃣ **KHÔI PHỤC** (2 loại)

| Icon | Loại | Trigger | File |
|------|------|---------|------|
| ✅ | Khôi phục bài viết | Admin khôi phục | `controllers/postController.js` |
| ✅ | Khôi phục comment | Admin khôi phục | `controllers/commentController.js` |

**Chi tiết:**
- Chỉ gửi khi admin khôi phục bài của người khác
- Tự động xóa violation liên quan
- Có lý do khôi phục từ admin
- Số lượng violations đã xóa

---

### 4️⃣ **THANH TOÁN** (3 loại)

| Icon | Loại | Trigger | File |
|------|------|---------|------|
| 💳 | Hướng dẫn thanh toán | User tạo yêu cầu thanh toán | `services/paymentService.js` |
| ✅ | Thanh toán xác nhận | Admin xác nhận thanh toán | `services/paymentService.js` |
| ❌ | Thanh toán từ chối | Admin từ chối thanh toán | `services/paymentService.js` |

**Chi tiết:**
- Hướng dẫn: có thông tin ngân hàng đầy đủ
- Xác nhận: tự động kích hoạt gói đăng ký
- Từ chối: có lý do từ admin

---

### 5️⃣ **HOÀN TIỀN** (3 loại)

| Icon | Loại | Trigger | File |
|------|------|---------|------|
| 📝 | Yêu cầu hoàn tiền | User tạo yêu cầu | `services/refundService.js` |
| ✅ | Hoàn tiền chấp nhận | Admin chấp nhận | `services/refundService.js` |
| ❌ | Hoàn tiền từ chối | Admin từ chối | `services/refundService.js` |

**Chi tiết:**
- Yêu cầu: xác nhận đã nhận, thời gian xử lý
- Chấp nhận: tự động hủy gói, thời gian hoàn tiền
- Từ chối: có lý do từ admin

---

### 6️⃣ **GÓI ĐĂNG KÝ** (2 loại)

| Icon | Loại | Trigger | File |
|------|------|---------|------|
| ⏰ | Gói sắp hết hạn | Cron job (1-3 ngày trước) | `services/userSubscriptionService.js` |
| ⏰ | Gói đã hết hạn | Cron job (khi hết hạn) | `services/userSubscriptionService.js` |

**Chi tiết:**
- Sắp hết hạn: nhắc trước 1-3 ngày
- Đã hết hạn: tự động chuyển về gói Free
- Cần setup cron job (xem `CRON_SETUP.md`)

**Cron job:**
```bash
# Chạy hàng ngày lúc 9:00 AM
0 9 * * * cd /path/to/project && node scripts/checkExpiringSubscriptions.js
```

---

### 7️⃣ **THÀNH TÍCH & HUY HIỆU** (2 loại) ⭐ MỚI

| Icon | Loại | Trigger | File |
|------|------|---------|------|
| 🏆 | Đạt thành tích mới | Khi user đạt achievement | `models/userModel.js` |
| 🎖️ | Nhận huy hiệu mới | Khi badge level tăng | `models/userModel.js` |

**Chi tiết:**
- Thành tích: có tên, mô tả, icon, điểm nhận được
- Huy hiệu: có level, tên, icon, điểm tối thiểu
- Tự động gửi khi gọi `userModel.addAchievement()` hoặc `userModel.updateUserBadge()`

---

## 🔔 Cấu trúc thông báo

### **Achievement Notification:**
```javascript
{
  type: "system",
  title: "🏆 Bạn đã đạt thành tích mới!",
  content: {
    message: "Chúc mừng! Bạn đã đạt thành tích 'Người mới'...",
    action: "achievement_unlocked",
    achievement_name: "Người mới",
    points_earned: 10
  },
  redirect_type: "achievement",
  data: {
    achievement_id: "uuid",
    achievement_name: "Người mới",
    achievement_description: "Hoàn thành đăng ký tài khoản",
    achievement_icon: "🎉",
    points_earned: 10,
    progress: 100,
    unlocked_at: "ISO timestamp"
  },
  priority: 2,
  from_system: true
}
```

### **Badge Notification:**
```javascript
{
  type: "system",
  title: "🎖️ Bạn đã nhận huy hiệu mới!",
  content: {
    message: "Chúc mừng! Bạn đã đạt huy hiệu 'Đồng'...",
    action: "badge_unlocked",
    badge_name: "Đồng",
    badge_level: 1,
    min_points: 100
  },
  redirect_type: "profile",
  data: {
    badge_id: "uuid",
    badge_level: 1,
    badge_name: "Đồng",
    badge_icon: "🥉",
    badge_description: "Đạt 100 điểm cộng đồng",
    min_points: 100,
    current_points: 150,
    unlocked_at: "ISO timestamp"
  },
  priority: 2,
  from_system: true
}
```

---

## 📊 Thống kê

| Danh mục | Số lượng | Push |
|----------|----------|------|
| Tương tác | 3 | ✅ |
| Vi phạm | 4 | ✅ |
| Khôi phục | 2 | ✅ |
| Thanh toán | 3 | ✅ |
| Hoàn tiền | 3 | ✅ |
| Gói đăng ký | 2 | ✅ |
| Thành tích & Huy hiệu | 2 | ✅ |
| **TỔNG** | **19** | **✅** |

---

## 🚀 Cách sử dụng

### **1. Gửi thông báo thủ công:**
```javascript
const notificationService = require('./services/notificationService');

await notificationService.createNotification({
  recipient_id: userId,
  audience: 'user',
  type: 'system',
  title: 'Tiêu đề',
  content: {
    message: 'Nội dung',
    action: 'action_name'
  },
  redirect_type: 'post',
  data: { /* custom data */ }
}, true); // true = auto push
```

### **2. Gửi thông báo broadcast:**
```javascript
await notificationService.createNotification({
  recipient_id: null,
  audience: 'all',
  type: 'system',
  title: 'Thông báo hệ thống',
  content: { message: 'Nội dung' }
}, true);
```

### **3. Kiểm tra thông báo chưa đọc:**
```javascript
const count = await notificationService.getUnreadNotificationCount(userId);
```

---

## 🔧 Cấu hình

### **Firebase FCM:**
File: `config/firebase.js`

Cần setup:
1. Service Account JSON file
2. Hoặc environment variables

### **Device Tokens:**
File: `models/deviceTokenModel.js`

User cần đăng ký device token để nhận push:
```javascript
POST /api/users/device-token
Body: { token: "fcm_token", device_type: "ios" }
```

---

## 📝 Testing

### **Test thủ công:**
```bash
# Test achievement
POST /api/admin/users/:userId/achievements
Body: { achievementId: "uuid", progress: 100 }

# Test badge (resync tất cả)
POST /api/admin/badge-levels/resync

# Test subscription expiry
POST /api/monetization/user-subscriptions/check-expiring
```

### **Test push notification:**
1. Đăng ký device token
2. Trigger một action (like, comment, etc.)
3. Kiểm tra notification trên device

---

## 🎯 Best Practices

1. ✅ **Luôn dùng `notificationService.createNotification()`** thay vì `notificationModel.create()`
2. ✅ **Set `autoPush = true`** để tự động gửi push
3. ✅ **Dùng `priority`**: 1 (thấp), 2 (cao), 3 (khẩn cấp)
4. ✅ **Dùng `from_system = true`** cho thông báo hệ thống
5. ✅ **Luôn có `redirect_type`** để user biết click vào đi đâu
6. ✅ **Content phải có `message`** và `action`
7. ✅ **Data chứa thông tin chi tiết** để frontend xử lý

---

## 📚 Tài liệu liên quan

- `CRON_SETUP.md` - Hướng dẫn setup cron job
- `services/notificationService.js` - Service chính
- `services/fcmService.js` - Push notification service
- `models/notificationModel.js` - Database model

---

**Cập nhật lần cuối:** 19/11/2025
**Tổng số thông báo:** 19 loại
**Push notification:** 100% ✅
