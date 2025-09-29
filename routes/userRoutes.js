const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/users/register', userController.signup);
router.post('/users/login', userController.login);
router.get('/users', authMiddleware.verifyToken, authMiddleware.isAdmin, userController.getAllUsers);
router.post('/logout', authMiddleware.verifyToken, userController.logout);


module.exports = router;