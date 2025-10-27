// file: routes/badgeLevelRoutes.js

const express = require('express');
const router = express.Router();
const badgeLevelController = require('../controllers/badgeLevelController');
const authMiddleware = require('../middlewares/authMiddleware');

// POST /api/admin/settings/badges
router.post(
  '/admin/settings/badges',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  badgeLevelController.createBadgeLevelAdmin
);

router.get(
  '/admin/settings/badges',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  badgeLevelController.getAllBadgeLevelsAdmin
);

// PUT /api/admin/settings/badges/:id
router.put(
  '/admin/settings/badges/:id',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  badgeLevelController.updateBadgeLevelAdmin
);

// DELETE /api/admin/settings/badges/:id
router.delete(
  '/admin/settings/badges/:id',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  badgeLevelController.deleteBadgeLevelAdmin
);

// POST /api/admin/settings/badges/resync
router.post(
  '/admin/settings/badges/resync',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  badgeLevelController.resyncUserBadgesAdmin
);

module.exports = router;
