const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = {
  verifyToken: (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET|| '7b9c3f8a4e9b2c1d0e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6');
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({ message: 'Token không hợp lệ' });
    }
  },

  isAdmin: (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'super admin')) {
      next();
    } else {
      return res.status(403).json({ message: 'Truy cập bị từ chối, chỉ dành cho admin' });
    }
  },
  
  isSuperAdmin: (req, res, next) => {
    // Middleware này cũng nên được dùng SAU khi verifyToken đã chạy
    if (req.user && req.user.role === 'super admin') {
      next();
    } else {
      return res.status(403).json({ message: 'Truy cập bị từ chối, chỉ dành cho Super Admin' });
    }
  },
};

module.exports = authMiddleware;