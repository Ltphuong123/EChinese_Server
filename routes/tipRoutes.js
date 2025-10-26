const express = require('express');
const router = express.Router();
const tipController = require('../controllers/tipController');
const authMiddleware = require('../middlewares/authMiddleware');


router.post(
  '/admin/tips',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  tipController.createTipAdmin
);

router.get(
  '/admin/tips',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  tipController.getTipsAdmin
);

router.get(
  '/admin/tips/:id',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  tipController.getTipByIdAdmin
);

router.put(
  '/admin/tips/:id',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  tipController.updateTipAdmin
);

router.delete(
  '/admin/tips/:id',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  tipController.deleteTipAdmin
);

router.post(
  '/admin/tips/bulk-upload',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  tipController.bulkUploadTipsAdmin
);




module.exports = router;