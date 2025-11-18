# 🔥 Firebase Setup - Quick Guide

## ⚠️ Key Bạn Cung Cấp

```
BJlW0fZ8fxWt8fiJImLGrcx6YtaGscO84g-vq3jAPnEE1je1JZeeyKmgUv03XRNTNdaVy9SQzL-bkVZLKbETywo
```

**Đây là:** VAPID Key / Web Push Certificate (dùng cho frontend web push)

**Không phải:** Service Account (cần cho backend)

---

## 🚀 Cần Làm Gì?

### Bước 1: Lấy Service Account JSON

1. Vào: https://console.firebase.google.com/
2. Chọn project → ⚙️ Settings → **Service Accounts**
3. Click **Generate New Private Key**
4. Download file JSON

### Bước 2: Lưu File

```bash
# Tạo folder config nếu chưa có
mkdir -p config

# Copy file JSON vào
# Đổi tên thành: firebase-service-account.json
```

### Bước 3: Update .env

```env
FIREBASE_SERVICE_ACCOUNT_PATH=config/firebase-service-account.json
```

### Bước 4: Update .gitignore

```
# .gitignore
config/firebase-service-account.json
config/*.json
```

### Bước 5: Test

```bash
node -e "require('./config/firebase').getMessaging().then(() => console.log('✅ OK')).catch(e => console.error('❌', e.message))"
```

---

## 📝 File JSON Sẽ Có Dạng

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

---

## ✅ Checklist

- [ ] Download Service Account JSON
- [ ] Lưu vào `config/firebase-service-account.json`
- [ ] Update .env
- [ ] Update .gitignore
- [ ] Test connection
- [ ] Restart server

---

## 🆘 Nếu Không Lấy Được File JSON

Có thể dùng environment variables:

1. Mở file JSON
2. Copy các giá trị vào .env:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key\n-----END PRIVATE KEY-----\n"
```

3. Comment dòng `FIREBASE_SERVICE_ACCOUNT_PATH`

---

**Xem chi tiết:** `FIREBASE_SETUP_COMPLETE.md`
