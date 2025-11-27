# API Thu hồi Thông báo (Revoke Notifications)

## Tổng quan
API này cho phép admin thu hồi các thông báo đã được publish trước đó. Khi thu hồi, hệ thống sẽ đánh dấu các thông báo về trạng thái draft (chưa gửi push notification).

## Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | POST |
| **Endpoint** | `/notifications/revoke` |
| **Authentication** | Required (JWT Token) |
| **Authorization** | Admin only |
| **Content-Type** | application/json |

## Request

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Body Parameters

| Tham số | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---------|--------------|----------|-------|
| `ids` | Array<UUID> | Có | Mảng chứa các ID của thông báo cần thu hồi |

### Request Example
```json
{
  "ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ]
}
```

## Response

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Đã thu hồi 3 thông báo thành công",
  "data": {
    "revokedCount": 3
  }
}
```

### Error Responses

#### 400 Bad Request - Thiếu hoặc sai định dạng mảng IDs
```json
{
  "success": false,
  "message": "Mảng ids là bắt buộc."
}
```

#### 401 Unauthorized - Chưa đăng nhập
```json
{
  "success": false,
  "message": "Token không hợp lệ"
}
```

#### 403 Forbidden - Không có quyền admin
```json
{
  "success": false,
  "message": "Bạn không có quyền truy cập"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Lỗi khi thu hồi thông báo",
  "error": "Chi tiết lỗi..."
}
```

## Quy trình xử lý

1. **Xác thực**: Kiểm tra JWT token và quyền admin
2. **Validation**: Kiểm tra `ids` phải là mảng và không rỗng
3. **Cập nhật Database**: Đánh dấu `is_push_sent = false` cho các thông báo
4. **Trả về kết quả**: Số lượng thông báo đã thu hồi thành công

## So sánh với API Publish

| Tính năng | Publish | Revoke |
|-----------|---------|--------|
| **Endpoint** | `/notifications/publish` | `/notifications/revoke` |
| **Chức năng** | Gửi thông báo | Thu hồi thông báo |
| **Cập nhật** | `is_push_sent = true` | `is_push_sent = false` |
| **Trạng thái** | Draft → Published | Published → Draft |

## Use Cases

### ✅ Khi nào nên thu hồi thông báo?

1. **Phát hiện lỗi nội dung**: Thông báo có thông tin sai lệch
2. **Thay đổi kế hoạch**: Cần chỉnh sửa nội dung trước khi gửi lại
3. **Gửi nhầm**: Thông báo được publish nhầm
4. **Testing**: Thu hồi các thông báo test sau khi kiểm tra

### ⚠️ Lưu ý quan trọng

- API chỉ cập nhật trạng thái trong database
- **Không thể thu hồi push notification đã gửi đến thiết bị người dùng**
- Người dùng vẫn có thể thấy thông báo đã nhận trước đó
- Chỉ thay đổi trạng thái `is_push_sent` trong database

## Workflow thông thường

```
1. Admin tạo thông báo (Draft)
   ↓
2. Admin publish thông báo
   ↓ (is_push_sent = true)
3. Phát hiện lỗi hoặc cần chỉnh sửa
   ↓
4. Admin revoke thông báo
   ↓ (is_push_sent = false)
5. Admin chỉnh sửa nội dung
   ↓
6. Admin publish lại
```

## Ví dụ sử dụng

### cURL
```bash
curl -X POST https://api.example.com/notifications/revoke \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "ids": [
      "550e8400-e29b-41d4-a716-446655440000",
      "550e8400-e29b-41d4-a716-446655440001"
    ]
  }'
```

### JavaScript (Fetch)
```javascript
const revokeNotifications = async (notificationIds) => {
  try {
    const response = await fetch('/notifications/revoke', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ids: notificationIds
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`Đã thu hồi ${data.data.revokedCount} thông báo`);
    } else {
      console.error('Lỗi:', data.message);
    }
    
    return data;
  } catch (error) {
    console.error('Lỗi kết nối:', error);
    throw error;
  }
};

// Sử dụng
revokeNotifications([
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440001'
]);
```

### Axios
```javascript
import axios from 'axios';

