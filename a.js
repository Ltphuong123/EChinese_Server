// require('dotenv').config();
// const express = require('express');
// const app = express();
// const port = process.env.PORT || 3000;

// app.use(express.json());

// const userRoutes = require('./routes/userRoutes');

// app.use('/api', userRoutes);

// app.listen(port, () => {
//   console.log(`Server chạy tại http://localhost:${port}`);
// });


// const express = require('express');
// const router = express.Router();
// const userController = require('../controllers/userController');
// const authMiddleware = require('../middlewares/authMiddleware');

// router.post('/auth/register', userController.signup);
// router.post('/auth/login', userController.login);
// router.post('/auth/refresh-token', userController.refreshToken);
// router.post('/auth/logout', userController.logout);
// router.post('/auth/reset-password', authMiddleware.verifyToken, userController.resetPassword);
// router.post('/auth/change-password', userController.changePassword);

// module.exports = router;


// const userService = require('../services/userService');

// const userController = {
//   getAllUsers: async (req, res) => {
//     try {
//       const users = await userService.getAllUsers();
//       res.status(200).json(users);
//     } catch (error) {
//       res.status(500).json({ message: 'Lỗi khi lấy users', error: error.message });
//     }
//   },

//   signup: async (req, res) => {
//     try {
//       const newUser = await userService.createUser(req.body);
//       res.status(201).json({
//         success: true,
//         message: "Đăng ký thành công",
//         data: newUser
//       });
//     } catch (error) {
//       res.status(500).json({ success: false,message: 'Lỗi khi tạo user', error: error.message });
//     }
//   },

//   login: async (req, res) => {
//     try {
//       const { username, password } = req.body;
//       const user = await userService.login({ username, password });
//       res.status(201).json({
//         success: true,
//         message: "Đăng Nhập thành công",
//         data: user
//       });
//     } catch (error) {
//       res.status(401).json({success: false, message: 'Đăng nhập thất bại', error: error.message });
//     }
//   },

//   refreshToken: async (req, res) => {
//     try {
//       const { refresh_token } = req.body;
//       const result = await userService.refreshToken(refresh_token);
//       res.json({
//         success: true,
//         message: "Thành công",
//         result
//       });
//     } catch (error) {
//       res.status(403).json({success: false, message: 'Không thể làm mới token', error: error.message });
//     }
//   },

//   logout: async (req, res) => {
//     try {
//       const { refresh_token } = req.body;
//       const result = await userService.logout(refresh_token);
//       res.json(result);
//     } catch (error) {
//       res.status(500).json({ message: 'Lỗi khi logout', error: error.message });
//     }
//   },

//   resetPassword: async (req, res) => {
//     try {
//       const userId = req.user.id; // Lấy ID người dùng từ token đã được xác thực
//       const { old_password, new_password } = req.body;

//       const result = await userService.resetPassword(userId, old_password, new_password);
//       res.status(200).json(result);
//     } catch (error) {
//       // Trả về 400 Bad Request nếu lỗi là do người dùng (VD: sai mật khẩu cũ)
//       if (error.message.includes('Mật khẩu') || error.message.includes('tồn tại')) {
//          return res.status(400).json({ message: error.message });
//       }
//       // Trả về 500 cho các lỗi server khác
//       res.status(500).json({ message: 'Lỗi khi đặt lại mật khẩu', error: error.message });
//     }
//   },

//   changePassword: async (req, res) => {
//     try {
//       const {username, old_password, new_password } = req.body;

//       const result = await userService.changePassword(username, old_password, new_password);
//       res.status(200).json(result);
//     } catch (error) {
//       // Trả về 400 Bad Request nếu lỗi là do người dùng (VD: sai mật khẩu cũ)
//       if (error.message.includes('Mật khẩu') || error.message.includes('tồn tại')) {
//          return res.status(400).json({ message: error.message });
//       }
//       // Trả về 500 cho các lỗi server khác
//       res.status(500).json({ message: 'Lỗi khi đặt lại mật khẩu', error: error.message });
//     }
//   },
// };

