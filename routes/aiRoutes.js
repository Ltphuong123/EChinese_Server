// file: routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middlewares/authMiddleware');

// Optionally protect with auth to mitigate abuse; keep easy to switch
router.post('/ai/generate-lesson', authMiddleware.verifyToken, aiController.generateLesson);
router.get('/ai/lessons', authMiddleware.verifyToken, aiController.getMyLessons);
router.get('/ai/lessons/:lessonId', authMiddleware.verifyToken, aiController.getLessonDetail);
router.delete('/ai/lessons/:lessonId', authMiddleware.verifyToken, aiController.deleteLesson);

module.exports = router;
