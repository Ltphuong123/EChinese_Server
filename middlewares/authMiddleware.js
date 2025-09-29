const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = {
  verifyToken: (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({ message: 'Token không hợp lệ' });
    }
  },

  isAdmin: (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({ message: 'Truy cập bị từ chối, chỉ dành cho admin' });
    }
  },
};

module.exports = authMiddleware;