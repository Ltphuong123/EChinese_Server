// file: routes/examRoutes.js

const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const authMiddleware = require('../middlewares/authMiddleware');


router.get(
  '/exams',
  authMiddleware.verifyToken,
  examController.getPublishedExams
);

// Lấy thông tin chi tiết (không có câu hỏi) của một bài thi
router.get(
  '/exams/:id/details',
  authMiddleware.verifyToken,
  examController.getExamPublicDetails
);

// Lấy toàn bộ nội dung bài thi để bắt đầu làm
router.get(
  '/exams/:id/do',
  authMiddleware.verifyToken,
  examController.getExamContentForDoing
);

router.get(
  '/exams/:id/leaderboard',
  authMiddleware.verifyToken, 
  examController.getExamLeaderboard
);



//admin
router.post(
  '/admin/exams',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examController.createExamAdmin
);

router.get(
  '/admin/exams',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examController.getExamsAdmin
);

router.get(
  '/admin/exams/:id',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examController.getExamDetailsAdmin
);

router.put(
  '/admin/exams/:id',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examController.updateExamAdmin
);

router.delete(
  '/admin/exams/:id',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examController.softDeleteExamAdmin
);

router.post(
  '/admin/exams/:id/restore',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examController.restoreExamAdmin
);

router.delete(
  '/admin/exams/:id/force',
  [authMiddleware.verifyToken, authMiddleware.isAdmin], // Chỉ Super Admin mới có quyền này
  examController.forceDeleteExamAdmin
);

router.post(
  '/admin/exams/:examIdToCopy/duplicate',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examController.duplicateExamAdmin
);


module.exports = router;