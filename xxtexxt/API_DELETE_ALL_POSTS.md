# ⚠️ API Xóa Toàn Bộ Bài Đăng Trong Hệ Thống

## 🚨 CẢNH BÁO CỰC KỲ NGUY HIỂM 🚨

API này sẽ xóa **VĨNH VIỄN TẤT CẢ** bài đăng và dữ liệu liên quan trong toàn bộ hệ thống.

**KHÔNG THỂ HOÀN TÁC!**

## Tổng quan

API này được thiết kế cho các trường hợp đặc biệt như:
- Reset hệ thống về trạng thái ban đầu
- Xóa dữ liệu test/demo
- Tuân thủ yêu cầu pháp lý (GDPR, etc.)
- Dọn dẹp database trước khi migration

## Endpoint

```
DELETE /api/community/posts/all/permanent
```

## Quyền truy cập

- **CHỈ SUPER ADMIN** (role: `super admin`)
- Yêu cầu JWT token trong header
- Yêu cầu mã xác nhận trong body

## Headers

```
Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
Content-Type: application/json
```

## Request Body

```json
{
  "confirmationCode": "DELETE_ALL_POSTS_PERMANENTLY"
}
```

### Parameters

- `confirmationCode` (string, required): Mã xác nhận để tránh xóa nhầm
  - Giá trị mặc định: `DELETE_ALL_POSTS_PERMANENTLY`
  - Có thể thay đổi trong file `.env` với key `DELETE_ALL_CONFIRMATION_CODE`

## Dữ liệu bị xóa

Khi thực hiện API này, **TẤT CẢ** dữ liệu sau sẽ bị xóa vĩnh viễn:

