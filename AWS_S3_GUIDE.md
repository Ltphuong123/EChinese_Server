# Hướng dẫn cấu hình AWS S3

## Tổng quan

Dự án hỗ trợ 2 phương thức lưu trữ file:
1. **Local Storage** (Mặc định) - Lưu file trên server
2. **AWS S3** (Production) - Lưu file trên Amazon S3

## Các file sử dụng cấu hình AWS S3

### 1. `config/env.js`
File tập trung quản lý tất cả biến môi trường, bao gồm cấu hình AWS:
```javascript
aws: {
  region: process.env.AWS_REGION || 'ap-southeast-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  s3BucketName: process.env.S3_BUCKET_NAME || '',
  storageType: process.env.STORAGE_TYPE || 'local'
}
```

### 2. `config/multerConfig.js`
File cấu hình upload file với Multer. Hiện tại đang sử dụng **Local Storage**.

**Để chuyển sang S3:**
- Uncomment phần code S3 (dòng 44-73)
- Comment phần code Local Storage (dòng 7-42)
- Thay đổi export từ `upload` sang `uploadS3`

```javascript
// Phần code S3 cần uncomment:
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const uploadS3 = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME,
        // ... các cấu hình khác
    })
});
```

### 3. `services/mediaService.js`
Service xử lý media, có TODO để xóa file từ S3:
```javascript
if (process.env.STORAGE_TYPE === 's3') {
  await deleteFileFromS3(deletedMedia.s3_path);
} else {
  await deleteFileFromLocal(deletedMedia.s3_path);
}
```

### 4. `controllers/mediaController.js`
Controller xử lý API media, cần thêm logic xóa file vật lý.

### 5. `models/mediaModel.js`
Model lưu thông tin media trong database, có trường `s3_path` để lưu đường dẫn file.

## Cấu hình biến môi trường

Thêm các biến sau vào file `.env`:

```env
# AWS S3 Configuration
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
S3_BUCKET_NAME=your_bucket_name_here
STORAGE_TYPE=s3
```

### Giải thích các biến:

- **AWS_REGION**: Vùng AWS của bạn (ví dụ: ap-southeast-1 cho Singapore)
- **AWS_ACCESS_KEY_ID**: Access Key từ AWS IAM
- **AWS_SECRET_ACCESS_KEY**: Secret Key từ AWS IAM
- **S3_BUCKET_NAME**: Tên bucket S3 đã tạo
- **STORAGE_TYPE**: 
  - `local` - Lưu file trên server (mặc định)
  - `s3` - Lưu file trên AWS S3

## Các bước thiết lập AWS S3

### 1. Tạo AWS Account và IAM User
1. Đăng ký tài khoản AWS tại https://aws.amazon.com
2. Vào IAM Console
3. Tạo User mới với quyền S3 (AmazonS3FullAccess)
4. Lưu lại Access Key ID và Secret Access Key

### 2. Tạo S3 Bucket
1. Vào S3 Console
2. Tạo bucket mới
3. Chọn region phù hợp (ví dụ: ap-southeast-1)
4. Cấu hình CORS nếu cần truy cập từ frontend:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

### 3. Cài đặt dependencies
Dự án đã có sẵn các package cần thiết:
```json
"@aws-sdk/client-s3": "^3.901.0",
"multer-s3": "^3.0.1"
```

### 4. Cập nhật code
1. Cập nhật file `.env` với thông tin AWS
2. Uncomment code S3 trong `config/multerConfig.js`
3. Thay đổi `STORAGE_TYPE=s3` trong `.env`
4. Restart server

## Lưu ý bảo mật

⚠️ **QUAN TRỌNG**:
- Không bao giờ commit AWS credentials lên Git
- Sử dụng IAM User với quyền tối thiểu cần thiết
- Bật versioning cho S3 bucket để backup
- Cấu hình lifecycle policy để tự động xóa file cũ
- Sử dụng CloudFront CDN để tăng tốc độ truy cập

## Chi phí

AWS S3 tính phí theo:
- Dung lượng lưu trữ (GB/tháng)
- Số lượng request (GET, PUT, DELETE)
- Băng thông truyền tải

Tham khảo: https://aws.amazon.com/s3/pricing/

## Môi trường Development vs Production

### Development (Local Storage)
```env
STORAGE_TYPE=local
```
- File lưu trong thư mục `uploads/`
- Không tốn chi phí
- Dễ debug

### Production (AWS S3)
```env
STORAGE_TYPE=s3
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=my-production-bucket
```
- File lưu trên cloud
- Có chi phí
- Scalable và reliable

## TODO - Các tính năng cần hoàn thiện

1. **Xóa file vật lý khi xóa record trong DB**
   - Hiện tại chỉ xóa record trong database
   - Cần implement hàm `deleteFileFromS3()` và `deleteFileFromLocal()`

2. **Upload trực tiếp từ client lên S3**
   - Sử dụng Pre-signed URL để client upload trực tiếp
   - Giảm tải cho server

3. **Image optimization**
   - Resize và compress ảnh trước khi upload
   - Sử dụng AWS Lambda hoặc Sharp

4. **CDN Integration**
   - Tích hợp CloudFront để tăng tốc độ
   - Cache static assets
