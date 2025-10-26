// routes/mediaRoutes.js
const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../config/multerConfig');


router.post(
  '/admin/media/upload',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  mediaController.registerManualMedia
);
router.get(
  '/admin/media',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  mediaController.getAllMedia
);
router.delete(
  '/admin/media/:id',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  mediaController.deleteMedia
);

module.exports = router;