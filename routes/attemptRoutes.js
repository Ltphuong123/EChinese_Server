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


// API Lấy lịch sử làm bài theo exam_type_id + exam_level_id + name
router.get('/attempts/history/by-exam-info', attemptController.getAttemptHistoryByExamInfo);

// API Lấy bảng xếp hạng theo exam_level
router.get('/leaderboard/exam-level/:examLevelId', attemptController.getLeaderboardByExamLevel);

// API Lấy bảng xếp hạng theo exam_type
router.get('/leaderboard/exam-type/:examTypeId', attemptController.getLeaderboardByExamType);


module.exports = router;