# 🔧 Fix Lỗi: messaging/mismatched-credential

## ❌ Lỗi Bạn Đang Gặp

```
❌ Failed to send to token: messaging/mismatched-credential
✅ Sent: 0, Failed: 1
```

## 🔍 Nguyên Nhân

**Firebase Service Account (backend) và Firebase Project (frontend) KHÔNG KHỚP!**

Có 2 trường hợp:

### Trường hợp 1: Backend và Frontend dùng 2 Firebase Projects khác nhau
- Backend: Project A
- Frontend: Project B
→ Token từ Project B không thể dùng với credentials của Project A

### Trường hợp 2: Service Account Key không đúng
- Service Account Key đã bị xóa/vô hiệu hóa
- Service Account Key không có quyền gửi message

---

## ✅ Giải Pháp

### Bước 1: Kiểm Tra Project ID

#### Backend - Kiểm tra Service Account

Mở file `config/firebase-service-account.json`:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",  // ← Ghi nhớ cái này
  "private_key_id": "...",
  "private_key": "...",
  "client_email": "firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com"
}
```

**Ghi nhớ `project_id`**

#### Frontend - Kiểm tra Firebase Config

**Web (React):**

Mở file `.env` hoặc `src/firebase/config.js`:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",  // ← Phải GIỐNG với backend
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

**React Native:**

Kiểm tra file `google-services.json` (Android) hoặc `GoogleService-Info.plist` (iOS):

```json
{
  "project_info": {
    "project_id": "your-project-id"  // ← Phải GIỐNG với backend
  }
}
```

### ⚠️ Nếu Project ID KHÁC NHAU → Đây là vấn đề!

---

## 🔧 Cách Sửa

### Giải pháp 1: Dùng Cùng 1 Firebase Project (Khuyến nghị)

#### Option A: Thay Service Account Key của Backend

1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn **project mà frontend đang dùng**
3. **Project Settings** (⚙️) → **Service Accounts**
4. Click **Generate New Private Key**
5. Tải file JSON về
6. Thay thế file `config/firebase-service-account.json` cũ
7. Khởi động lại server

```bash
npm start
```

#### Option B: Thay Firebase Config của Frontend

1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn **project mà backend đang dùng**
3. **Project Settings** → **General** → **Your apps**
4. Chọn Web app (</>) hoặc tạo mới
5. Copy config mới
6. Cập nhật file `.env` hoặc `src/firebase/config.js`
7. Lấy VAPID key mới từ **Cloud Messaging** tab
8. Rebuild frontend

```bash
npm run build
```

---

### Giải pháp 2: Tạo Lại Device Token

Sau khi đảm bảo backend và frontend dùng cùng project:

1. **Xóa token cũ trong database:**

```sql
DELETE FROM "DeviceTokens" WHERE platform = 'web';
```

2. **Xóa token trong localStorage (Frontend):**

```javascript
// Mở Console (F12)
localStorage.removeItem('fcm_token');
```

3. **Reload trang và login lại**

Frontend sẽ tự động lấy token mới và gửi lên backend.

---

## 🧪 Kiểm Tra Sau Khi Sửa

### 1. Kiểm tra Project ID khớp

**Backend:**
```bash
# Xem project_id trong service account
cat config/firebase-service-account.json | grep project_id
```

**Frontend:**
```javascript
// Console
console.log('Project ID:', firebaseConfig.projectId);
```

→ **Phải GIỐNG NHAU!**

---

### 2. Test gửi notification

```bash
curl -X POST http://localhost:5000/api/send-notification \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "title": "Test After Fix",
    "message": "Testing sau khi fix lỗi"
  }'
```

**Kiểm tra log server:**

```
✅ Sent: 1, Failed: 0
✅ Push notification sent for: xxx
```

**Nếu thấy `Sent: 1` → Thành công!** ✅

---

## 📋 Checklist Fix

- [ ] Kiểm tra `project_id` trong `firebase-service-account.json`
- [ ] Kiểm tra `projectId` trong frontend config
- [ ] Đảm bảo 2 project ID GIỐNG NHAU
- [ ] Nếu khác → Tải Service Account Key mới hoặc đổi frontend config
- [ ] Xóa device tokens cũ trong database
- [ ] Xóa `fcm_token` trong localStorage
- [ ] Reload và login lại
- [ ] Test gửi notification
- [ ] Kiểm tra log: `Sent: 1, Failed: 0`

---

## 🔍 Debug Chi Tiết

### Xem Project ID từ Token

Token FCM có chứa thông tin project. Để decode:

```javascript
// Console
const token = localStorage.getItem('fcm_token');
console.log('Token:', token);

// Token format: [PROJECT_ID]:[RANDOM_STRING]
// Ví dụ: APA91bH... (không thể decode trực tiếp)
```

### Xem Log Chi Tiết

Thêm log vào `services/fcmService.js`:

```javascript
sendToTokens: async (tokens, payload) => {
  // ... existing code ...
  
  console.log('🔍 Debug Info:');
  console.log('Tokens count:', tokens.length);
  console.log('First token:', tokens[0]);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  // ... rest of code ...
  
  if (response.failureCount > 0) {
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error('❌ Token:', tokens[idx]);
        console.error('❌ Error:', resp.error);
      }
    });
  }
}
```

---

## 🎯 Tóm Tắt

**Vấn đề:** Backend và Frontend dùng 2 Firebase Projects khác nhau

**Giải pháp:**
1. Đảm bảo cùng 1 Firebase Project
2. Tải Service Account Key mới (nếu cần)
3. Xóa device tokens cũ
4. Lấy token mới
5. Test lại

**Sau khi fix:**
```
✅ Sent: 1, Failed: 0  ← Phải thấy cái này
```

---

## 📞 Nếu Vẫn Lỗi

Kiểm tra thêm:

1. **Service Account có quyền không?**
   - Firebase Console → IAM & Admin
   - Service Account phải có role: **Firebase Cloud Messaging Admin**

2. **Cloud Messaging API đã enable chưa?**
   - Firebase Console → Project Settings → Cloud Messaging
   - Phải thấy "Cloud Messaging API (Legacy)" enabled

3. **Token có hợp lệ không?**
   ```sql
   SELECT * FROM "DeviceTokens" WHERE platform = 'web';
   ```
   - Xem token có trong database không
   - Thử xóa và lấy lại

---

**Chúc bạn fix thành công! 🚀**
