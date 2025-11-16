# API Xử Lý Khiếu Nại (Process Appeal)

## Tổng quan

API này cho phép admin xử lý khiếu nại của người dùng. Khi chấp nhận khiếu nại, hệ thống sẽ:
1. Khôi phục bài viết/comment bị xóa
2. Xóa bản ghi vi phạm
3. Tạo admin log
4. Gửi thông báo cho người dùng

## Endpoint

```
PUT /api/admin/moderation/appeals/:appealId/process
```

## Quyền truy cập

- **Admin** (role: `admin` hoặc `super admin`)
- Yêu cầu JWT token trong header

## Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

## Parameters

### Path Parameters
- `appealId` (UUID, required): ID của khiếu nại cần xử lý

### Body Parameters

```json
{
  "action": "accepted",  // hoặc "rejected"
  "notes": "Lý do chấp nhận/từ chối khiếu nại"
}
```

- `action` (string, required): Hành động xử lý
  - `"accepted"` - Chấp nhận khiếu nại
  - `"rejected"` - Từ chối khiếu nại
- `notes` (string, optional): Ghi chú của admin

## Response

### Success Response (200 OK)

#### Khi chấp nhận khiếu nại

```json
{
  "success": true,
  "message": "Khiếu nại đã được chấp nhận.",
  "data": {
    "id": "appeal-uuid",
    "violation_id": "violation-uuid",
    "user_id": "user-uuid",
    "reason": "Lý do khiếu nại của người dùng",
    "status": "accepted",
    "created_at": "2024-01-15T10:00:00.000Z",
    "resolved_at": "2024-01-15T11:00:00.000Z",
    "resolved_by": "admin-uuid",
    "notes": "Ghi chú của admin",
    "user_name": "Tên người dùng",
    "user_avatar": "https://..."
  }
}
```

#### Khi từ chối khiếu nại

```json
{
  "success": true,
  "message": "Khiếu nại đã được từ chối.",
  "data": {
    "id": "appeal-uuid",
    "violation_id": "violation-uuid",
    "user_id": "user-uuid",
    "reason": "Lý do khiếu nại của người dùng",
    "status": "rejected",
    "created_at": "2024-01-15T10:00:00.000Z",
    "resolved_at": "2024-01-15T11:00:00.000Z",
    "resolved_by": "admin-uuid",
    "notes": "Lý do từ chối",
    "user_name": "Tên người dùng",
    "user_avatar": "https://..."
  }
}
```

### Error Responses

#### 400 Bad Request - Action không hợp lệ

```json
{
  "success": false,
  "message": "'action' phải là 'accepted' hoặc 'rejected'."
}
```

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
  "message": "Truy cập bị từ chối, chỉ dành cho admin"
}
```

#### 404 Not Found - Khiếu nại không tồn tại

```json
{
  "success": false,
  "message": "Khiếu nại không tồn tại."
}
```

#### 404 Not Found - Khiếu nại đã được xử lý

```json
{
  "success": false,
  "message": "Khiếu nại đã được xử lý."
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Lỗi khi xử lý khiếu nại",
  "error": "Chi tiết lỗi..."
}
```

## Ví dụ sử dụng

### cURL - Chấp nhận khiếu nại

```bash
curl -X PUT \
  'http://localhost:5000/api/admin/moderation/appeals/123e4567-e89b-12d3-a456-426614174000/process' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "accepted",
    "notes": "Sau khi xem xét, nội dung không vi phạm quy tắc cộng đồng."
  }'
```

### cURL - Từ chối khiếu nại

```bash
curl -X PUT \
  'http://localhost:5000/api/admin/moderation/appeals/123e4567-e89b-12d3-a456-426614174000/process' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "rejected",
    "notes": "Nội dung vẫn vi phạm quy tắc về ngôn từ thô tục."
  }'
```

### JavaScript (Fetch API)

```javascript
const processAppeal = async (appealId, action, notes) => {
  try {
    const response = await fetch(
      `http://localhost:5000/api/admin/moderation/appeals/${appealId}/process`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: action,  // 'accepted' hoặc 'rejected'
          notes: notes
        })
      }
    );

    const data = await response.json();
    
    if (data.success) {
      console.log('Xử lý thành công:', data.message);
      return data.data;
    } else {
      console.error('Lỗi:', data.message);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Lỗi khi xử lý khiếu nại:', error);
    throw error;
  }
};

