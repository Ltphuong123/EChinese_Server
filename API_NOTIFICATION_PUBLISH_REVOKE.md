# API Quản lý Trạng thái Thông báo

Tài liệu này mô tả hai API quan trọng để quản lý trạng thái gửi thông báo: **Publish** (Gửi) và **Revoke** (Thu hồi).

---

## 📤 API 1: Publish Notifications (Gửi thông báo)

### Tổng quan
API cho phép admin gửi (publish) các thông báo đã được tạo trước đó đến người dùng. Khi publish, hệ thống sẽ đánh dấu các thông báo là đã gửi push notification.

### Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | POST |
| **Endpoint** | `/notifications/publish` |
| **Authentication** | Required (JWT Token) |
| **Authorization** | Admin only |
| **Content-Type** | application/json |

### Request

#### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Body Parameters

| Tham số | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---------|--------------|----------|-------|
| `ids` | Array<UUID> | Có | Mảng chứa các ID của thông báo cần publish |

#### Request Example
```json
{
  "ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ]
}
```

### Response

#### Success Response (200 OK)
```json
{
  "success": true
}
```

#### Error Responses

**400 Bad Request** - Thiếu hoặc sai định dạng mảng IDs
```json
{
  "success": false,
  "message": "Mảng ids là bắt buộc."
}
```

**401 Unauthorized** - Chưa đăng nhập
```json
{
  "success": false,
  "message": "Token không hợp lệ"
}
```

**403 Forbidden** - Không có quyền admin
```json
{
  "success": false,
  "message": "Bạn không có quyền truy cập"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Lỗi khi gửi thông báo",
  "error": "Chi tiết lỗi..."
}
```

### Database Impact
```sql
UPDATE "Notifications" 
SET is_push_sent = true 
WHERE id = ANY($1::uuid[]);
```

---

## 📥 API 2: Revoke Notifications (Thu hồi thông báo)

### Tổng quan
API cho phép admin thu hồi các thông báo đã được publish trước đó. Khi thu hồi, hệ thống sẽ đánh dấu các thông báo về trạng thái draft (chưa gửi push notification).

### Thông tin cơ bản

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | POST |
| **Endpoint** | `/notifications/revoke` |
| **Authentication** | Required (JWT Token) |
| **Authorization** | Admin only |
| **Content-Type** | application/json |

### Request

#### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Body Parameters

| Tham số | Kiểu dữ liệu | Bắt buộc | Mô tả |
|---------|--------------|----------|-------|
| `ids` | Array<UUID> | Có | Mảng chứa các ID của thông báo cần thu hồi |

#### Request Example
```json
{
  "ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ]
}
```

### Response

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Đã thu hồi 3 thông báo thành công",
  "data": {
    "revokedCount": 3
  }
}
```

#### Error Responses

**400 Bad Request** - Thiếu hoặc sai định dạng mảng IDs
```json
{
  "success": false,
  "message": "Mảng ids là bắt buộc."
}
```

**401 Unauthorized** - Chưa đăng nhập
```json
{
  "success": false,
  "message": "Token không hợp lệ"
}
```

**403 Forbidden** - Không có quyền admin
```json
{
  "success": false,
  "message": "Bạn không có quyền truy cập"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Lỗi khi thu hồi thông báo",
  "error": "Chi tiết lỗi..."
}
```

### Database Impact
```sql
UPDATE "Notifications" 
SET is_push_sent = false 
WHERE id = ANY($1::uuid[]);
```

---

## 🔄 So sánh hai API

| Tính năng | Publish | Revoke |
|-----------|---------|--------|
| **Endpoint** | `/notifications/publish` | `/notifications/revoke` |
| **Chức năng** | Gửi thông báo | Thu hồi thông báo |
| **Cập nhật Database** | `is_push_sent = true` | `is_push_sent = false` |
| **Trạng thái** | Draft → Published | Published → Draft |
| **Response** | `{ success: true }` | `{ success: true, message: "...", data: { revokedCount: N } }` |
| **Use Case** | Gửi thông báo đến người dùng | Đưa thông báo về trạng thái nháp |

---

## 📋 Workflow hoàn chỉnh

```
┌─────────────────────────────────────────────────────────────┐
│  1. Tạo thông báo (Draft)                                   │
│     POST /notifications                                      │
│     { auto_push: false }                                     │
│     ↓                                                        │
│     is_push_sent = false                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Publish thông báo                                        │
│     POST /notifications/publish                              │
│     { ids: ["uuid1", "uuid2"] }                             │
│     ↓                                                        │
│     is_push_sent = true                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Phát hiện lỗi hoặc cần chỉnh sửa                        │
│     ↓                                                        │
│  4. Revoke thông báo                                         │
│     POST /notifications/revoke                               │
│     { ids: ["uuid1", "uuid2"] }                             │
│     ↓                                                        │
│     is_push_sent = false                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Chỉnh sửa nội dung thông báo                            │
│     PUT /notifications/:id                                   │
│     ↓                                                        │
│  6. Publish lại                                              │
│     POST /notifications/publish                              │
│     { ids: ["uuid1", "uuid2"] }                             │
│     ↓                                                        │
│     is_push_sent = true                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Ví dụ sử dụng

