// file: routes/examLevelRoutes.js

const express = require('express');
const router = express.Router();
const examLevelController = require('../controllers/examLevelController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post(
  '/admin/exams/levels',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examLevelController.createExamLevelAdmin
);

router.get(
  '/admin/exams/levels',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examLevelController.getAllExamLevelsAdmin
);

router.delete(
  '/admin/exams/levels/:id',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examLevelController.deleteExamLevelAdmin
);

module.exports = router;