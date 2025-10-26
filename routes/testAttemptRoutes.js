// routes/testAttemptRoutes.js

const express = require('express');
const router = express.Router();
const testAttemptController = require('../controllers/testAttemptController');
const authMiddleware = require('../middlewares/authMiddleware');

// Áp dụng middleware xác thực cho tất cả các route
router.use(authMiddleware.verifyToken);

// === GIAI ĐOẠN 2: TRONG LÚC LÀM BÀI ===
// Lưu/cập nhật một câu trả lời
router.post('/test-attempts/:attemptId/answers', testAttemptController.saveAnswer);


// === GIAI ĐOẠN 3: NỘP BÀI VÀ XEM KẾT QUẢ ===
// Nộp bài và chấm điểm
router.post('/test-attempts/:attemptId/submit', testAttemptController.submitAttempt);
// Xem lại kết quả chi tiết
router.get('/test-attempts/:attemptId/result', testAttemptController.getAttemptResult);


// === GIAI ĐOẠN 4: LỊCH SỬ VÀ THỐNG KÊ (trong userRoutes) ===

module.exports = router;