### JavaScript (Fetch API)

```javascript
// 1. Publish thông báo
const publishNotifications = async (notificationIds) => {
  try {
    const response = await fetch('/notifications/publish', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids: notificationIds })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Đã gửi thông báo thành công!');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Lỗi khi gửi thông báo:', error);
    throw error;
  }
};

// 2. Thu hồi thông báo
const revokeNotifications = async (notificationIds) => {
  try {
    const response = await fetch('/notifications/revoke', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids: notificationIds })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.message}`);
      console.log(`📊 Số lượng: ${data.data.revokedCount}`);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Lỗi khi thu hồi thông báo:', error);
    throw error;
  }
};

// Sử dụng
const notificationIds = [
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440001'
];

// Gửi thông báo
await publishNotifications(notificationIds);

// Thu hồi thông báo
await revokeNotifications(notificationIds);
```

### Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/notifications',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 1. Publish
const publishNotifications = async (ids) => {
  try {
    const { data } = await api.post('/publish', { ids });
    console.log('✅ Published successfully');
    return data.success;
  } catch (error) {
    console.error('❌ Publish failed:', error.response?.data?.message);
    throw error;
  }
};

// 2. Revoke
const revokeNotifications = async (ids) => {
  try {
    const { data } = await api.post('/revoke', { ids });
    console.log(`✅ ${data.message}`);
    return data.data.revokedCount;
  } catch (error) {
    console.error('❌ Revoke failed:', error.response?.data?.message);
    throw error;
  }
};
```

### cURL

```bash
# 1. Publish thông báo
curl -X POST https://api.example.com/notifications/publish \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": [
      "550e8400-e29b-41d4-a716-446655440000",
      "550e8400-e29b-41d4-a716-446655440001"
    ]
  }'

# 2. Thu hồi thông báo
curl -X POST https://api.example.com/notifications/revoke \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": [
      "550e8400-e29b-41d4-a716-446655440000",
      "550e8400-e29b-41d4-a716-446655440001"
    ]
  }'
```

---

## 🎯 Use Cases

### Khi nào dùng Publish?

✅ **Nên dùng khi:**
- Đã tạo thông báo dạng draft và muốn gửi đến người dùng
- Muốn kiểm soát thời điểm gửi thông báo
- Cần gửi hàng loạt nhiều thông báo cùng lúc
- Muốn xem trước nội dung trước khi gửi

❌ **Không nên dùng khi:**
- Muốn gửi ngay lập tức (dùng `auto_push: true` khi tạo)
- Thông báo đã được publish rồi

### Khi nào dùng Revoke?

✅ **Nên dùng khi:**
- Phát hiện lỗi nội dung sau khi publish
- Cần chỉnh sửa thông báo đã gửi
- Gửi nhầm thông báo
- Testing và cần reset trạng thái

❌ **Không nên dùng khi:**
- Muốn xóa thông báo hoàn toàn (dùng DELETE API)
- Thông báo chưa được publish

---

## ⚠️ Lưu ý quan trọng

### Publish API
1. **Không gửi push notification thực tế**: Hiện tại chỉ cập nhật database, chưa tích hợp Firebase/OneSignal
2. **Không kiểm tra trạng thái**: Có thể publish lại thông báo đã publish
3. **Không có rollback**: Nếu có lỗi, cần revoke thủ công

### Revoke API
1. **Không thu hồi push đã gửi**: Người dùng vẫn thấy thông báo trên thiết bị
2. **Chỉ thay đổi database**: Không ảnh hưởng đến notification đã hiển thị
3. **Không xóa dữ liệu**: Thông báo vẫn tồn tại, chỉ thay đổi trạng thái

---

## 🧪 Testing

### Test Publish API

```javascript
describe('POST /notifications/publish', () => {
  it('should publish notifications successfully', async () => {
    const response = await request(app)
      .post('/notifications/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ids: ['550e8400-e29b-41d4-a716-446655440000']
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should return 400 if ids is empty', async () => {
    const response = await request(app)
      .post('/notifications/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: [] });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 403 if not admin', async () => {
    const response = await request(app)
      .post('/notifications/publish')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        ids: ['550e8400-e29b-41d4-a716-446655440000']
      });
    
    expect(response.status).toBe(403);
  });
});
```

### Test Revoke API

```javascript
describe('POST /notifications/revoke', () => {
  it('should revoke notifications successfully', async () => {
    const response = await request(app)
      .post('/notifications/revoke')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ids: ['550e8400-e29b-41d4-a716-446655440000']
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.revokedCount).toBeGreaterThan(0);
  });

  it('should return 400 if ids is not array', async () => {
    const response = await request(app)
      .post('/notifications/revoke')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: 'not-an-array' });
    
    expect(response.status).toBe(400);
  });
});
```

---

## 🎨 UI/UX Suggestions

### Admin Dashboard - Notification List