// Sử dụng - Chấp nhận khiếu nại
processAppeal(
  '123e4567-e89b-12d3-a456-426614174000',
  'accepted',
  'Sau khi xem xét, nội dung không vi phạm.'
)
  .then(result => console.log('Đã chấp nhận:', result))
  .catch(error => console.error('Lỗi:', error));

// Sử dụng - Từ chối khiếu nại
processAppeal(
  '123e4567-e89b-12d3-a456-426614174000',
  'rejected',
  'Nội dung vẫn vi phạm quy tắc.'
)
  .then(result => console.log('Đã từ chối:', result))
  .catch(error => console.error('Lỗi:', error));
```

### Axios

```javascript
import axios from 'axios';

const processAppeal = async (appealId, action, notes) => {
  try {
    const response = await axios.put(
      `http://localhost:5000/api/admin/moderation/appeals/${appealId}/process`,
      {
        action: action,
        notes: notes
      },
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

### Khi chấp nhận khiếu nại (action = 'accepted')

```
1. Admin gửi request PUT với action='accepted'
   ↓
2. Middleware xác thực token và kiểm tra quyền admin
   ↓
3. Service kiểm tra khiếu nại có tồn tại và chưa được xử lý
   ↓
4. Service lấy thông tin violation liên quan
   ↓
5. Service khôi phục nội dung:
   - Nếu là post: gọi postService.restorePost()
   - Nếu là comment: gọi commentService.restoreComment()
   ↓
6. Service xóa bản ghi violation
   ↓
7. Service tạo admin log:
   - target_type: 'appeal'
   - action: 'chấp nhận khiếu nại'
   - performed_by: adminId
   ↓
8. Service gửi thông báo cho người dùng:
   - type: 'appeal_accepted'
   - title: 'Khiếu nại được chấp nhận'
   - content: Thông báo khôi phục nội dung
   - redirect_url: Link đến nội dung đã khôi phục
   ↓
9. Service cập nhật trạng thái appeal
   ↓
10. Trả về response thành công
```

### Khi từ chối khiếu nại (action = 'rejected')

```
1. Admin gửi request PUT với action='rejected'
   ↓
2. Middleware xác thực token và kiểm tra quyền admin
   ↓
3. Service kiểm tra khiếu nại có tồn tại và chưa được xử lý
   ↓
4. Service cập nhật trạng thái appeal
   ↓
5. Trả về response thành công
```

**Lưu ý**: Không tạo admin log và không gửi thông báo.

## Các hành động được thực hiện

### Khi chấp nhận khiếu nại

1. ✅ **Khôi phục nội dung**
   - Post: Xóa `deleted_at`, `deleted_by`, `deleted_reason`
   - Comment: Xóa `deleted_at`, `deleted_by`, `deleted_reason`
   - Chuyển status về `published` (post) hoặc active (comment)

2. ✅ **Xóa vi phạm**
   - Xóa bản ghi trong bảng `Violations`
   - Xóa các liên kết trong bảng `ViolationRules`

3. ✅ **Tạo admin log**
   - Ghi lại hành động vào bảng `ModerationLogs`
   - Lưu thông tin: admin ID, thời gian, lý do

4. ✅ **Gửi thông báo**
   - Tạo notification cho người dùng
   - Type: `appeal_accepted`
   - Priority: `high`
   - Có link redirect đến nội dung đã khôi phục

### Khi từ chối khiếu nại

1. ✅ **Giữ nguyên vi phạm**
   - Không xóa bản ghi `Violations`
   - Nội dung vẫn bị xóa

2. ✅ **Tạo admin log**
   - Ghi lại hành động vào bảng `ModerationLogs`
   - Lưu lý do từ chối

3. ✅ **Gửi thông báo**
   - Tạo notification cho người dùng
   - Type: `appeal_rejected`
   - Priority: `normal`
   - Giải thích lý do từ chối

## Thông báo

**Không gửi thông báo tự động.**

Người dùng có thể kiểm tra trạng thái khiếu nại qua:
- API: `GET /api/user/moderation/appeals` - Lấy danh sách khiếu nại
- API: `GET /api/admin/moderation/appeals/:appealId` - Xem chi tiết khiếu nại

Trạng thái khiếu nại được lưu trong bảng `Appeals`:
- `status`: 'pending', 'accepted', 'rejected'
- `resolved_at`: Thời gian xử lý
- `resolved_by`: Admin xử lý
- `notes`: Ghi chú của admin

## Admin Log

**Không tạo admin log** cho cả 2 trường hợp (chấp nhận và từ chối khiếu nại).

Lý do: 
- Hành động xử lý khiếu nại đã được ghi lại trong bảng `Appeals` với các trường `status`, `resolved_by`, `resolved_at`, `notes`
- Không cần duplicate log trong `ModerationLogs`

## Best Practices

### 1. Xem xét kỹ trước khi quyết định

```javascript
// Lấy chi tiết khiếu nại trước
const appealDetails = await getAppealDetails(appealId);

// Xem xét:
// - Lý do khiếu nại của người dùng
// - Nội dung vi phạm
// - Quy tắc đã vi phạm
// - Lịch sử vi phạm của người dùng

// Sau đó mới quyết định
if (shouldAccept) {
  await processAppeal(appealId, 'accepted', 'Lý do chấp nhận...');
} else {
  await processAppeal(appealId, 'rejected', 'Lý do từ chối...');
}
```

### 2. Luôn cung cấp ghi chú rõ ràng

```javascript
// ❌ Không tốt
await processAppeal(appealId, 'rejected', '');

// ✅ Tốt
await processAppeal(
  appealId, 
  'rejected', 
  'Nội dung chứa ngôn từ thô tục vi phạm quy tắc 3.2 về văn hóa giao tiếp.'
);
```

### 3. Thông báo cho người dùng về quyền khiếu nại tiếp

```javascript
if (action === 'rejected') {
  // Có thể thêm thông tin về quyền khiếu nại lần 2
  notes += ' Bạn có thể gửi khiếu nại mới với bằng chứng bổ sung.';
}
```

## Testing

### Test Case 1: Chấp nhận khiếu nại thành công

```bash
# 1. Tạo vi phạm và khiếu nại
POST /api/admin/moderation/violations
POST /api/user/moderation/appeals

# 2. Xử lý khiếu nại
PUT /api/admin/moderation/appeals/{appealId}/process
{
  "action": "accepted",
  "notes": "Test accept"
}

# 3. Verify
# - Appeal status = 'accepted'
# - Violation đã bị xóa
# - Post/Comment đã được khôi phục
# - Admin log đã được tạo
# - Notification đã được gửi
```

### Test Case 2: Từ chối khiếu nại

```bash
PUT /api/admin/moderation/appeals/{appealId}/process
{
  "action": "rejected",
  "notes": "Test reject"
}

# Verify
# - Appeal status = 'rejected'
# - Violation vẫn còn
# - Post/Comment vẫn bị xóa
# - Admin log đã được tạo
# - Notification đã được gửi
```

### Test Case 3: Khiếu nại đã được xử lý

```bash
# Xử lý lần 1
PUT /api/admin/moderation/appeals/{appealId}/process

# Xử lý lần 2 (sẽ lỗi)
PUT /api/admin/moderation/appeals/{appealId}/process

# Kết quả mong đợi: 404 "Khiếu nại đã được xử lý."
```

## Troubleshooting

### Lỗi: "Khiếu nại không tồn tại"
- Kiểm tra appealId có đúng không
- Kiểm tra khiếu nại có trong database không

### Lỗi: "Khiếu nại đã được xử lý"
- Khiếu nại đã được xử lý trước đó
- Kiểm tra trường `status` trong database

### Lỗi: "Vi phạm liên quan không tồn tại"
- Violation đã bị xóa trước đó
- Kiểm tra tính toàn vẹn dữ liệu

### Lỗi khi khôi phục nội dung
- Kiểm tra nội dung có tồn tại trong database không
- Kiểm tra quyền admin
- Xem log chi tiết trong console

## Related APIs

- `POST /api/user/moderation/appeals` - Tạo khiếu nại
- `GET /api/user/moderation/appeals` - Lấy danh sách khiếu nại của user
- `GET /api/admin/moderation/appeals` - Lấy danh sách tất cả khiếu nại (admin)
- `GET /api/admin/moderation/appeals/:appealId` - Lấy chi tiết khiếu nại
- `PUT /api/community/posts/:postId/restore` - Khôi phục bài viết
- `PUT /api/community/comments/:commentId/restore` - Khôi phục comment

## Changelog

### Version 1.1.0 - Cập nhật tự động khôi phục và thông báo
- ✅ Tự động khôi phục post/comment khi chấp nhận khiếu nại
- ✅ Tự động xóa violation khi chấp nhận
- ✅ Tự động tạo admin log
- ✅ Tự động gửi thông báo cho người dùng
- ✅ Hỗ trợ cả post và comment

### Version 1.0.0 - Initial release
- Xử lý khiếu nại cơ bản
- Cập nhật trạng thái appeal
