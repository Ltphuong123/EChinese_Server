const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const authMiddleware = require('../middlewares/authMiddleware');
const { post } = require('./userRoutes');

// POST /api/admin/settings/achievements
router.post(
  '/admin/settings/achievements',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  achievementController.createAchievementAdmin
);

router.get(
  '/admin/settings/achievements',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  achievementController.getAchievementsAdmin
);

router.get(
  '/admin/settings/achievements/:achievementId/users',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  achievementController.getUsersForAchievementAdmin
);

router.put(
  '/admin/settings/achievements/:id',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  achievementController.updateAchievementAdmin
);

router.delete(
  '/admin/settings/achievements/:id',
  [authMiddleware.verifyToken, authMiddleware.isAdmin],
  achievementController.deleteAchievementAdmin
);



module.exports = router;

