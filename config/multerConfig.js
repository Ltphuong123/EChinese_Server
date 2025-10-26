// config/multerConfig.js

const multer = require('multer');
const path = require('path');

// --- TÙY CHỌN 1: LƯU TRỮ CỤC BỘ (LOCAL STORAGE) ---
// Tốt cho môi trường development

const storage = multer.diskStorage({
  // Nơi lưu file sau khi upload
  destination: (req, file, cb) => {
    // __dirname là thư mục hiện tại (config). '../uploads/' là thư mục gốc của dự án
    // Đảm bảo bạn đã tạo thư mục 'uploads' ở thư mục gốc của dự án
    cb(null, path.join(__dirname, '../uploads/')); 
  },
  // Đặt lại tên file để tránh trùng lặp
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname); // Lấy đuôi file
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
  }
});

// Hàm kiểm tra loại file
const fileFilter = (req, file, cb) => {
  // Chỉ chấp nhận file audio và image
  if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Loại file không hợp lệ! Chỉ chấp nhận file audio và hình ảnh.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 20 // Giới hạn kích thước file: 20MB
  },
  fileFilter: fileFilter
});


// --- TÙY CHỌN 2: LƯU TRỮ TRÊN AMAZON S3 (Dành cho Production) ---
/*
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
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const fileExtension = path.extname(file.originalname);
            cb(null, 'media/' + uniqueSuffix + fileExtension); // File sẽ được lưu trong thư mục 'media'
        }
    }),
    limits: { fileSize: 1024 * 1024 * 20 }, // 20MB
    fileFilter: fileFilter
});

// Khi dùng S3, bạn sẽ export uploadS3 thay vì upload
// module.exports = uploadS3;
*/


// Export cấu hình lưu trữ cục bộ
module.exports = upload;