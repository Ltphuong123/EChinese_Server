// file: routes/deviceTokenRoutes.js

const express = require('express');
const router = express.Router();
const deviceTokenController = require('../controllers/deviceTokenController');
const authMiddleware = require('../middlewares/authMiddleware');

// Tất cả routes đều cần authentication
router.use(authMiddleware.verifyToken);

// POST /api/users/device-token - Lưu/cập nhật device token
router.post('/device-token', deviceTokenController.saveToken);

// DELETE /api/users/device-token - Xóa một device token
router.delete('/device-token', deviceTokenController.deleteToken);

// DELETE /api/users/device-tokens/all - Xóa tất cả device tokens
router.delete('/device-tokens/all', deviceTokenController.deleteAllTokens);

// GET /api/users/device-tokens - Lấy danh sách device tokens
router.get('/device-tokens', deviceTokenController.getTokens);

module.exports = router;
