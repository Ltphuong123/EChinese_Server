const userService = require('../services/userService');

const userController = {
  getAllUsers: async (req, res) => {
    try {
      const users = await userService.getAllUsers();
      res.status(200).json(users);
    } catch (error) {
      console.error('Lỗi khi lấy users:', error);
      res.status(500).json({ message: 'Lỗi khi lấy users', error: error.message });
    }
  },

  signup: async (req, res) => {
    try {
      const newUser = await userService.createUser(req.body);
      res.status(201).json(newUser);
    } catch (error) {
      console.error('Lỗi khi tạo user:', error);
      res.status(500).json({ message: 'Lỗi khi tạo user', error: error.message });
    }
  },

  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: 'Yêu cầu username và password' });
      }
      const user = await userService.login({ username, password });
      res.status(200).json(user);
    } catch (error) {
      console.error('Lỗi khi đăng nhập:', error);
      res.status(401).json({ message: 'Đăng nhập thất bại', error: error.message });
    }
  },
  logout: async (req, res) => {
    try {
      // Nếu muốn invalidate token, có thể lưu token vào blacklist trong DB/Redis tại đây.
      return res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi đăng xuất', error: error.message });
    }
  },

};

module.exports = userController;