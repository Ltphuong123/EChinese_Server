# Hướng dẫn cấu hình biến môi trường

## Các bước thiết lập

1. **Sao chép file `.env.example` thành `.env`**
   ```bash
   cp .env.example .env
   ```

2. **Cập nhật các giá trị trong file `.env`**

## Danh sách biến môi trường

### Database Configuration
- `DB_HOST`: Địa chỉ host của database (mặc định: localhost)
- `DB_PORT`: Port của database (mặc định: 5432)
- `DB_USER`: Username để kết nối database
- `DB_PASSWORD`: Password để kết nối database
- `DB_NAME`: Tên database
- `DB_SSL`: Bật SSL cho kết nối database (true/false)

### JWT Configuration
- `JWT_SECRET`: Secret key để mã hóa JWT token
- `JWT_EXPIRATION`: Thời gian hết hạn của access token (ví dụ: 1h, 15m)
- `JWT_REFRESH_SECRET`: Secret key để mã hóa refresh token
- `JWT_REFRESH_EXPIRATION`: Thời gian hết hạn của refresh token (ví dụ: 7d, 30d)

### Bank Configuration
- `BANK_ACCOUNT_NUMBER`: Số tài khoản ngân hàng
- `BANK_NAME`: Tên ngân hàng
- `BANK_ACCOUNT_NAME`: Tên chủ tài khoản

### AI Services Configuration
- `GEMINI_API_KEY`: API key của Google Gemini AI
- `GEMINI_MODEL`: Model Gemini sử dụng (mặc định: gemini-2.0-flash)
- `HF_TOKEN`: Token của Hugging Face

### AI Moderation API URLs
- `TEXT_MODERATION_API_URL`: URL API kiểm duyệt văn bản
- `IMAGE_MODERATION_API_URL`: URL API kiểm duyệt hình ảnh

### Subscription Plan IDs
- `FREE_PLAN_ID`: ID của gói miễn phí trong database

### Server Configuration
- `PORT`: Port để chạy server (mặc định: 5000)

### AWS S3 Configuration (Tùy chọn - cho production)
- `AWS_REGION`: Region của AWS S3 (ví dụ: ap-southeast-1)
- `AWS_ACCESS_KEY_ID`: Access Key ID của AWS
- `AWS_SECRET_ACCESS_KEY`: Secret Access Key của AWS
- `S3_BUCKET_NAME`: Tên bucket S3
- `STORAGE_TYPE`: Loại lưu trữ (local hoặc s3)

## Lưu ý bảo mật

⚠️ **QUAN TRỌNG**: 
- Không bao giờ commit file `.env` lên Git
- File `.env` đã được thêm vào `.gitignore`
- Chỉ chia sẻ file `.env.example` với team
- Mỗi môi trường (dev, staging, production) nên có file `.env` riêng với các giá trị khác nhau