const revokeNotifications = async (ids) => {
  try {
    const { data } = await axios.post('/notifications/revoke', 
      { ids },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log(data.message);
    return data.data.revokedCount;
  } catch (error) {
    console.error('Error:', error.response?.data?.message);
    throw error;
  }
};
```

### React Hook Example
```javascript
import { useState } from 'react';
import axios from 'axios';

const useRevokeNotifications = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const revoke = async (ids) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data } = await axios.post('/notifications/revoke', { ids });
      return data.data.revokedCount;
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi thu hồi thông báo');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { revoke, loading, error };
};

// Sử dụng trong component
function NotificationManager() {
  const { revoke, loading, error } = useRevokeNotifications();

  const handleRevoke = async (selectedIds) => {
    try {
      const count = await revoke(selectedIds);
      alert(`Đã thu hồi ${count} thông báo`);
    } catch (err) {
      alert('Có lỗi xảy ra');
    }
  };

  return (
    <button onClick={() => handleRevoke(['id1', 'id2'])} disabled={loading}>
      {loading ? 'Đang thu hồi...' : 'Thu hồi thông báo'}
    </button>
  );
}
```

## Database Impact

API này thực hiện câu lệnh SQL:
```sql
UPDATE "Notifications" 
SET is_push_sent = false 
WHERE id = ANY($1::uuid[]);
```

Cập nhật cột `is_push_sent` từ `true` → `false` cho các thông báo được chỉ định.

## Testing

### Test Case 1: Thu hồi thành công
```javascript
// Input
{
  "ids": ["550e8400-e29b-41d4-a716-446655440000"]
}

// Expected Output
{
  "success": true,
  "message": "Đã thu hồi 1 thông báo thành công",
  "data": {
    "revokedCount": 1
  }
}
```

### Test Case 2: Mảng IDs rỗng
```javascript
// Input
{
  "ids": []
}

// Expected Output
{
  "success": false,
  "message": "Mảng ids là bắt buộc."
}
```

### Test Case 3: Thiếu tham số ids
```javascript
// Input
{}

// Expected Output
{
  "success": false,
  "message": "Mảng ids là bắt buộc."
}
```

### Test Case 4: Thu hồi nhiều thông báo
```javascript
// Input
{
  "ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ]
}

// Expected Output
{
  "success": true,
  "message": "Đã thu hồi 3 thông báo thành công",
  "data": {
    "revokedCount": 3
  }
}
```

## Tích hợp với Admin Dashboard

### UI Suggestions

1. **Nút thu hồi trên danh sách thông báo**
   - Hiển thị cho các thông báo có `is_push_sent = true`
   - Cho phép chọn nhiều thông báo để thu hồi cùng lúc

2. **Confirmation Dialog**
   ```
   Bạn có chắc muốn thu hồi 3 thông báo đã chọn?
   
   Lưu ý: Thao tác này chỉ thay đổi trạng thái trong database.
   Người dùng vẫn có thể thấy thông báo đã nhận trước đó.
   
   [Hủy]  [Thu hồi]
   ```

3. **Status Badge**
   - Draft: `<Badge color="gray">Nháp</Badge>`
   - Published: `<Badge color="green">Đã gửi</Badge>`

## Best Practices

1. **Luôn xác nhận trước khi thu hồi**
   - Hiển thị dialog xác nhận
   - Liệt kê các thông báo sẽ bị thu hồi

2. **Ghi log hành động**
   - Lưu lại ai đã thu hồi thông báo
   - Lưu thời gian thu hồi
   - Lưu lý do thu hồi (nếu có)

3. **Thông báo cho admin**
   - Hiển thị toast/notification khi thu hồi thành công
   - Cập nhật UI ngay lập tức

4. **Giới hạn quyền**
   - Chỉ admin tạo thông báo mới có quyền thu hồi
   - Hoặc chỉ super admin có quyền thu hồi

## Roadmap / Cải tiến tương lai

- [ ] Thêm lý do thu hồi (revoke_reason)
- [ ] Lưu lịch sử thu hồi (revoke_history)
- [ ] Gửi thông báo đến người dùng về việc thu hồi
- [ ] Thêm API để xem lịch sử publish/revoke
- [ ] Giới hạn số lần thu hồi tối đa
- [ ] Thêm quyền kiểm soát chi tiết hơn