1. **ViolationRules** - Tất cả liên kết giữa vi phạm và quy tắc
2. **Appeals** - Tất cả khiếu nại trong toàn bộ hệ thống
3. **Violations** - Tất cả vi phạm trong toàn bộ hệ thống
4. **Reports** - Tất cả báo cáo trong toàn bộ hệ thống
5. **ModerationLogs** - Tất cả log kiểm duyệt trong toàn bộ hệ thống
6. **Comments** - Tất cả bình luận (bao gồm cả reply)
7. **PostLikes** - Tất cả lượt thích
8. **PostViews** - Tất cả lượt xem
9. **Posts** - Tất cả bài đăng

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Đã xóa vĩnh viễn TẤT CẢ bài đăng và dữ liệu liên quan thành công.",
  "data": {
    "deleted": {
      "posts": 1523,
      "comments": 8456,
      "likes": 12389,
      "views": 45678,
      "reports": 156,
      "violations": 89,
      "appeals": 23,
      "moderationLogs": 234,
      "violationRules": 178
    },
    "performed_by": "admin-user-id",
    "performed_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Responses

#### 400 Bad Request - Thiếu mã xác nhận

```json
{
  "success": false,
  "message": "Thiếu mã xác nhận. Vui lòng cung cấp confirmationCode trong body."
}
```

#### 400 Bad Request - Mã xác nhận sai

```json
{
  "success": false,
  "message": "Mã xác nhận không đúng. Thao tác bị hủy."
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "message": "Không có token, truy cập bị từ chối"
}
```

#### 403 Forbidden - Không phải Super Admin

```json
{
  "success": false,
  "message": "Chỉ Super Admin mới có quyền thực hiện thao tác này."
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Lỗi khi xóa toàn bộ bài đăng",
  "error": "Chi tiết lỗi..."
}
```

## Ví dụ sử dụng

### cURL

```bash
curl -X DELETE \
  'http://localhost:5000/api/community/posts/all/permanent' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
    "confirmationCode": "DELETE_ALL_POSTS_PERMANENTLY"
  }'
```

### JavaScript (Fetch API)

```javascript
const deleteAllPosts = async () => {
  // Hiển thị cảnh báo cho admin
  const confirmed = confirm(
    '⚠️ CẢNH BÁO: Bạn sắp xóa VĨNH VIỄN TẤT CẢ bài đăng!\n\n' +
    'Thao tác này KHÔNG THỂ HOÀN TÁC!\n\n' +
    'Bạn có chắc chắn muốn tiếp tục?'
  );

  if (!confirmed) {
    console.log('Đã hủy thao tác');
    return;
  }

  // Yêu cầu xác nhận lần 2
  const doubleConfirm = confirm(
    '⚠️ XÁC NHẬN LẦN 2:\n\n' +
    'Tất cả bài đăng, comment, likes, views sẽ bị xóa vĩnh viễn!\n\n' +
    'Bạn THỰC SỰ muốn tiếp tục?'
  );

  if (!doubleConfirm) {
    console.log('Đã hủy thao tác');
    return;
  }

  try {
    const response = await fetch(
      'http://localhost:5000/api/community/posts/all/permanent',
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmationCode: 'DELETE_ALL_POSTS_PERMANENTLY'
        })
      }
    );

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Xóa thành công:', data.data.deleted);
      alert(`Đã xóa:\n` +
        `- ${data.data.deleted.posts} bài đăng\n` +
        `- ${data.data.deleted.comments} bình luận\n` +
        `- ${data.data.deleted.likes} lượt thích\n` +
        `- ${data.data.deleted.views} lượt xem\n` +
        `- ${data.data.deleted.reports} báo cáo\n` +
        `- ${data.data.deleted.violations} vi phạm\n` +
        `- ${data.data.deleted.appeals} khiếu nại\n` +
        `- ${data.data.deleted.moderationLogs} log kiểm duyệt\n` +
        `- ${data.data.deleted.violationRules} liên kết vi phạm-quy tắc`
      );
      return data.data;
    } else {
      console.error('❌ Lỗi:', data.message);
      alert('Lỗi: ' + data.message);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('❌ Lỗi khi xóa:', error);
    alert('Lỗi: ' + error.message);
    throw error;
  }
};

// Sử dụng
deleteAllPosts()
  .then(result => console.log('Hoàn tất:', result))
  .catch(error => console.error('Thất bại:', error));
```

### Axios

```javascript
import axios from 'axios';

const deleteAllPosts = async () => {
  try {
    const response = await axios.delete(
      'http://localhost:5000/api/community/posts/all/permanent',
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        data: {
          confirmationCode: 'DELETE_ALL_POSTS_PERMANENTLY'
        }
      }
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};
```

## Flow xử lý

```
1. Super Admin gửi request DELETE với confirmationCode
   ↓
2. Middleware xác thực token
   ↓
3. Middleware kiểm tra role = 'super admin'
   ↓
4. Controller kiểm tra confirmationCode
   ↓
5. Service ghi log hành động vào ModerationLogs
   ↓
6. Model thực hiện transaction xóa TẤT CẢ dữ liệu:
   - BEGIN TRANSACTION
   - Đếm số lượng trước khi xóa
   - Xóa TẤT CẢ ViolationRules
   - Xóa TẤT CẢ Appeals (khiếu nại)
   - Xóa TẤT CẢ Violations (vi phạm)
   - Xóa TẤT CẢ Reports (báo cáo)
   - Xóa TẤT CẢ ModerationLogs (log kiểm duyệt)
   - Xóa TẤT CẢ Comments
   - Xóa TẤT CẢ PostLikes
   - Xóa TẤT CẢ PostViews
   - Xóa TẤT CẢ Posts
   - COMMIT TRANSACTION
   ↓
7. Trả về response với thống kê số lượng đã xóa
```

## Cấu hình

### File .env

Thêm biến môi trường để cấu hình mã xác nhận:

```env
# Danger Zone - Confirmation Code for Delete All Operations
DELETE_ALL_CONFIRMATION_CODE=DELETE_ALL_POSTS_PERMANENTLY
```

Bạn có thể thay đổi mã xác nhận này để tăng tính bảo mật.

### Tạo Super Admin

Để sử dụng API này, bạn cần có tài khoản Super Admin:

```sql
-- Cập nhật role của user thành super admin
UPDATE "Users" 
SET role = 'super admin' 
WHERE email = 'your-admin@example.com';
```

## Lưu ý quan trọng

### 1. Bảo mật tối đa

- ✅ Chỉ Super Admin mới có quyền
- ✅ Yêu cầu mã xác nhận
- ✅ Ghi log đầy đủ trước khi xóa
- ✅ Sử dụng transaction để đảm bảo tính toàn vẹn

### 2. Backup trước khi xóa

**BẮT BUỘC**: Luôn backup database trước khi sử dụng API này!

```bash
# PostgreSQL backup
pg_dump -U username -d database_name > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore nếu cần
psql -U username -d database_name < backup_20240115_103000.sql
```

### 3. Kiểm tra kỹ trước khi thực hiện

```javascript
// Kiểm tra số lượng trước khi xóa
const checkStats = async () => {
  const posts = await db.query('SELECT COUNT(*) FROM "Posts"');
  const comments = await db.query('SELECT COUNT(*) FROM "Comments"');
  
  console.log('Sẽ xóa:');
  console.log('- Posts:', posts.rows[0].count);
  console.log('- Comments:', comments.rows[0].count);
  
  return confirm('Xác nhận xóa?');
};
```

### 4. Thông báo người dùng

Nên thông báo trước cho tất cả người dùng về việc xóa dữ liệu:

```javascript
// Gửi notification cho tất cả users
await notificationModel.createBulk({
  audience: 'all',
  type: 'system',
  title: 'Thông báo bảo trì hệ thống',
  content: 'Hệ thống sẽ xóa toàn bộ dữ liệu vào ngày X...'
});
```

### 5. Sử dụng trong môi trường phù hợp

✅ **Nên sử dụng:**
- Môi trường development/test
- Reset dữ liệu demo
- Sau khi backup đầy đủ
- Khi có yêu cầu pháp lý

❌ **KHÔNG nên sử dụng:**
- Môi trường production (trừ khi thực sự cần thiết)
- Khi chưa backup
- Khi không chắc chắn 100%
- Khi có người dùng đang hoạt động

## Best Practices

### 1. Quy trình xóa an toàn

```javascript
// Bước 1: Thông báo trước
await notifyAllUsers('Hệ thống sẽ bảo trì...');

// Bước 2: Backup database
await backupDatabase();

// Bước 3: Tắt hệ thống (maintenance mode)
await setMaintenanceMode(true);

// Bước 4: Xóa dữ liệu
await deleteAllPosts();

// Bước 5: Verify
await verifyDeletion();

// Bước 6: Bật lại hệ thống
await setMaintenanceMode(false);

// Bước 7: Thông báo hoàn tất
await notifyAllUsers('Hệ thống đã hoạt động trở lại');
```

### 2. Logging chi tiết

```javascript
// Log trước khi xóa
console.log('[DELETE_ALL] Starting deletion process');
console.log('[DELETE_ALL] Performed by:', adminId);
console.log('[DELETE_ALL] Timestamp:', new Date());

// Log sau khi xóa
console.log('[DELETE_ALL] Deletion completed');
console.log('[DELETE_ALL] Stats:', stats);
```

### 3. Monitoring

```javascript
// Theo dõi thời gian thực hiện
const startTime = Date.now();
await deleteAllPosts();
const duration = Date.now() - startTime;

console.log(`Deletion took ${duration}ms`);
```

## Testing

### Test trong môi trường Development

```bash
# 1. Tạo dữ liệu test
npm run seed:posts

# 2. Kiểm tra số lượng
psql -d database_name -c "SELECT COUNT(*) FROM \"Posts\""

# 3. Thực hiện xóa
curl -X DELETE http://localhost:5000/api/community/posts/all/permanent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmationCode": "DELETE_ALL_POSTS_PERMANENTLY"}'

# 4. Verify
psql -d database_name -c "SELECT COUNT(*) FROM \"Posts\""
```

## Troubleshooting

### Lỗi: "Chỉ Super Admin mới có quyền"
- Kiểm tra role của user trong database
- Đảm bảo token hợp lệ và chứa role = 'super admin'

### Lỗi: "Mã xác nhận không đúng"
- Kiểm tra giá trị `DELETE_ALL_CONFIRMATION_CODE` trong `.env`
- Đảm bảo gửi đúng mã trong request body

### Lỗi Transaction
- Kiểm tra kết nối database
- Kiểm tra foreign key constraints
- Xem log chi tiết trong console

### Performance Issues
- Nếu có quá nhiều dữ liệu (>1 triệu records), cân nhắc xóa theo batch
- Tăng timeout cho database connection
- Theo dõi memory usage

## Related APIs

- `DELETE /api/community/posts/:postId/permanent` - Xóa 1 bài đăng cụ thể
- `DELETE /api/community/posts/:postId` - Soft delete 1 bài đăng
- `PUT /api/community/posts/:postId/restore` - Khôi phục bài viết

## Changelog

### Version 1.0.0
- Initial release
- Xóa toàn bộ posts và dữ liệu liên quan
- Yêu cầu Super Admin role
- Yêu cầu confirmation code
- Transaction support
- Logging support
