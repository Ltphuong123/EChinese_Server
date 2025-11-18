

// file: routes/examRoutes.js

const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const authMiddleware = require('../middlewares/authMiddleware');


router.get(
  '/exams',
  authMiddleware.verifyToken,
  examController.getPublishedExamsForUser
);

// Lấy thông tin chi tiết (không có câu hỏi) của một bài thi
router.get(

  '/exams/:id/details',
  authMiddleware.verifyToken, // Yêu cầu đăng nhập để xem chi tiết và lịch sử
  examController.getExamDetailsForUser
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
  examController.createFullExamAdmin
);

router.get(

  '/admin/exams',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examController.getAllExamsAdmin
);

router.get(

  '/admin/exams/:id',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examController.getExamByIdAdmin
);

router.put(
    '/admin/exams/:id',
    [authMiddleware.verifyToken, authMiddleware.isAdmin],
    examController.updateFullExamAdmin
);

// GET /api/admin/exams/:id/check-attempts - Kiểm tra đề thi đã có người làm chưa
router.get(
  '/admin/exams/:id/check-attempts',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examController.checkExamHasAttempts
);

router.post(
  '/admin/exams/:id/publish',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examController.publishExamAdmin
);

// POST /api/admin/exams/:id/unpublish - Hủy công bố bài thi
router.post(

  '/admin/exams/:id/unpublish',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examController.unpublishExamAdmin
);

router.post(

  '/admin/exams/:id/delete',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examController.softDeleteExamAdmin
);

// POST /api/admin/exams/:id/restore - Khôi phục bài thi
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