```jsx
function NotificationRow({ notification, onPublish, onRevoke }) {
  const isDraft = !notification.is_push_sent;
  
  return (
    <tr>
      <td>{notification.title}</td>
      <td>
        {isDraft ? (
          <Badge color="gray">Nháp</Badge>
        ) : (
          <Badge color="green">Đã gửi</Badge>
        )}
      </td>
      <td>
        {isDraft ? (
          <Button onClick={() => onPublish([notification.id])}>
            📤 Gửi
          </Button>
        ) : (
          <Button onClick={() => onRevoke([notification.id])}>
            📥 Thu hồi
          </Button>
        )}
      </td>
    </tr>
  );
}
```

### Bulk Actions

```jsx
function NotificationManager() {
  const [selectedIds, setSelectedIds] = useState([]);
  
  const handleBulkPublish = async () => {
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 thông báo');
      return;
    }
    
    const confirmed = confirm(
      `Bạn có chắc muốn gửi ${selectedIds.length} thông báo?`
    );
    
    if (confirmed) {
      await publishNotifications(selectedIds);
      alert('Đã gửi thành công!');
      refreshList();
    }
  };
  
  const handleBulkRevoke = async () => {
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 thông báo');
      return;
    }
    
    const confirmed = confirm(
      `Bạn có chắc muốn thu hồi ${selectedIds.length} thông báo?\n\n` +
      `Lưu ý: Người dùng vẫn có thể thấy thông báo đã nhận trước đó.`
    );
    
    if (confirmed) {
      const count = await revokeNotifications(selectedIds);
      alert(`Đã thu hồi ${count} thông báo thành công!`);
      refreshList();
    }
  };
  
  return (
    <div>
      <button onClick={handleBulkPublish}>
        📤 Gửi ({selectedIds.length})
      </button>
      <button onClick={handleBulkRevoke}>
        📥 Thu hồi ({selectedIds.length})
      </button>
    </div>
  );
}
```

---

## 🚀 Best Practices

### 1. Luôn xác nhận trước khi thực hiện
```javascript
const confirmPublish = (count) => {
  return confirm(
    `Bạn có chắc muốn gửi ${count} thông báo?\n\n` +
    `Thông báo sẽ được gửi đến người dùng ngay lập tức.`
  );
};

const confirmRevoke = (count) => {
  return confirm(
    `Bạn có chắc muốn thu hồi ${count} thông báo?\n\n` +
    `Lưu ý: Người dùng vẫn có thể thấy thông báo đã nhận.`
  );
};
```

### 2. Xử lý lỗi đầy đủ
```javascript
const safePublish = async (ids) => {
  try {
    await publishNotifications(ids);
    showSuccessToast('Đã gửi thông báo thành công');
  } catch (error) {
    if (error.response?.status === 403) {
      showErrorToast('Bạn không có quyền thực hiện thao tác này');
    } else {
      showErrorToast('Có lỗi xảy ra, vui lòng thử lại');
    }
  }
};
```

### 3. Cập nhật UI ngay lập tức
```javascript
const handlePublish = async (ids) => {
  // Optimistic update
  updateLocalState(ids, { is_push_sent: true });
  
  try {
    await publishNotifications(ids);
  } catch (error) {
    // Rollback on error
    updateLocalState(ids, { is_push_sent: false });
    showError(error);
  }
};
```

### 4. Ghi log hành động
```javascript
const logAction = async (action, ids) => {
  await fetch('/admin/logs', {
    method: 'POST',
    body: JSON.stringify({
      action,
      resource: 'notifications',
      resource_ids: ids,
      timestamp: new Date().toISOString()
    })
  });
};

// Sử dụng
await publishNotifications(ids);
await logAction('publish', ids);
```

---

## 📊 Monitoring & Analytics

### Metrics cần theo dõi

1. **Publish Rate**: Số lượng thông báo được publish mỗi ngày
2. **Revoke Rate**: Số lượng thông báo bị thu hồi (nên thấp)
3. **Success Rate**: Tỷ lệ thành công của API calls
4. **Response Time**: Thời gian xử lý request

### Dashboard Example

```
┌─────────────────────────────────────────────────────────┐
│  Notification Statistics (Last 7 days)                  │
├─────────────────────────────────────────────────────────┤
│  📤 Published:     1,234 notifications                  │
│  📥 Revoked:          45 notifications (3.6%)           │
│  ✅ Success Rate:  99.8%                                │
│  ⏱️  Avg Response:  120ms                               │
└─────────────────────────────────────────────────────────┘
```

---

## 🔮 Roadmap / Future Improvements

- [ ] Tích hợp Firebase Cloud Messaging để gửi push thực tế
- [ ] Thêm scheduled publish (đặt lịch gửi)
- [ ] Thêm preview trước khi publish
- [ ] Lưu lịch sử publish/revoke
- [ ] Thêm quyền kiểm soát chi tiết (chỉ người tạo mới revoke được)
- [ ] Thêm API batch operations với pagination
- [ ] Thêm webhook để notify khi publish/revoke
- [ ] Thêm dry-run mode để test trước khi publish thật
