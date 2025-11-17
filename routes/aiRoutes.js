// file: routes/aiRoutes.js
const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const authMiddleware = require("../middlewares/authMiddleware");

// Optionally protect with auth to mitigate abuse; keep easy to switch
router.post(
  "/ai/generate-lesson",
  authMiddleware.verifyToken,
  aiController.generateLesson
);
router.get(
  "/ai/lessons",
  authMiddleware.verifyToken,
  aiController.getMyLessons
);
router.get(
  "/ai/lessons/:lessonId",
  authMiddleware.verifyToken,
  aiController.getLessonDetail
);
router.delete(
  "/ai/lessons/:lessonId",
  authMiddleware.verifyToken,
  aiController.deleteLesson
);
router.post(
  "/ai/translate",
  authMiddleware.verifyToken,
  aiController.translate
);
router.post(
  "/ai/translate-with-examples",
  authMiddleware.verifyToken,
  aiController.translateWithExamples
);
router.get(
  "/ai/translations",
  authMiddleware.verifyToken,
  aiController.getMyTranslations
);
router.get(
  "/ai/translations/today-count",
  authMiddleware.verifyToken,
  aiController.getTodayTranslationCount
);
router.get(
  "/ai/translations/stats",
  authMiddleware.verifyToken,
  aiController.getTranslationStats
);
router.delete(
  "/ai/translations/:translationId",
  authMiddleware.verifyToken,
  aiController.deleteMyTranslation
);
router.delete(
  "/ai/translations",
  authMiddleware.verifyToken,
  aiController.clearMyTranslations
);

module.exports = router;
