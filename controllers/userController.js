const userService = require('../services/userService');
const testAttemptService = require('../services/testAttemptService');
const achievementService = require('../services/achievementService');


const userController = {
  getAllUsers: async (req, res) => {
    try {
      const users = await userService.getAllUsers();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi khi lấy users', error: error.message });
    }
  },

  signup: async (req, res) => {
    try {
      const newUser = await userService.createUser(req.body);
      res.status(201).json({
        success: true,
        message: "Đăng ký thành công",
        data: newUser
      });
    } catch (error) {
      res.status(500).json({ success: false,message: 'Lỗi khi tạo user', error: error.message });
    }
  },

  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      // Lấy thêm thông tin từ request để ghi log session
      // const ip_address = req.ip || req.connection.remoteAddress;
      // const device = req.headers['user-agent'];
      const ip_address = null;
      const device = null;

      const data = await userService.login({ username, password, ip_address, device });
      res.status(200).json({ 
        token: data.token,
        refreshToken: data.refreshToken,
        user: data.user
      });
    } catch (error) {
      if (error.message.includes('không tồn tại') || error.message.includes('không chính xác')) {
        return res.status(401).json({ success: false, message: error.message });
      }
      if (error.message.includes('vô hiệu hóa')) {
        return res.status(403).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  },

  refreshToken: async (req, res) => {
    try {
      const { refresh_token } = req.body;
      const result = await userService.refreshToken(refresh_token);
      res.json({
        success: true,
        message: "Thành công",
        result
      });
    } catch (error) {
      res.status(403).json({success: false, message: 'Không thể làm mới token', error: error.message });
    }
  },

  logout: async (req, res) => {
        try {
            const { refresh_token } = req.body;
            if (!refresh_token) {
                return res.status(400).json({ success: false, message: 'Refresh token là bắt buộc.' });
            }
            
            const result = await userService.logout(refresh_token);
            res.status(200).json(result);
        } catch (error) {
            if (error.message.includes('không hợp lệ')) {
                return res.status(401).json({ success: false, message: error.message });
            }
            res.status(500).json({ success: false, message: 'Lỗi khi đăng xuất', error: error.message });
        }
  },

  getUsersAdmin: async (req, res) => {
    try {
      // Lấy các tham số query với giá trị mặc định
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const searchTerm = req.query.searchTerm || '';
      const roleFilter = req.query.roleFilter || 'all';

      const result = await userService.getUsersAdmin({ page, limit, searchTerm, roleFilter });
      
      res.status(200).json({
        data: result.users,
        meta: {
          total: result.totalItems,
          page: result.currentPage,
          limit: limit,
          totalPages: result.totalPages,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách người dùng', error: error.message });
    }
  },

  getUserDetailsAdmin: async (req, res) => {
    try {
      const { userId } = req.params;
      const userDetails = await userService.getUserDetailsAdmin(userId);

      const {
      user,
      achievements,
      dailyActivities,
      sessions,
      streak,
      subscription,
      usage
      }= userDetails

      res.status(200).json({
        user,
        achievements,
        dailyActivities,
        sessions,
        streak,
        subscription,
        usage
      });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết người dùng', error: error.message });
    }
  },

  updateUserAdmin: async (req, res) => {
    try {
      const { userId } = req.params;
      const updateData = req.body;

      // Kiểm tra xem có dữ liệu để cập nhật không
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: 'Không có dữ liệu để cập nhật.' });
      }

      const updatedUser = await userService.updateUserAdmin(userId, updateData);
       const {
          id,
          username,
          password_hash,
          name,
          avatar_url,
          email,
          provider,
          provider_id,
          role,
          is_active,
          isVerify,
          community_points,
          level,
          badge_level,
          language,
          created_at,
          last_login
       } = updatedUser

      res.status(200).json({
          id,
          username,
          password_hash,
          name,
          avatar_url,
          email,
          provider,
          provider_id,
          role,
          is_active,
          isVerify,
          community_points,
          level,
          badge_level,
          language,
          created_at,
          last_login
       });

    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      // Bắt các lỗi khác, ví dụ: email đã tồn tại
      if (error.code === '23505') { // PostgreSQL unique violation
        return res.status(409).json({ success: false, message: `Lỗi: ${error.detail}` });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật người dùng', error: error.message });
    }
  },

  grantAchievementToUserAdmin: async (req, res) => {
    try {
      const { userId } = req.params;
      const { achievementId, progress } = req.body;

      // Validation
      if (!achievementId) {
        return res.status(400).json({
          success: false,
          message: "Trường 'achievementId' là bắt buộc."
        });
      }

      const newUserAchievement = await userService.grantAchievementToUser({
        userId,
        achievementId,
        progress,
      });

      res.status(201).json({
        success: true,
        message: 'Gán thành tích cho người dùng thành công.',
        data: newUserAchievement
      });

    } catch (error) {
       if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
       if (error.code === '23505') { // Lỗi unique (user đã có achievement này)
           return res.status(409).json({ success: false, message: 'Người dùng này đã có thành tích này.' });
       }
      res.status(500).json({ success: false, message: 'Lỗi khi gán thành tích', error: error.message });
    }
  },

  getExamHistory: async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
      const history = await userService.getUserExamHistory({
        userId,
        page: parseInt(page),
        limit: parseInt(limit)
      });
      res.status(200).json({ success: true, ...history });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy lịch sử làm bài', error: error.message });
    }
  },

  getUserViolations: async (req, res) => {
    try {
      const userId = req.user.id;
      const violations = await userService.getViolationsByUserId(userId);
      res.status(200).json({ success: true, data: violations });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy lịch sử vi phạm', error: error.message });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const adminId = req.user.id; // Lấy từ token của admin
      
      await userService.deleteUserPermanently(userId, adminId);
      
     
      res.status(200).send({ success: true, message:'thành công'});

    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes('Cannot delete') || error.message.includes('cannot delete their own')) {
        return res.status(403).json({ success: false, message: error.message }); // Forbidden
      }
      res.status(500).json({ success: false, message: 'Error deleting user.', error: error.message });
    }
  },

  resetUserQuota: async (req, res) => {
    try {
      const { userId } = req.params;
      const { feature } = req.body;

      if (!feature) {
        return res.status(400).json({ success: false, message: 'Feature is required.' });
      }

      const success = await userService.resetQuota(userId, feature);
      
      if (!success) {
        // Trường hợp này xảy ra khi người dùng chưa từng sử dụng tính năng đó (chưa có bản ghi trong UserUsage)
        // Coi như là thành công vì mục tiêu là quota = 0
        return res.status(200).json({ success: true, message: 'Quota is already at 0 or user has not used this feature yet.' });
      }

      res.status(200).json({ success: true, message: `Quota for feature '${feature}' has been reset.` });

    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes('Invalid feature')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Error resetting quota.', error: error.message });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const userId = req.user.id; // Lấy ID người dùng từ token đã được xác thực
      const { old_password, new_password } = req.body;

      const result = await userService.resetPassword(userId, old_password, new_password);
      res.status(200).json({ success: true, message: 'Thành công' });
    } catch (error) {
      // Trả về 400 Bad Request nếu lỗi là do người dùng (VD: sai mật khẩu cũ)
      if (error.message.includes('Mật khẩu') || error.message.includes('tồn tại')) {
         return res.status(400).json({success: false,  message: error.message });
      }
      // Trả về 500 cho các lỗi server khác
      res.status(500).json({success: false,  message: 'Lỗi khi đặt lại mật khẩu'+ error.message});
    }
  },

  changePassword: async (req, res) => {
    try {
      const {username, old_password, new_password } = req.body;

      const result = await userService.changePassword(username, old_password, new_password);
      res.status(200).json({ success: true, message: 'Thành công' });
    } catch (error) {
      // Trả về 400 Bad Request nếu lỗi là do người dùng (VD: sai mật khẩu cũ)
      if (error.message.includes('Mật khẩu') || error.message.includes('tồn tại')) {
         return res.status(400).json({success: false, message: error.message });
      }
      // Trả về 500 cho các lỗi server khác
      res.status(500).json({success: false, message: 'Lỗi khi đặt lại mật khẩu '+ error.message });
    }
  },

  getUsageInfo: async (req, res) => {
    try {
      const userId = req.user.id; // Lấy từ token
      const usageInfo = await userService.getUserUsageInfo(userId);
      res.status(200).json({ success: true, data: usageInfo });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin sử dụng.', error: error.message });
    }
  },

  getCurrentSubscriptionInfo: async (req, res) => {
    try {
      const userId = req.user.id; // Lấy từ token
      // Tái sử dụng service đã viết cho API /users/me/usage
      const subscriptionInfo = await userService.getUserUsageInfo(userId);
      res.status(200).json({ success: true, data: subscriptionInfo });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin gói đăng ký.', error: error.message });
    }
  },

  getUserProfile: async (req, res) => {
    try {
      // ID của người dùng được lấy từ token đã được giải mã bởi middleware
      const userId = req.user.id;
      const userProfile = await userService.getUserProfile(userId);

      res.status(200).json({
        success: true,
        message: 'Lấy thông tin cá nhân thành công.',
        data: userProfile
      });

    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin cá nhân', error: error.message });
    }
  },

  // PUT /api/users/profile
  updateUserProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      const updateData = req.body;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: 'Không có dữ liệu để cập nhật.' });
      }

      const updatedUser = await userService.updateUserProfile(userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin cá nhân thành công.',
        data: updatedUser
      });

    } catch (error) {
      if (error.code === '23505') { // Lỗi unique (ví dụ: email đã được sử dụng)
        return res.status(409).json({ success: false, message: `Lỗi: ${error.detail}` });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật thông tin cá nhân', error: error.message });
    }
  },

  getCurrentUserBadge: async (req, res) => {
    try {
      const userId = req.user.id; // Lấy từ token
      const badgeDetails = await userService.getUserBadgeDetails(userId);

      res.status(200).json({
        success: true,
        message: 'Lấy thông tin huy hiệu thành công.',
        data: badgeDetails
      });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
          return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin huy hiệu', error: error.message });
    }
  },

   getUserAchievements: async (req, res) => {
    try {
      const userId = req.user.id;
      const achievements = await achievementService.getAchievedByUser(userId);
      res.status(200).json({ success: true, data: achievements });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy thành tích đã đạt', error: error.message });
    }
  },

  // --- HÀM MỚI ---
  getUserAchievementsProgress: async (req, res) => {
    try {
      const userId = req.user.id;
      const progress = await achievementService.getProgressForUser(userId);
      res.status(200).json({ success: true, data: progress });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy tiến độ thành tích', error: error.message });
    }
  },




};

module.exports = userController;
