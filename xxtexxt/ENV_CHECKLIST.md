# ✅ Checklist Biến Môi Trường .env

## 📊 Trạng Thái Hiện Tại

### ✅ Đã Có (9/13 biến bắt buộc)

1. ✅ **DB_HOST** - Database host
2. ✅ **DB_PORT** - Database port
3. ✅ **DB_USER** - Database username
4. ✅ **DB_PASSWORD** - Database password
5. ✅ **DB_NAME** - Database name
6. ✅ **DB_SSL** - SSL connection
7. ✅ **JWT_SECRET** - JWT secret key
8. ✅ **JWT_REFRESH_SECRET** - JWT refresh secret
9. ✅ **PORT** - Server port
10. ✅ **FIREBASE_SERVICE_ACCOUNT_PATH** - Firebase config
11. ✅ **GEMINI_API_KEY** - AI moderation
12. ✅ **HF_TOKEN** - Hugging Face token
13. ✅ **FREE_PLAN_ID** - Free subscription plan

### ❌ Còn Thiếu (4/4 biến cho S3)

14. ❌ **AWS_REGION** - AWS region (cần nếu dùng S3)
15. ❌ **AWS_ACCESS_KEY_ID** - AWS access key (cần nếu dùng S3)
16. ❌ **AWS_SECRET_ACCESS_KEY** - AWS secret key (cần nếu dùng S3)
17. ❌ **S3_BUCKET_NAME** - S3 bucket name (cần nếu dùng S3)

---

## 🚨 Cần Làm Ngay

### Option 1: Cấu Hình AWS S3 (Khuyến Nghị)

Nếu bạn muốn upload files (avatar, images, etc.):

```env
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=YOUR_KEY_HERE
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_HERE
S3_BUCKET_NAME=echinese-uploads
```

**Cách lấy:**
1. Vào [AWS Console](https://console.aws.amazon.com/)
2. Tạo IAM User với S3 permissions
3. Tạo Access Key
4. Tạo S3 Bucket
5. Copy thông tin vào .env

### Option 2: Tắt S3 (Tạm Thời)

Nếu chưa cần upload files ngay:

1. Comment code S3 trong `config/multerConfig.js`
2. Dùng local storage thay thế
3. Thêm S3 sau khi cần

---

## 📝 Các Biến Tùy Chọn (Có Thể Thêm Sau)

### Email (Gửi email thông báo)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@echinese.com
```

### Redis (Caching)
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

### Logging
```env
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### CORS
```env
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
```

---

## 🔍 Kiểm Tra File Hiện Tại

### File .env của bạn có:
```
✅ Database config (6 biến)
✅ JWT config (4 biến)
✅ Bank config (3 biến)
✅ AI config (5 biến)
✅ Subscription config (1 biến)
✅ Server config (1 biến)
✅ Firebase config (1 biến)
❌ AWS S3 config (0/4 biến)
```

### Tổng: 21/25 biến

---

## 🎯 Action Items

### Ngay Lập Tức:

1. **Quyết định về S3:**
   - [ ] Có dùng S3 → Thêm 4 biến AWS
   - [ ] Không dùng S3 → Comment code S3

2. **Thêm NODE_ENV:**
   ```env
   NODE_ENV=production
   ```

3. **Backup .env:**
   ```bash
   cp .env .env.backup
   ```

### Trong Tuần:

4. **Setup Email (nếu cần):**
   - [ ] Tạo Gmail App Password
   - [ ] Thêm SMTP config

5. **Setup Redis (nếu cần):**
   - [ ] Cài Redis
   - [ ] Thêm Redis config

### Trong Tháng:

6. **Security Review:**
   - [ ] Rotate JWT secrets
   - [ ] Review API keys
   - [ ] Setup secrets manager

---

## 🧪 Test Commands

### Test Database:
```bash
node -e "require('./config/db').query('SELECT NOW()').then(r => console.log('✅ DB OK')).catch(e => console.error('❌ Error:', e.message))"
```

### Test Firebase:
```bash
node -e "require('./config/firebase').getMessaging().then(() => console.log('✅ Firebase OK')).catch(e => console.error('❌ Error:', e.message))"
```

### Test S3 (sau khi thêm config):
```bash
node -e "const {S3Client} = require('@aws-sdk/client-s3'); new S3Client({region: process.env.AWS_REGION}).send(new (require('@aws-sdk/client-s3').ListBucketsCommand)({})).then(() => console.log('✅ S3 OK')).catch(e => console.error('❌ Error:', e.message))"
```

---

## 📚 Files Đã Tạo

1. ✅ `.env.example` - Template với tất cả biến
2. ✅ `.env.complete` - File đầy đủ dựa trên .env hiện tại
3. ✅ `ENV_SETUP_GUIDE.md` - Hướng dẫn chi tiết
4. ✅ `ENV_CHECKLIST.md` - File này

---

## 🔄 Next Steps

1. **Copy .env.complete thành .env:**
   ```bash
   cp .env.complete .env
   ```

2. **Điền thông tin AWS S3:**
   - Lấy credentials từ AWS Console
   - Update vào .env

3. **Test lại app:**
   ```bash
   npm run dev
   ```

4. **Verify tất cả features:**
   - [ ] Login/Register
   - [ ] Create post
   - [ ] Upload image (nếu có S3)
   - [ ] Push notifications
   - [ ] AI moderation

---

**Status:** ⚠️ Thiếu AWS S3 config  
**Priority:** 🔴 High (nếu cần upload files)  
**Updated:** 2025-01-18
