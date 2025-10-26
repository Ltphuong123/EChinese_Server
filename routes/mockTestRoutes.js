const express = require('express');
const router = express.Router();
const mockTestController = require('../controllers/mockTestController');
const authMiddleware = require('../middlewares/authMiddleware');

//user
router.get(
  '/mock-tests/:testId/details',
  authMiddleware.verifyToken,
  mockTestController.getTestDetailsForUser
);
router.get(
    '/mock-tests', 
    authMiddleware.verifyToken,
    mockTestController.getActiveTestsForUser
);
router.get(
    '/mock-tests/:testId', 
    authMiddleware.verifyToken,
    mockTestController.getTestById
);
// Bắt đầu một lượt làm bài mới
router.post(
  '/mock-tests/:testId/start-attempt',
  authMiddleware.verifyToken,
  mockTestController.startTestAttempt
);


//admin
router.post(
  '/admin/mock-tests',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  mockTestController.createTest
);
router.post(
  '/admin/mock-tests/:testId/sections',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  mockTestController.createSection
);
router.post(
  '/admin/mock-tests/sections/:sectionId/questions',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  mockTestController.createQuestion
);
router.post(
    '/admin/mock-tests/full', 
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    mockTestController.createFullTest
);

router.get(
    '/admin/mock-tests', 
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    mockTestController.getAllTests
);

router.put(
    '/admin/mock-tests/:testId', 
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    mockTestController.updateTest
);
router.put(
    '/admin/mock-tests/sections/:sectionId', 
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    mockTestController.updateSection
);
router.put(
    '/admin/mock-tests/questions/:questionId', 
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    mockTestController.updateQuestion
);

router.delete(
    '/admin/mock-tests/:testId', 
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    mockTestController.deleteTest
);
router.delete(
    '/admin/mock-tests/sections/:sectionId', 
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    mockTestController.deleteSection
);
router.delete(
    '/admin/mock-tests/questions/:questionId', 
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    mockTestController.deleteQuestion
);






module.exports = router;