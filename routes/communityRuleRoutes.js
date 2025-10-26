// file: routes/communityRuleRoutes.js
const express = require('express');
const router = express.Router();
const communityRuleController = require('../controllers/communityRuleController');
const authMiddleware = require('../middlewares/authMiddleware');

const BASE_PATH = '/admin/settings/community-rules';
router.use(BASE_PATH, [authMiddleware.verifyToken, authMiddleware.isAdmin]);

router.post(BASE_PATH, communityRuleController.createRule);
router.get(BASE_PATH, communityRuleController.getAllRules);
router.put(`${BASE_PATH}/:id`, communityRuleController.updateRule);
router.delete(`${BASE_PATH}/:id`, communityRuleController.deleteRule);

module.exports = router;