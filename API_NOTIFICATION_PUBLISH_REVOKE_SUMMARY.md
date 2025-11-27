# API Publish & Revoke Notifications - Mô tả ngắn gọn

## 📤 POST /notifications/publish - Gửi thông báo

**Mục đích**: Đánh dấu thông báo là đã gửi (is_push_sent = true)

### Request
```json
POST /notifications/publish
Authorization: Bearer <admin_token>

{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

### Response
```json
{
  "success": true
}
```

### Chức năng
- Cập nhật `is_push_sent = true` cho các thông báo được chỉ định
- Chuyển trạng thái từ **Draft** → **Published**
- Yêu cầu quyền **Admin**

---

## 📥 POST /notifications/revoke - Thu hồi thông báo

**Mục đích**: Đánh dấu thông báo về trạng thái nháp (is_push_sent = false)

### Request
```json
POST /notifications/revoke
Authorization: Bearer <admin_token>

{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

### Response
```json
{
  "success": true,
  "message": "Đã thu hồi 3 thông báo thành công",
  "data": {
    "revokedCount": 3
  }
}
```

### Chức năng
- Cập nhật `is_push_sent = false` cho các thông báo được chỉ định
- Chuyển trạng thái từ **Published** → **Draft**
- Yêu cầu quyền **Admin**

---

## 🔄 So sánh nhanh

| | Publish | Revoke |
|---|---|---|
| **Endpoint** | `/notifications/publish` | `/notifications/revoke` |
| **Trạng thái** | Draft → Published | Published → Draft |
| **Database** | `is_push_sent = true` | `is_push_sent = false` |
| **Use case** | Gửi thông báo đến user | Thu hồi về trạng thái nháp |

---

## 💡 Workflow

```
1. Tạo thông báo (Draft)
   ↓
2. Publish → is_push_sent = true
   ↓
3. Phát hiện lỗi
   ↓
4. Revoke → is_push_sent = false
   ↓
5. Chỉnh sửa
   ↓
6. Publish lại
```

---

## ⚠️ Lưu ý

**Publish:**
- Chỉ cập nhật database, chưa gửi push notification thực tế
- Có thể publish lại thông báo đã published

**Revoke:**
- Không thu hồi được push notification đã gửi đến thiết bị
- Người dùng vẫn thấy thông báo đã nhận trước đó
- Chỉ thay đổi trạng thái trong database

---

## 📝 Ví dụ sử dụng

```javascript
// Publish
await fetch('/notifications/publish', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ids: ['uuid1', 'uuid2']
  })
});

// Revoke
await fetch('/notifications/revoke', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ids: ['uuid1', 'uuid2']
  })
});
```

---

## 🚫 Error Responses (Cả 2 API)

| Code | Message |
|------|---------|
| 400 | "Mảng ids là bắt buộc." |
| 401 | "Token không hợp lệ" |
| 403 | "Bạn không có quyền truy cập" |
| 500 | "Lỗi khi gửi/thu hồi thông báo" |