// module.exports = userController;



// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
// const userModel = require('../models/userModel');
// require('dotenv').config();
// const db = require('../config/db');

// const saltRounds = 10;

// const generateAccessToken = (user) => {
//   return jwt.sign(
//     { id: user.id, role: user.role },
//     process.env.JWT_SECRET,
//     { expiresIn: process.env.JWT_EXPIRATION || '15m' }
//   );
// };

// const generateRefreshToken = (user) => {
//   return jwt.sign(
//     { id: user.id },
//     process.env.JWT_REFRESH_SECRET,
//     { expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d' }
//   );
// };

// const userService = {
//   // Lấy tất cả users
//   getAllUsers: async () => {
//     return await userModel.getAllUsers();
//   },

//   // Tạo user mới (signup)
//   createUser: async (userData) => {
//     if (!userData || typeof userData !== 'object') {
//       throw new Error('Dữ liệu đầu vào không hợp lệ');
//     }

//     const data = { ...userData };

//     if (data.password && typeof data.password === 'string') {
//       data.password_hash = await bcrypt.hash(data.password, saltRounds);
//       delete data.password;
//     } else {
//       data.password_hash = null;
//     }
//     const newUser = await userModel.createUser(data);

//     return { ...newUser};
//   },

//   // Đăng nhập bằng username và password
//   login: async ({ username, password }) => {
//     if (!username || !password) {
//       throw new Error('Yêu cầu username và password');
//     }

//     const user = await userModel.findUserByUsername(username);
//     if (!user) {
//       throw new Error('Username không tồn tại');
//     }

//     if (!user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
//       throw new Error('Mật khẩu không đúng');
//     }
//     const accessToken = generateAccessToken(user);
//     const refreshToken = generateRefreshToken(user);

//     // Lưu refresh token vào DB
//     await db.query(
//       `INSERT INTO "RefreshTokens" (user_id, token, expires_at)
//        VALUES ($1, $2, NOW() + interval '7 days')`,
//       [user.id, refreshToken]
//     );

//     return {
//       id: user.id,
//       username: user.username,
//       role: user.role,
//       access_token: accessToken,
//       refresh_token: refreshToken
//     };
//   },
//   refreshToken: async (refresh_token) => {
//     if (!refresh_token) throw new Error('Thiếu refresh token');

//     // Kiểm tra trong DB
//     const result = await db.query(
//       `SELECT * FROM "RefreshTokens" WHERE token = $1 AND expires_at > NOW()`,
//       [refresh_token]
//     );
//     if (result.rowCount === 0) throw new Error('Refresh token không hợp lệ hoặc đã hết hạn');

//     // Verify token
//     const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);

//     const user = await userModel.findUserById(decoded.id);
//     if (!user) throw new Error('User không tồn tại');

//     const newAccessToken = generateAccessToken(user);
//     return { access_token: newAccessToken };
//   },

//   logout: async (refresh_token) => {
//     if (refresh_token) {
//       await db.query(`DELETE FROM "RefreshTokens" WHERE token = $1`, [refresh_token]);
//     }
//     return { success: true, message: "Đăng xuất thành công" };
//   },

//   getProfile: async (userId) => {
//     const user = await userModel.findUserById(userId);
//     if (!user) throw new Error('User không tồn tại');
//     return user;
//   },

//   resetPassword: async (userId, oldPassword, newPassword) => {
//     if (!oldPassword || !newPassword) {
//       throw new Error('Yêu cầu cung cấp mật khẩu cũ và mật khẩu mới.');
//     }

//     const user = await userModel.findUserById(userId);
//     if (!user) {
//       // Trường hợp này khó xảy ra vì đã qua middleware, nhưng vẫn nên kiểm tra
//       throw new Error('Người dùng không tồn tại.');
//     }

