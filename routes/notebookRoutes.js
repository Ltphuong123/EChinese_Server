const express = require('express');
const router = express.Router();
const notebookController = require('../controllers/notebookController');
const authMiddleware = require('../middlewares/authMiddleware');






router.post(
  '/notebooks', 
  authMiddleware.verifyToken,
  notebookController.createNotebook
);


//user
router.get(
  '/notebooks/my',
  authMiddleware.verifyToken,
  notebookController.getMyNotebooks
);

// 2. Lấy danh sách sổ tay hệ thống (dành cho user xem)
router.get(
  '/notebooks/system',
  authMiddleware.verifyToken,
  notebookController.getSystemNotebooksForUser
);


// === CÁC API MỚI CHO ADMIN ===

// 3. Lấy toàn bộ sổ tay hệ thống (dành cho admin quản lý)
router.get(
  '/admin/notebooks/system',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  notebookController.getSystemNotebooksForAdmin
);

// 4. Lấy toàn bộ sổ tay trong DB (cả của user và hệ thống)
router.get(
  '/admin/notebooks',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  notebookController.getAllNotebooksAdmin
);

router.get(
  '/notebooks/:id',
  authMiddleware.verifyToken,
  notebookController.getNotebookDetails
);




router.post(
    '/notebooks/:notebookId/vocabularies',
    authMiddleware.verifyToken,
    notebookController.addVocabulariesToNotebookUser
);


router.post(
  '/admin/notebooks/:notebookId/vocabularies',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  notebookController.addVocabulariesToNotebookAdmin
);




router.delete('/notebooks/:notebookId/vocabularies',
  authMiddleware.verifyToken, 
  notebookController.removeVocabulariesFromNotebookUser);

router.delete(
  '/admin/notebooks/:notebookId/vocabularies',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  notebookController.removeVocabulariesFromNotebookAdmin
);







router.delete(
  '/notebooks/:id/vocabularies/:vocabId',
    authMiddleware.verifyToken,
    notebookController.removeVocabFromNotebook
);
router.get(
    '/notebooks/:id/vocab',
    authMiddleware.verifyToken,
    notebookController.getVocabInNotebook
);


router.put(
  '/notebooks/:notebookId/vocabularies/:vocabId/status',
  authMiddleware.verifyToken,
  notebookController.updateVocabStatusInNotebook
);
router.delete(
    '/notebooks/:id',
    authMiddleware.verifyToken,
    notebookController.deleteUserNotebook
);


router.put(
  '/notebooks/:id',
  authMiddleware.verifyToken,
  notebookController.updateNotebook
);



// === CÁC API MỚI CHO ADMIN ===

// 3. Lấy toàn bộ sổ tay hệ thống (dành cho admin quản lý)
router.get(
  '/admin/notebooks/system',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  notebookController.getSystemNotebooksForAdmin
);

// 4. Lấy toàn bộ sổ tay trong DB (cả của user và hệ thống)
router.get(
  '/admin/notebooks',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  notebookController.getAllNotebooksAdmin
);


router.get(
  '/admin/notebooks',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  notebookController.getNotebooksAdmin
);

router.get(
  '/admin/notebooks/:id',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  notebookController.getNotebookByIdAdmin
);



router.put(
    '/admin/notebooks/:id',
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    notebookController.updateNotebookAdmin
);


router.post(
  '/admin/notebooks/bulk-status',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  notebookController.bulkUpdateNotebookStatusAdmin
);

router.post(
  '/admin/notebooks/bulk-delete',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  notebookController.bulkDeleteNotebooksAdmin
);

router.post(
  '/notebooks/:notebookId/vocabularies-by-level',
  authMiddleware.verifyToken,
  notebookController.addVocabulariesByLevelToNotebook
);




module.exports = router;
