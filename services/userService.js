const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
require('dotenv').config();

const saltRounds = 10;

const userService = {
  // Lấy tất cả users
  getAllUsers: async () => {
    return await userModel.getAllUsers();
  },

  // Tạo user mới (signup)
  createUser: async (userData) => {
    if (!userData || typeof userData !== 'object') {
      throw new Error('Dữ liệu đầu vào không hợp lệ');
    }

    const data = { ...userData };

    if (data.password && typeof data.password === 'string') {
      data.password_hash = await bcrypt.hash(data.password, saltRounds);
      delete data.password;
    } else {
      data.password_hash = null;
    }
    const newUser = await userModel.createUser(data);

    return { ...newUser};
  },

  // Đăng nhập bằng username và password
  login: async ({ username, password }) => {
    if (!username || !password) {
      throw new Error('Yêu cầu username và password');
    }

    const user = await userModel.findUserByUsername(username);
    if (!user) {
      throw new Error('Username không tồn tại');
    }

    if (!user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      throw new Error('Mật khẩu không đúng');
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    return { id: user.id, username: user.username, role: user.role, token };
  },
};

module.exports = userService;