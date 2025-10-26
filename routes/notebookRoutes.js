const express = require('express');
const router = express.Router();
const notebookController = require('../controllers/notebookController');
const authMiddleware = require('../middlewares/authMiddleware');

//user
router.post(
  '/notebooks',
  authMiddleware.verifyToken, 
  notebookController.createUserNotebook
);

router.get(
    '/notebooks/list',
    authMiddleware.verifyToken,
    notebookController.getNotebooksUser
);
router.post(
    '/notebooks/:notebookId/vocabularies',
    authMiddleware.verifyToken,
    notebookController.addVocabulariesToNotebookUser
);

router.get(
    '/notebooks/:id/vocab',
    authMiddleware.verifyToken,
    notebookController.getVocabInNotebook
);
router.delete(
    '/notebooks/:id/vocab/:vocabId',
    authMiddleware.verifyToken,
    notebookController.removeVocabFromNotebook
);
router.put(
    '/notebooks/:id/vocab/:vocabId/status',
    authMiddleware.verifyToken,
    notebookController.updateVocabStatus
);
router.delete(
    '/notebooks/:id',
    authMiddleware.verifyToken,
    notebookController.deleteUserNotebook
);

router.put('/notebooks/:notebookId',authMiddleware.verifyToken, notebookController.updateNotebookUser);

router.delete('/notebooks/:notebookId/vocabularies',authMiddleware.verifyToken, notebookController.removeVocabulariesFromNotebookUser);

router.get('/notebooks/:notebookId',authMiddleware.verifyToken, notebookController.getNotebookDetails);

//admin

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

router.post(
  '/admin/notebooks',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  notebookController.createNotebookAdmin
);

router.put(
    '/admin/notebooks/:id',
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    notebookController.updateNotebookAdmin
);

router.post(
  '/admin/notebooks/:notebookId/vocabularies',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  notebookController.addVocabulariesToNotebookAdmin
);

router.delete(
  '/admin/notebooks/:notebookId/vocabularies',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  notebookController.removeVocabulariesFromNotebookAdmin
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



module.exports = router;
