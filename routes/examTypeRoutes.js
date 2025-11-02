// file: routes/examTypeRoutes.js

const express = require('express');
const router = express.Router();
const examTypeController = require('../controllers/examTypeController');
const authMiddleware = require('../middlewares/authMiddleware');

// POST /api/admin/exams/types
// Chỉ admin có quyền tạo Exam Type
router.post(
  '/admin/exams/types',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examTypeController.createExamTypeAdmin
);

router.get(
  '/exams/types',
  [authMiddleware.verifyToken],
  examTypeController.getAllExamTypes
);

// DELETE /api/admin/exams/types/:id
// Xóa một loại bài thi (và các level liên quan)
router.delete(
  '/admin/exams/types/:id',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examTypeController.deleteExamTypeAdmin
);

module.exports = router;