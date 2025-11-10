// file: middlewares/rateLimitMiddleware.js

const rateLimit = require('express-rate-limit');

// Cấu hình chung cho hầu hết các API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 200, // Giới hạn mỗi IP chỉ được 200 requests trong 15 phút
  standardHeaders: true, // Trả về thông tin rate limit trong header `RateLimit-*`
  legacyHeaders: false, // Tắt các header cũ `X-RateLimit-*`
  message: { success: false, message: 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau 15 phút.' },
});

// Cấu hình nghiêm ngặt hơn cho các API nhạy cảm (đăng nhập, đăng ký)
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 phút
  max: 10, // Giới hạn mỗi IP chỉ được 10 requests trong 10 phút
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 10 phút.' },
});

// Cấu hình cho các API "nặng" (ví dụ: tạo AI lesson)
const heavyApiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 giờ
    max: 50, // Giới hạn mỗi IP chỉ được 50 request trong 1 giờ
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Bạn đã đạt đến giới hạn sử dụng tính năng này. Vui lòng thử lại sau.' },
});


module.exports = {
  generalLimiter,
  authLimiter,
  heavyApiLimiter
};