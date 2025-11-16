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
  '/exams/levels',
  [authMiddleware.verifyToken],
  examLevelController.getAllExamLevels
);

router.delete(
  '/admin/exams/levels/:id',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examLevelController.deleteExamLevelAdmin
);

// Set order for exam levels
router.put(
  '/admin/exams/levels/order',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  examLevelController.setExamLevelsOrder
);

module.exports = router;