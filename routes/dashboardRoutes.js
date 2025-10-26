// file: routes/dashboardRoutes.js

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

const basePath = '/monetization/dashboard';

router.use(basePath, [authMiddleware.verifyToken, authMiddleware.isAdmin]);

router.get(`${basePath}/stats`, dashboardController.getStats);

module.exports = router;