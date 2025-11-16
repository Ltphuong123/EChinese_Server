# API Xóa Vĩnh Viễn Bài Đăng

## Tổng quan
API này cho phép admin xóa vĩnh viễn một bài đăng và **tất cả dữ liệu liên quan** khỏi hệ thống.

⚠️ **CẢNH BÁO**: Đây là thao tác **KHÔNG THỂ HOÀN TÁC**. Tất cả dữ liệu sẽ bị xóa vĩnh viễn khỏi database.

## Endpoint

```
DELETE /api/community/posts/:postId/permanent
```

## Quyền truy cập
- **Chỉ Admin** (role: `admin` hoặc `super admin`)
- Yêu cầu JWT token trong header

## Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

## Parameters

### Path Parameters
- `postId` (UUID, required): ID của bài đăng cần xóa vĩnh viễn

## Dữ liệu bị xóa

Khi thực hiện API này, các dữ liệu sau sẽ bị xóa vĩnh viễn:

1. **Comments** - Tất cả bình luận của bài đăng
2. **PostLikes** - Tất cả lượt thích của bài đăng
3. **PostViews** - Tất cả lượt xem của bài đăng
4. **Reports** - Tất cả báo cáo liên quan đến bài đăng
5. **Violations** - Tất cả vi phạm liên quan đến bài đăng
6. **ModerationLogs** - Tất cả log kiểm duyệt liên quan đến bài đăng
7. **Posts** - Bài đăng chính

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Xóa vĩnh viễn bài viết và tất cả dữ liệu liên quan thành công.",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Tiêu đề bài viết",
    "deleted_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Không có token, truy cập bị từ chối"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Bạn không có quyền truy cập tài nguyên này."
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Bài viết không tồn tại."
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Lỗi khi xóa vĩnh viễn bài viết",
  "error": "Chi tiết lỗi..."
}
```

## Ví dụ sử dụng

### cURL

```bash
curl -X DELETE \
  'http://localhost:5000/api/community/posts/123e4567-e89b-12d3-a456-426614174000/permanent' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json'
```

### JavaScript (Fetch API)

```javascript
const deletePostPermanently = async (postId) => {
  try {
    const response = await fetch(
      `http://localhost:5000/api/community/posts/${postId}/permanent`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();
    
    if (data.success) {
      console.log('Xóa thành công:', data.message);
      return data.data;
    } else {
      console.error('Lỗi:', data.message);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Lỗi khi xóa bài viết:', error);
    throw error;
  }
};

// Sử dụng
deletePostPermanently('123e4567-e89b-12d3-a456-426614174000')
  .then(result => console.log('Đã xóa:', result))
  .catch(error => console.error('Lỗi:', error));
```

### Axios

```javascript
import axios from 'axios';

const deletePostPermanently = async (postId) => {
  try {
    const response = await axios.delete(
      `http://localhost:5000/api/community/posts/${postId}/permanent`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
1. Admin gửi request DELETE với postId
   ↓
2. Middleware xác thực token và kiểm tra quyền admin
   ↓
3. Controller nhận request và gọi service
   ↓
4. Service kiểm tra bài viết có tồn tại không
   ↓
5. Service ghi log hành động vào ModerationLogs
   ↓
6. Model thực hiện transaction xóa dữ liệu:
   - BEGIN TRANSACTION
   - Xóa Comments
   - Xóa PostLikes
   - Xóa PostViews
   - Xóa Reports
   - Xóa Violations
   - Xóa ModerationLogs
   - Xóa Posts
   - COMMIT TRANSACTION
   ↓
7. Trả về response thành công
```

## Lưu ý quan trọng

### 1. Sử dụng Transaction
API sử dụng database transaction để đảm bảo:
- Tất cả dữ liệu được xóa cùng lúc
- Nếu có lỗi, tất cả thay đổi sẽ được rollback
- Đảm bảo tính toàn vẹn dữ liệu

### 2. Ghi Log
Trước khi xóa, hệ thống sẽ ghi log vào `ModerationLogs` với thông tin:
- `target_type`: 'post'
- `target_id`: ID bài đăng
- `action`: 'xóa vĩnh viễn'
- `reason`: Lý do xóa
- `performed_by`: ID của admin thực hiện

### 3. Khác biệt với Soft Delete
- **Soft Delete** (`DELETE /api/community/posts/:postId`): 
  - Chỉ đánh dấu `deleted_at`
  - Dữ liệu vẫn còn trong database
  - Có thể khôi phục
  
- **Permanent Delete** (`DELETE /api/community/posts/:postId/permanent`):
  - Xóa hoàn toàn khỏi database
  - Không thể khôi phục
  - Xóa tất cả dữ liệu liên quan

### 4. Khi nào nên sử dụng

✅ **Nên sử dụng khi:**
- Bài viết vi phạm nghiêm trọng pháp luật
- Cần xóa hoàn toàn dữ liệu theo yêu cầu GDPR
- Dọn dẹp database định kỳ
- Xóa spam/bot posts

❌ **Không nên sử dụng khi:**
- Chỉ muốn ẩn bài viết tạm thời
- Có thể cần khôi phục sau này
- Chưa chắc chắn về quyết định xóa

### 5. Best Practices

1. **Xác nhận trước khi xóa**: Luôn yêu cầu admin xác nhận 2 lần
2. **Backup trước**: Nên backup database trước khi xóa hàng loạt
3. **Ghi log đầy đủ**: Đảm bảo log được ghi trước khi xóa
4. **Thông báo người dùng**: Cân nhắc thông báo cho tác giả bài viết
5. **Kiểm tra quyền**: Chỉ super admin mới nên có quyền này

## Testing

### Test Case 1: Xóa thành công
```bash
# Tạo bài viết test
POST /api/community/posts
{
  "title": "Test Post",
  "content": "Test content",
  "topic": "general"
}

# Xóa vĩnh viễn
DELETE /api/community/posts/{postId}/permanent

# Kết quả mong đợi: 200 OK
```

### Test Case 2: Không có quyền
```bash
# Login với user thường
POST /api/auth/login

# Thử xóa
DELETE /api/community/posts/{postId}/permanent

# Kết quả mong đợi: 403 Forbidden
```

### Test Case 3: Bài viết không tồn tại
```bash
DELETE /api/community/posts/00000000-0000-0000-0000-000000000000/permanent

# Kết quả mong đợi: 404 Not Found
```

## Troubleshooting

### Lỗi: "Bài viết không tồn tại"
- Kiểm tra postId có đúng không
- Bài viết có thể đã bị xóa trước đó

### Lỗi: "Bạn không có quyền"
- Kiểm tra token có hợp lệ không
- Kiểm tra role của user (phải là admin)

### Lỗi Transaction
- Kiểm tra kết nối database
- Kiểm tra foreign key constraints
- Xem log chi tiết trong console

## Related APIs

- `DELETE /api/community/posts/:postId` - Soft delete (xóa mềm)
- `PUT /api/community/posts/:postId/restore` - Khôi phục bài viết
- `POST /api/community/posts/:postId/moderation` - Kiểm duyệt bài viết
