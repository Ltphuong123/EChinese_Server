// file: routes/attemptRoutes.js

const express = require('express');
const router = express.Router();
const attemptController = require('../controllers/attemptController');
const authMiddleware = require('../middlewares/authMiddleware');

// Áp dụng middleware xác thực cho tất cả các route này
router.use(authMiddleware.verifyToken);

// Bắt đầu một lượt làm bài mới
router.post('/exams/:id/attempts', attemptController.startNewAttempt);

// Lưu một câu trả lời
router.post('/attempts/:attemptId/answers', attemptController.saveUserAnswer);

// Nộp bài
router.post('/attempts/:attemptId/submit', attemptController.submitAttempt);

// Xem kết quả
router.get('/attempts/:attemptId/results', attemptController.getAttemptResults);

module.exports = router;