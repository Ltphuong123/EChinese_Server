# Hướng dẫn sử dụng AdminLog

## Mục đích
Bảng `AdminLogs` được sử dụng để **ghi lại tất cả các hành động quan trọng của admin** trong hệ thống. Điều này giúp:
- Theo dõi và kiểm toán các thay đổi do admin thực hiện
- Phát hiện hành vi bất thường hoặc lạm dụng quyền
- Khôi phục thông tin khi cần thiết
- Tuân thủ các yêu cầu về bảo mật và quy định

## Cấu trúc bảng AdminLogs
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key -> Users.id) - Admin thực hiện hành động
- action_type: VARCHAR - Loại hành động (vd: create_exam, delete_user, update_subscription)
- target_id: VARCHAR - ID của đối tượng bị tác động
- description: TEXT - Mô tả chi tiết về hành động
- created_at: TIMESTAMP - Thời gian thực hiện
```

## Các action_type đã được implement

### User Management (6 actions)
- `UPDATE_USER_INFO` - Cập nhật thông tin người dùng
- `DELETE_USER` - Xóa vĩnh viễn người dùng
- `GRANT_ACHIEVEMENT` - Gán thành tích cho người dùng
- `BAN_USER` - Cấm người dùng (chưa implement)
- `UNBAN_USER` - Bỏ cấm người dùng (chưa implement)
- `CHANGE_USER_ROLE` - Thay đổi vai trò người dùng (chưa implement)

### Exam Management (9 actions)
- `CREATE_EXAM` - Tạo bài thi mới
- `UPDATE_EXAM` - Cập nhật bài thi
- `TRASH_EXAM` - Xóa mềm bài thi (chuyển vào thùng rác)
- `RESTORE_EXAM` - Khôi phục bài thi đã xóa
- `FORCE_DELETE_EXAM` - Xóa vĩnh viễn bài thi
- `PUBLISH_EXAM` - Công bố bài thi
- `UNPUBLISH_EXAM` - Hủy công bố bài thi
- `DUPLICATE_EXAM` - Sao chép bài thi
- `DELETE_EXAM` - Xóa bài thi (legacy)

### Subscription Management (3 actions)
- `CREATE_SUBSCRIPTION` - Tạo gói đăng ký mới
- `UPDATE_SUBSCRIPTION` - Cập nhật gói đăng ký
- `DELETE_SUBSCRIPTION` - Xóa vĩnh viễn gói đăng ký

### Moderation (4 actions)
- `RESOLVE_REPORT` - Xử lý báo cáo từ người dùng
- `CREATE_VIOLATION` - Tạo bản ghi vi phạm
- `APPROVE_APPEAL` - Chấp nhận khiếu nại
- `REJECT_APPEAL` - Từ chối khiếu nại

### Payment & Refund (1 action)
- `PROCESS_REFUND` - Xử lý yêu cầu hoàn tiền

### Community Management (chưa implement)
- `REMOVE_POST` - Gỡ bài viết
- `RESTORE_POST` - Khôi phục bài viết
- `REMOVE_COMMENT` - Gỡ bình luận
- `RESTORE_COMMENT` - Khôi phục bình luận
- `PIN_POST` - Ghim bài viết
- `UNPIN_POST` - Bỏ ghim bài viết

## Cách sử dụng

### Trong Controller
```javascript
const adminLogService = require('../services/adminLogService');

// Sau khi thực hiện action thành công
await adminLogService.createLog({
  action_type: 'update_user',
  target_id: userId,
  description: `Cập nhật thông tin người dùng: ${JSON.stringify(updateData)}`
}, req.user.id); // adminId từ token
```

### Ví dụ cụ thể
```javascript
// Trong userController.updateUserAdmin
await require('../services/adminLogService').createLog({
  action_type: 'update_user',
  target_id: userId,
  description: `Cập nhật thông tin người dùng: ${JSON.stringify(updateData)}`
}, adminId);

// Trong examController.publishExamAdmin
await require('../services/adminLogService').createLog({
  action_type: 'publish_exam',
  target_id: id,
  description: `Công bố bài thi`
}, adminId);
```

## Khi nào cần thêm AdminLog?

### ✅ CẦN ghi log
- Tạo, sửa, xóa dữ liệu quan trọng (user, exam, subscription, etc.)
- Thay đổi trạng thái quan trọng (publish/unpublish, approve/reject)
- Xử lý moderation (gỡ bài, tạo vi phạm, xử lý khiếu nại)
- Cấp quyền hoặc thay đổi role
- Reset quota hoặc dữ liệu người dùng
- Xử lý thanh toán và hoàn tiền

### ❌ KHÔNG cần ghi log
- Các action chỉ đọc dữ liệu (GET requests)
- Các action của user thông thường (không phải admin)
- Các thao tác tự động của hệ thống
- Các action không quan trọng hoặc tạm thời

## API để xem AdminLog

### Lấy tất cả logs
```
GET /api/admin/logs
Authorization: Bearer {admin_token}
```

Response:
```json
{
  "success": true,
  "message": "Lấy tất cả admin logs thành công.",
  "data": [
    {
      "id": "uuid",
      "user_id": "admin_uuid",
      "action_type": "update_user",
      "target_id": "user_uuid",
      "description": "Cập nhật thông tin người dùng: {...}",
      "created_at": "2024-01-01T00:00:00.000Z",
      "admin_name": "Admin Name",
      "admin_email": "admin@example.com"
    }
  ]
}
```

## Best Practices

1. **Luôn ghi log SAU khi action thành công** - Không ghi log nếu action thất bại
2. **Description nên rõ ràng và có thông tin chi tiết** - Giúp dễ dàng hiểu được hành động đã thực hiện
3. **Sử dụng action_type nhất quán** - Theo convention: `{verb}_{resource}` (vd: create_exam, delete_user)
4. **Luôn truyền adminId từ req.user.id** - Đảm bảo ghi đúng người thực hiện
5. **Không ghi thông tin nhạy cảm** - Tránh ghi password, token, hoặc dữ liệu cá nhân nhạy cảm

## Các file đã được cập nhật

- ✅ `controllers/userController.js` - User management actions
- ✅ `controllers/examController.js` - Exam management actions
- ✅ `controllers/moderationController.js` - Moderation actions
- ✅ `controllers/postController.js` - Post moderation actions
- ✅ `controllers/subscriptionController.js` - Subscription management
- ✅ `controllers/refundController.js` - Refund processing

## TODO - Các controller cần thêm logging

Các controller sau có thể cần thêm admin logging nếu có các action quan trọng:
- `controllers/notebookController.js` - Quản lý notebook hệ thống
- `controllers/vocabularyController.js` - Quản lý từ vựng
- `controllers/tipController.js` - Quản lý tips
- `controllers/mockTestController.js` - Quản lý mock tests
- `controllers/achievementController.js` - Quản lý achievements
- `controllers/badgeLevelController.js` - Quản lý badge levels
- `controllers/notificationController.js` - Gửi thông báo hệ thống
- `controllers/commentController.js` - Moderation comments
