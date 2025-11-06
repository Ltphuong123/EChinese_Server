// file: routes/questionTypeRoutes.js

const express = require("express");
const router = express.Router();
const questionTypeController = require("../controllers/questionTypeController");
const authMiddleware = require("../middlewares/authMiddleware");

// POST /api/admin/exams/question-types
router.post(
  `/admin/exams/question-types`,
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  questionTypeController.createQuestionTypeAdmin
);

// GET /api/admin/exams/question-types
router.get(
  `/admin/exam/question-types`,
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  questionTypeController.getAllQuestionTypesAdmin
);

// GET /api/admin/exams/question-types/:id
router.get(
  `/admin/exams/question-types/:id`,
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  questionTypeController.getQuestionTypeByIdAdmin
);

// PUT /api/admin/exams/question-types/:id
router.put(
  `/admin/exams/question-types/:id`,
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  questionTypeController.updateQuestionTypeAdmin
);

// DELETE /api/admin/exams/question-types/:id
router.delete(
  `/admin/exams/question-types/:id`,
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  questionTypeController.deleteQuestionTypeAdmin
);

module.exports = router;
