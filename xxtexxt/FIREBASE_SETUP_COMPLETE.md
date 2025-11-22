# 🔥 Hướng Dẫn Setup Firebase Đầy Đủ

## 📋 Thông Tin Hiện Tại

Bạn có **Server Key/Web API Key**:
```
BJlW0fZ8fxWt8fiJImLGrcx6YtaGscO84g-vq3jAPnEE1je1JZeeyKmgUv03XRNTNdaVy9SQzL-bkVZLKbETywo
```

⚠️ **Lưu ý:** Key này có thể là:
- **Server Key** (Legacy FCM)
- **Web Push Certificate** (VAPID Key)
- **Web API Key**

Để sử dụng Firebase Admin SDK (backend), bạn cần **Service Account JSON**.

---

## 🎯 Cách Lấy Service Account JSON (Khuyến Nghị)

### Bước 1: Vào Firebase Console

1. Truy cập: https://console.firebase.google.com/
2. Chọn project của bạn
3. Click vào ⚙️ (Settings) → **Project Settings**

### Bước 2: Vào Service Accounts

1. Click tab **Service Accounts**
2. Chọn **Firebase Admin SDK**
3. Click **Generate New Private Key**
4. Click **Generate Key** để download file JSON

### Bước 3: Lưu File JSON

File JSON sẽ có dạng:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

**Lưu file này:**
1. Đổi tên thành `firebase-service-account.json`
2. Copy vào folder `config/`
3. Đảm bảo file này có trong `.gitignore`

### Bước 4: Cấu Hình .env

```env
FIREBASE_SERVICE_ACCOUNT_PATH=config/firebase-service-account.json
```

---

## 🔑 Cách Lấy Các Thông Tin Khác

### 1. Server Key (Legacy FCM)

**Vị trí:** Project Settings → Cloud Messaging → **Server Key**

⚠️ **Deprecated:** Google khuyến nghị dùng Service Account thay vì Server Key.

### 2. Web API Key

**Vị trí:** Project Settings → General → **Web API Key**

Dùng cho: Frontend authentication

### 3. VAPID Key (Web Push Certificate)

**Vị trí:** Project Settings → Cloud Messaging → **Web Push certificates**

Dùng cho: Web push notifications (frontend)

---

## 📝 Cấu Hình Đầy Đủ

### Option 1: Service Account File (✅ Khuyến Nghị)

```env
FIREBASE_SERVICE_ACCOUNT_PATH=config/firebase-service-account.json
```

**Ưu điểm:**
- ✅ Bảo mật cao
- ✅ Đầy đủ permissions
- ✅ Dễ quản lý
- ✅ Không bị deprecated

**File structure:**
```
project/
├── config/
│   └── firebase-service-account.json  ← File JSON ở đây
├── .env
└── .gitignore  ← Phải có config/*.json
```

### Option 2: Environment Variables

Nếu không muốn dùng file JSON (ví dụ: deploy lên Heroku, Vercel):

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
```

**Lấy từ file JSON:**
- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY`

⚠️ **Lưu ý:** Private key phải giữ nguyên format với `\n`

### Option 3: Server Key (Legacy - Không khuyến nghị)

```env
FIREBASE_SERVER_KEY=BJlW0fZ8fxWt8fiJImLGrcx6YtaGscO84g-vq3jAPnEE1je1JZeeyKmgUv03XRNTNdaVy9SQzL-bkVZLKbETywo
```

⚠️ **Deprecated:** Sẽ không hoạt động với Firebase Admin SDK mới.

---

## 🔧 Update Code (Nếu Dùng Server Key)

Nếu bạn muốn dùng Server Key tạm thời, cần update code:

### File: `services/fcmService.js`

Thêm method gửi bằng HTTP API:

```javascript
const axios = require('axios');

const sendWithServerKey = async (tokens, payload) => {
  const serverKey = process.env.FIREBASE_SERVER_KEY;
  
  if (!serverKey) {
    throw new Error('FIREBASE_SERVER_KEY not configured');
  }

  const message = {
    registration_ids: tokens,
    notification: {
      title: payload.title,
      body: payload.body
    },
    data: payload.data
  };

  const response = await axios.post(
    'https://fcm.googleapis.com/fcm/send',
    message,
    {
      headers: {
        'Authorization': `key=${serverKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};
