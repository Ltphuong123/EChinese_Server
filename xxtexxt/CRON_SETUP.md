# Hướng dẫn Setup Cron Job cho Kiểm tra Gói Hết Hạn

## 📋 Tổng quan

Script `checkExpiringSubscriptions.js` sẽ:
- Kiểm tra các gói đăng ký sắp hết hạn (còn 1-3 ngày)
- Gửi thông báo nhắc nhở cho người dùng
- Tự động hủy các gói đã hết hạn và chuyển về gói Free
- Gửi thông báo khi gói hết hạn

## 🚀 Cách chạy thủ công

```bash
node scripts/checkExpiringSubscriptions.js
```

## ⏰ Setup Cron Job

### Windows (Task Scheduler)

1. Mở Task Scheduler
2. Tạo Basic Task mới
3. Đặt tên: "Check Expiring Subscriptions"
4. Trigger: Daily, chạy lúc 9:00 AM
5. Action: Start a program
   - Program: `node`
   - Arguments: `scripts/checkExpiringSubscriptions.js`
   - Start in: `C:\path\to\your\project`

### Linux/Mac (Crontab)

```bash
# Mở crontab editor
crontab -e

# Thêm dòng sau để chạy hàng ngày lúc 9:00 AM
0 9 * * * cd /path/to/your/project && node scripts/checkExpiringSubscriptions.js >> logs/cron.log 2>&1
```

### Docker (nếu dùng)

Thêm vào `docker-compose.yml`:

```yaml
services:
  cron:
    image: node:18
    volumes:
      - .:/app
    working_dir: /app
    command: sh -c "while true; do node scripts/checkExpiringSubscriptions.js; sleep 86400; done"
```

## 🔧 Hoặc dùng API Endpoint (Admin)

Admin có thể trigger thủ công qua API:

```bash
POST /api/monetization/user-subscriptions/check-expiring
Authorization: Bearer <admin_token>
```

Response:
```json
{
  "success": true,
  "message": "Kiểm tra gói hết hạn thành công.",
  "data": {
    "expired_count": 5,
    "expiring_soon_count": 12,
    "checked_at": "2025-11-19T10:00:00.000Z"
  }
}
```

## 📱 Thông báo được gửi

### 1. Gói sắp hết hạn (1-3 ngày)
- Title: "⏰ Gói đăng ký sắp hết hạn trong X ngày"
- Push notification: ✅
- Redirect: subscription page

### 2. Gói đã hết hạn
- Title: "⏰ Gói đăng ký của bạn đã hết hạn"
- Push notification: ✅
- Redirect: subscription page
- Action: Tự động chuyển về gói Free

## 🔍 Monitoring

Kiểm tra logs:
```bash
# Linux/Mac
tail -f logs/cron.log

# Windows
type logs\cron.log
```

## ⚙️ Cấu hình

Thời gian nhắc nhở có thể điều chỉnh trong file:
`services/userSubscriptionService.js`

```javascript
// Thay đổi số ngày nhắc trước
const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
```

## 🎯 Best Practices

1. **Chạy vào giờ thấp điểm**: 9:00 AM hoặc 2:00 AM
2. **Log output**: Luôn log kết quả để debug
3. **Monitor**: Kiểm tra logs định kỳ
4. **Backup**: Backup database trước khi chạy lần đầu
5. **Test**: Test trên staging trước khi deploy production
