const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/users/signup', userController.signup);
router.post('/users/login', userController.login);
router.get('/users', authMiddleware.verifyToken, authMiddleware.isAdmin, userController.getAllUsers);

module.exports = router;