```

⚠️ **Không khuyến nghị:** Nên dùng Service Account thay vì Server Key.

---

## ✅ Checklist Setup

### Minimum (Để chạy được):
- [ ] Lấy Service Account JSON từ Firebase Console
- [ ] Lưu file vào `config/firebase-service-account.json`
- [ ] Thêm vào .env: `FIREBASE_SERVICE_ACCOUNT_PATH=config/firebase-service-account.json`
- [ ] Thêm `config/*.json` vào `.gitignore`
- [ ] Test: `node -e "require('./config/firebase').getMessaging()"`

### Recommended (Đầy đủ):
- [ ] Lấy Web API Key (cho frontend)
- [ ] Lấy VAPID Key (cho web push)
- [ ] Setup Firebase Cloud Messaging
- [ ] Test gửi notification

---

## 🧪 Test Firebase Connection

### Test 1: Check Firebase Initialized

```bash
node -e "const firebase = require('./config/firebase'); firebase.getMessaging().then(() => console.log('✅ Firebase OK')).catch(e => console.error('❌ Error:', e.message))"
```

### Test 2: Send Test Notification

```javascript
// test-firebase.js
const { getMessaging } = require('./config/firebase');

async function testSendNotification() {
  const messaging = getMessaging();
  
  const message = {
    notification: {
      title: 'Test Notification',
      body: 'This is a test from backend'
    },
    token: 'DEVICE_FCM_TOKEN_HERE'
  };

  try {
    const response = await messaging.send(message);
    console.log('✅ Notification sent:', response);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSendNotification();
```

Run:
```bash
node test-firebase.js
```

---

## 🔒 Security Best Practices

### 1. Không Commit Credentials

**.gitignore:**
```
# Firebase
config/firebase-service-account.json
config/*.json

# Environment
.env
.env.local
.env.*.local
```

### 2. Rotate Keys Định Kỳ

- Service Account: 6 tháng/lần
- Server Key: 3 tháng/lần (nếu dùng)

### 3. Giới Hạn Permissions

Trong Firebase Console:
- IAM & Admin → Service Accounts
- Chỉ cấp permissions cần thiết

### 4. Monitor Usage

- Firebase Console → Usage & Billing
- Set up alerts cho unusual activity

---

## 🆘 Troubleshooting

### Lỗi: "Firebase app not initialized"

**Nguyên nhân:** Thiếu Service Account hoặc config sai

**Giải pháp:**
1. Kiểm tra file JSON có tồn tại
2. Kiểm tra path trong .env đúng
3. Kiểm tra format JSON hợp lệ

### Lỗi: "Invalid credentials"

**Nguyên nhân:** Service Account không đúng hoặc hết hạn

**Giải pháp:**
1. Generate new private key
2. Update file JSON
3. Restart server

### Lỗi: "Messaging not enabled"

**Nguyên nhân:** Firebase Cloud Messaging chưa enable

**Giải pháp:**
1. Vào Firebase Console
2. Build → Cloud Messaging
3. Enable service

---

## 📚 Resources

- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [FCM Server Setup](https://firebase.google.com/docs/cloud-messaging/server)
- [Service Account Keys](https://cloud.google.com/iam/docs/creating-managing-service-account-keys)
- [Migration from Legacy FCM](https://firebase.google.com/docs/cloud-messaging/migrate-v1)

---

## 🎯 Next Steps

1. **Lấy Service Account JSON:**
   - Vào Firebase Console
   - Download file JSON
   - Lưu vào `config/`

2. **Update .env:**
   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=config/firebase-service-account.json
   ```

3. **Test:**
   ```bash
   npm run dev
   ```

4. **Verify:**
   - Test gửi notification
   - Check logs
   - Monitor Firebase Console

---

**Status:** ⚠️ Cần Service Account JSON  
**Priority:** 🔴 High  
**Updated:** 2025-01-18