//     // Kiểm tra xem user có password_hash không (VD: tài khoản đăng nhập qua Google sẽ không có)
//     if (!user.password_hash) {
//       throw new Error('Tài khoản này không hỗ trợ đổi mật khẩu bằng phương thức này.');
//     }

//     // So sánh mật khẩu cũ
//     const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
//     if (!isMatch) {
//       throw new Error('Mật khẩu cũ không đúng.');
//     }

//     // Băm mật khẩu mới và cập nhật
//     const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
//     await userModel.updatePassword(userId, newPasswordHash);

//     return { success: true, message: 'Cập nhật mật khẩu thành công.' };
//   },


//   changePassword: async (username, old_password, new_password) => {
//     if (!old_password || !new_password) {
//       throw new Error('Yêu cầu cung cấp mật khẩu cũ và mật khẩu mới.');
//     }

//     const user = await userModel.findUserByUsername(username);
//     if (!user) {
//       // Trường hợp này khó xảy ra vì đã qua middleware, nhưng vẫn nên kiểm tra
//       throw new Error('Người dùng không tồn tại.');
//     }

//     // Kiểm tra xem user có password_hash không (VD: tài khoản đăng nhập qua Google sẽ không có)
//     if (!user.password_hash) {
//       throw new Error('Tài khoản này không hỗ trợ đổi mật khẩu bằng phương thức này.');
//     }

//     // So sánh mật khẩu cũ
//     const isMatch = await bcrypt.compare(old_password, user.password_hash);
//     if (!isMatch) {
//       throw new Error('Mật khẩu cũ không đúng.');
//     }

//     // Băm mật khẩu mới và cập nhật
//     const newPasswordHash = await bcrypt.hash(new_password, saltRounds);
//     await userModel.updatePassword(user.id, newPasswordHash);

//     return { success: true, message: 'Cập nhật mật khẩu thành công.' };
 
//   },
// };

// module.exports = userService;

// const db = require('../config/db');

// const userModel = {
//   getAllUsers: async () => {
//     const queryText = `
//       SELECT * FROM users;
//     `;
//     const result = await db.query(queryText);
//     return result.rows;
//   },

//   createUser: async (userData) => {
//     const {
//       username,
//       password_hash,
//       name,
//       email,
//       provider ,
//       provider_id
//     } = userData;

//     const queryText = `
//       INSERT INTO "Users"  (
//         username, 
//         password_hash, 
//         name, 
//         email, 
//         provider, 
//         provider_id
//       )
//       VALUES  ($1, $2, $3, $4, $5, $6)
      
//       RETURNING id, username, name, email;
//     `;

//     const values = [
//       username,
//       password_hash,
//       name,
//       email,
//       provider,
//       provider_id
//     ];

//     const result = await db.query(queryText, values);
//     return result.rows[0];
//   },


//   // Tìm user bằng username
//   findUserByUsername: async (username) => {
//     const queryText = `SELECT * FROM "Users" WHERE username = $1;`;
//     const result = await db.query(queryText, [username]);
//     return result.rows[0];
//   },

//   findUserById: async (id) => {
//     const queryText = `SELECT * FROM "Users" WHERE id = $1;`;
//     const result = await db.query(queryText, [id]);
//     return result.rows[0];
//   },

//   updatePassword: async (userId, passwordHash) => {
//     const queryText = `
//       UPDATE "Users"
//       SET password_hash = $1
//       WHERE id = $2
//       RETURNING id;
//     `;
//     const result = await db.query(queryText, [passwordHash, userId]);
//     return result.rows[0];
//   },

//   updateUser: async (userId, updateData) => {
//     const keys = Object.keys(updateData);
//     const values = Object.values(updateData);

//     const setClause = keys
//       .map((key, index) => `"${key}" = $${index + 1}`)
//       .join(', ');

//     const queryText = `
//       UPDATE "Users"
//       SET ${setClause}
//       WHERE id = $${keys.length + 1}
//       RETURNING *;
//     `;

//     const result = await db.query(queryText, [...values, userId]);
//     return result.rows[0];
//   },

// };

// module.exports = userModel;