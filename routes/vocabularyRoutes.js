const express = require('express');
const router = express.Router();
const vocabularyController = require('../controllers/vocabularyController');
const authMiddleware = require('../middlewares/authMiddleware');


//user
router.get(
  '/vocabularies',
  [authMiddleware.verifyToken],
  vocabularyController.getVocabulariesAdmin
);

router.get(
  '/vocabularies/:id',
  authMiddleware.verifyToken,
  vocabularyController.getVocabularyById
);
router.get(
  '/vocabularies/search',
  authMiddleware.verifyToken,
  vocabularyController.searchVocabularies
);


//admin
router.post(
  '/admin/vocabularies/bulk-upsert',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  vocabularyController.createOrUpdateVocabulariesAdmin
);


router.post(
  '/admin/vocabularies/bulk-delete',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  vocabularyController.bulkDeleteVocabulariesAdmin
);


router.delete(
  '/admin/vocabularies/:id',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  vocabularyController.deleteVocabulary
);
router.put(
  '/admin/vocabularies/:id',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  vocabularyController.updateVocabulary
);

router.post('/admin/vocabularies/word-types', vocabularyController.createWordType);

module.exports = router;

// Lấy tất cả: GET /api/admin/vocabularies
// Tìm kiếm: GET /api/admin/vocabularies?search=你好
// Lọc theo level: GET /api/admin/vocabularies?level=HSK2
// Kết hợp và phân trang: GET /api/admin/vocabularies?search=yī&level=HSK1&page=2&limit=50