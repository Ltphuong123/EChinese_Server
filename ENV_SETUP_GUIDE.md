# 🔧 Hướng Dẫn Cấu Hình .env

## 📋 Tổng Quan

File `.env` chứa các biến môi trường cần thiết cho ứng dụng. File này **KHÔNG** được commit lên Git.

---

## 🚀 Quick Start

### 1. Copy File Mẫu

```bash
cp .env.example .env
```

### 2. Cập Nhật Các Giá Trị

Mở file `.env` và cập nhật các giá trị theo môi trường của bạn.

---

## 📝 Chi Tiết Các Biến

### 1. DATABASE CONFIGURATION (BẮT BUỘC)

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=echinese_db
DB_SSL=false
```

**Lấy từ đâu:**
- Local: Cài PostgreSQL và tạo database
- Cloud: Render.com, Supabase, AWS RDS, etc.

**Lưu ý:**
- `DB_SSL=true` nếu dùng cloud database
- `DB_SSL=false` nếu dùng local

---

### 2. JWT CONFIGURATION (BẮT BUỘC)

```env
JWT_SECRET=your_jwt_secret_key_here_minimum_32_characters
JWT_EXPIRATION=10d
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here_minimum_32_characters
JWT_REFRESH_EXPIRATION=70d
```

**Tạo JWT Secret:**

```bash
# Option 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: OpenSSL
openssl rand -hex 32

# Option 3: Online
# https://randomkeygen.com/
```

**Lưu ý:**
- JWT_SECRET và JWT_REFRESH_SECRET phải khác nhau
- Tối thiểu 32 ký tự
- Không chia sẻ với ai

---

### 3. FIREBASE CONFIGURATION (BẮT BUỘC - Push Notifications)

#### Option 1: Service Account File (Khuyến Nghị)

```env
FIREBASE_SERVICE_ACCOUNT_PATH=config/firebase-service-account.json
```

**Cách lấy:**
1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project
3. Settings → Service Accounts
4. Generate New Private Key
5. Download file JSON
6. Đổi tên thành `firebase-service-account.json`
7. Copy vào folder `config/`

#### Option 2: Environment Variables

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key\n-----END PRIVATE KEY-----\n"
```

**Lấy từ file JSON:**
- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY`

---

### 4. AWS S3 CONFIGURATION (TÙY CHỌN - File Upload)

```env
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
S3_BUCKET_NAME=your-bucket-name
```

**Cách lấy:**
1. Vào [AWS Console](https://console.aws.amazon.com/)
2. IAM → Users → Create User
3. Attach policy: `AmazonS3FullAccess`
4. Security Credentials → Create Access Key
5. Copy Access Key ID và Secret Access Key
6. S3 → Create Bucket → Copy bucket name

**Lưu ý:**
- Nếu không dùng S3, có thể bỏ qua
- Hoặc dùng Cloudinary, DigitalOcean Spaces thay thế

---

### 5. AI SERVICES CONFIGURATION (TÙY CHỌN)

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
HF_TOKEN=your_huggingface_token
```

**Gemini API Key:**
1. Vào [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API Key
3. Copy key

**Hugging Face Token:**
1. Vào [Hugging Face](https://huggingface.co/settings/tokens)
2. Create New Token
3. Copy token

**Lưu ý:**
- Nếu không dùng AI moderation, có thể bỏ qua
- Gemini có free tier

---

### 6. BANK CONFIGURATION (TÙY CHỌN - Payment)

```env
BANK_ACCOUNT_NUMBER=0123456789
BANK_NAME=Vietcombank
BANK_ACCOUNT_NAME=NGUYEN VAN A
```

**Lưu ý:**
- Dùng cho hiển thị thông tin chuyển khoản
- Không phải payment gateway

---

### 7. SUBSCRIPTION CONFIGURATION

```env
FREE_PLAN_ID=cc8ee1e7-3ce7-4b60-9ea3-d8e840823514
```

**Lấy từ database:**
```sql
SELECT id FROM "SubscriptionPlans" WHERE name = 'Free';
```

---

## ✅ Checklist Cấu Hình

### Minimum (Để chạy được app):
- [x] Database (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
- [x] JWT (JWT_SECRET, JWT_REFRESH_SECRET)
- [x] Firebase (FIREBASE_SERVICE_ACCOUNT_PATH hoặc credentials)
- [x] PORT

### Recommended (Đầy đủ tính năng):
- [x] AWS S3 (để upload files)
- [x] AI Services (để auto moderation)
- [x] Bank Info (để hiển thị payment)

### Optional (Có thể thêm sau):
- [ ] Email (để gửi email)
- [ ] Redis (để caching)
- [ ] CORS (để config frontend)

---

## 🧪 Test Cấu Hình

### Test Database Connection

```bash
node -e "require('./config/db').query('SELECT NOW()').then(r => console.log('✅ DB OK:', r.rows[0])).catch(e => console.error('❌ DB Error:', e.message))"
```

### Test Firebase Connection

```bash
node -e "require('./config/firebase').getMessaging().then(() => console.log('✅ Firebase OK')).catch(e => console.error('❌ Firebase Error:', e.message))"
```

### Test JWT

```bash
node -e "const jwt = require('jsonwebtoken'); const token = jwt.sign({test: true}, process.env.JWT_SECRET); console.log('✅ JWT OK:', jwt.verify(token, process.env.JWT_SECRET))"
```

---

## 🔒 Security Best Practices

### 1. Không Commit .env

Đảm bảo `.env` có trong `.gitignore`:

```bash
# .gitignore
.env
.env.local
.env.*.local
```

### 2. Sử Dụng .env.example

Commit `.env.example` với giá trị mẫu (không có giá trị thật).

### 3. Rotate Keys Định Kỳ

- JWT Secret: 6 tháng/lần
- API Keys: 3 tháng/lần
- Database Password: 1 năm/lần

### 4. Sử Dụng Secrets Manager (Production)

- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault

---

## 🌍 Environment-Specific Config

### Development (.env.development)

```env
NODE_ENV=development
DB_HOST=localhost
DB_SSL=false
LOG_LEVEL=debug
```

### Production (.env.production)

```env
NODE_ENV=production
DB_HOST=your-production-db.com
DB_SSL=true
LOG_LEVEL=error
```

### Load Environment

```javascript
// app.js
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`
});
```

---

## 🆘 Troubleshooting

### Lỗi: "Cannot find module 'dotenv'"

```bash
npm install dotenv
```

### Lỗi: "DB connection failed"

- Kiểm tra DB_HOST, DB_PORT
- Kiểm tra DB_USER, DB_PASSWORD
- Kiểm tra DB_NAME có tồn tại
- Kiểm tra DB_SSL (true/false)

### Lỗi: "Firebase initialization failed"

- Kiểm tra FIREBASE_SERVICE_ACCOUNT_PATH
- Kiểm tra file JSON có tồn tại
- Kiểm tra format JSON đúng

### Lỗi: "JWT malformed"

- Kiểm tra JWT_SECRET có giá trị
- Kiểm tra JWT_SECRET đủ dài (>= 32 chars)
- Restart server sau khi thay đổi

---

## 📚 Resources

- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [AWS S3 Setup](https://docs.aws.amazon.com/AmazonS3/latest/userguide/GetStartedWithS3.html)
- [PostgreSQL Connection](https://node-postgres.com/features/connecting)

---

**Last Updated:** 2025-01-18
