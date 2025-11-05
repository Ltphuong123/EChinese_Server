// file: routes/attemptRoutes.js

const express = require('express');
const router = express.Router();
const attemptController = require('../controllers/attemptController');
const authMiddleware = require('../middlewares/authMiddleware');

// Áp dụng middleware xác thực cho tất cả các route này
router.use(authMiddleware.verifyToken);

// API Bắt đầu làm bài (thuộc về exam, nhưng trả về attempt)
router.post('/exams/:id/start-attempt', authMiddleware.verifyToken, attemptController.startAttempt);

// API Lưu câu trả lời
router.post('/attempts/:attemptId/answers', attemptController.saveAnswers);

// API Nộp bài
router.post('/attempts/:attemptId/submit', attemptController.submitAttempt);

// API Lấy kết quả
router.get('/attempts/:attemptId/result', attemptController.getAttemptResult);

// // Bắt đầu một lượt làm bài mới
// router.post('/exams/:id/start-attempt', authMiddleware.verifyToken, attemptController.startAttempt);
// // Lưu một câu trả lời
// router.post('/attempts/:attemptId/answers', attemptController.saveUserAnswer);

// // Nộp bài
// router.post('/attempts/:attemptId/submit', attemptController.submitAttempt);

// // Xem kết quả
// router.get('/attempts/:attemptId/results', attemptController.getAttemptResults);

module.exports = router;