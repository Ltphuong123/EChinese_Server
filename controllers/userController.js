const userService = require("../services/userService");
const testAttemptService = require("../services/testAttemptService");
const achievementService = require("../services/achievementService");
const postService = require("../services/postService");

const userController = {
  getAllUsers: async (req, res) => {
    try {
      const users = await userService.getAllUsers();
      res.status(200).json(users);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Lỗi khi lấy users", error: error.message });
    }
  },

  fetchUserById: async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await userService.fetchUserById(userId);
      return res.status(200).json(user);
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      return res
        .status(500)
        .json({
          success: false,
          message: "Lỗi khi lấy người dùng",
          error: error.message,
        });
    }
  },

  signup: async (req, res) => {
    try {
      const newUser = await userService.createUser(req.body);
      res.status(201).json({
        success: true,
        message: "Đăng ký thành công",
        data: newUser,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi tạo user",
        error: error.message,
      });
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

      const data = await userService.login({
        username,
        password,
        ip_address,
        device,
      });
      res.status(200).json({
        token: data.token,
        refreshToken: data.refreshToken,
        user: data.user,
      });
    } catch (error) {
      if (
        error.message.includes("không tồn tại") ||
        error.message.includes("không chính xác")
      ) {
        return res.status(401).json({ success: false, message: error.message });
      }
      if (error.message.includes("vô hiệu hóa")) {
        return res.status(403).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  },

  googleLogin: async (req, res) => {
    try {
      const { email, name, avatar_url } = req.body;
      const ip_address = null;
      const device = null;
      const data = await userService.googleLogin({
        email,
        name,
        avatar_url,
        ip_address,
        device,
      });
      res.status(200).json({
        token: data.token,
        refreshToken: data.refreshToken,
        user: data.user,
      });
    } catch (error) {
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
        result,
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        message: "Không thể làm mới token",
        error: error.message,
      });
    }
  },

  logout: async (req, res) => {
    try {
      const { refresh_token } = req.body;
      if (!refresh_token) {
        return res
          .status(400)
          .json({ success: false, message: "Refresh token là bắt buộc." });
      }

      const result = await userService.logout(refresh_token);
      res.status(200).json(result);
    } catch (error) {
      if (error.message.includes("không hợp lệ")) {
        return res.status(401).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi đăng xuất",
        error: error.message,
      });
    }
  },

  getUsersAdmin: async (req, res) => {
    try {
      // Lấy các tham số query với giá trị mặc định
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const searchTerm = req.query.searchTerm || "";
      const roleFilter = req.query.roleFilter || "all";

      const result = await userService.getUsersAdmin({
        page,
        limit,
        searchTerm,
        roleFilter,
      });

      res.status(200).json({
        success: true,
        message: "Lấy danh sách thành công.",
        data: {
          data: result.users,
          meta: {
            total: result.totalItems,
            page: result.currentPage,
            limit: limit,
            totalPages: result.totalPages,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy danh sách người dùng",
        error: error.message,
      });
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
        usage,
      } = userDetails;

      res.status(200).json({
        user,
        achievements,
        dailyActivities,
        sessions,
        streak,
        subscription,
        usage,
      });
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy chi tiết người dùng",
        error: error.message,
      });
    }
  },

  updateUserAdmin: async (req, res) => {
    try {
      const { userId } = req.params;
      const updateData = req.body;
      const adminId = req.user.id;

      // Kiểm tra xem có dữ liệu để cập nhật không
      if (Object.keys(updateData).length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Không có dữ liệu để cập nhật." });
      }

      await userService.updateUserAdmin(userId, updateData);
      // Lấy lại bản ghi đầy đủ với provider sau khi cập nhật
      const fresh = await userService.fetchUserById(userId);

      // Log admin action
      await require("../services/adminLogService").createLog(
        {
          action_type: "UPDATE_USER_INFO",
          target_id: userId,
          description: `Cập nhật thông tin người dùng: ${Object.keys(
            updateData
          ).join(", ")}`,
        },
        adminId
      );

      // Trả về đúng cấu trúc phẳng yêu cầu
      return res.status(200).json(fresh);
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      // Bắt các lỗi khác, ví dụ: email đã tồn tại
      if (error.code === "23505") {
        // PostgreSQL unique violation
        return res
          .status(409)
          .json({ success: false, message: `Lỗi: ${error.detail}` });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi cập nhật người dùng",
        error: error.message,
      });
    }
  },

  grantAchievementToUserAdmin: async (req, res) => {
    try {
      const { userId } = req.params;
      const { achievementId, progress } = req.body;
      const adminId = req.user.id;

      // Validation
      if (!achievementId) {
        return res.status(400).json({
          success: false,
          message: "Trường 'achievementId' là bắt buộc.",
        });
      }

      const newUserAchievement = await userService.grantAchievementToUser({
        userId,
        achievementId,
        progress,
      });

      // Log admin action
      await require("../services/adminLogService").createLog(
        {
          action_type: "GRANT_ACHIEVEMENT",
          target_id: userId,
          description: `Gán thành tích ${achievementId} cho người dùng`,
        },
        adminId
      );

      res.status(201).json({
        success: true,
        message: "Gán thành tích cho người dùng thành công.",
        data: newUserAchievement,
      });
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.code === "23505") {
        // Lỗi unique (user đã có achievement này)
        return res.status(409).json({
          success: false,
          message: "Người dùng này đã có thành tích này.",
        });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi gán thành tích",
        error: error.message,
      });
    }
  },

  getExamHistory: async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
      const history = await userService.getUserExamHistory({
        userId,
        page: parseInt(page),
        limit: parseInt(limit),
      });
      res.status(200).json({ success: true, ...history });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy lịch sử làm bài",
        error: error.message,
      });
    }
  },

  getUserViolations: async (req, res) => {
    try {
      const userId = req.user.id;
      const violations = await userService.getViolationsByUserId(userId);
      res.status(200).json({ success: true, data: violations });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy lịch sử vi phạm",
        error: error.message,
      });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const adminId = req.user.id; // Lấy từ token của admin

      await userService.deleteUserPermanently(userId, adminId);

      // Log admin action
      await require("../services/adminLogService").createLog(
        {
          action_type: "DELETE_USER",
          target_id: userId,
          description: `Xóa vĩnh viễn người dùng`,
        },
        adminId
      );

      res.status(200).send({ success: true, message: "thành công" });
    } catch (error) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (
        error.message.includes("Cannot delete") ||
        error.message.includes("cannot delete their own")
      ) {
        return res.status(403).json({ success: false, message: error.message }); // Forbidden
      }
      res.status(500).json({
        success: false,
        message: "Error deleting user.",
        error: error.message,
      });
    }
  },

  resetUserQuota: async (req, res) => {
    try {
      const { userId } = req.params;
      const { feature } = req.body;
      const adminId = req.user.id;

      if (!feature) {
        return res
          .status(400)
          .json({ success: false, message: "Feature is required." });
      }

      const success = await userService.resetQuota(userId, feature);

      if (!success) {
        // Trường hợp này xảy ra khi người dùng chưa từng sử dụng tính năng đó (chưa có bản ghi trong UserUsage)
        // Coi như là thành công vì mục tiêu là quota = 0
        return res.status(200).json({
          success: true,
          message:
            "Quota is already at 0 or user has not used this feature yet.",
        });
      }

      res.status(200).json({
        success: true,
        message: `Quota for feature '${feature}' has been reset.`,
      });
    } catch (error) {
      if (error.message.includes("not found")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes("Invalid feature")) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Error resetting quota.",
        error: error.message,
      });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const userId = req.user.id; // Lấy ID người dùng từ token đã được xác thực
      const { old_password, new_password } = req.body;

      const result = await userService.resetPassword(
        userId,
        old_password,
        new_password
      );
      res.status(200).json({ success: true, message: "Thành công" });
    } catch (error) {
      // Trả về 400 Bad Request nếu lỗi là do người dùng (VD: sai mật khẩu cũ)
      if (
        error.message.includes("Mật khẩu") ||
        error.message.includes("tồn tại")
      ) {
        return res.status(400).json({ success: false, message: error.message });
      }
      // Trả về 500 cho các lỗi server khác
      res.status(500).json({
        success: false,
        message: "Lỗi khi đặt lại mật khẩu" + error.message,
      });
    }
  },

  changePassword: async (req, res) => {
    try {
      const { username, old_password, new_password } = req.body;

      const result = await userService.changePassword(
        username,
        old_password,
        new_password
      );
      res.status(200).json({ success: true, message: "Thành công" });
    } catch (error) {
      // Trả về 400 Bad Request nếu lỗi là do người dùng (VD: sai mật khẩu cũ)
      if (
        error.message.includes("Mật khẩu") ||
        error.message.includes("tồn tại")
      ) {
        return res.status(400).json({ success: false, message: error.message });
      }
      // Trả về 500 cho các lỗi server khác
      res.status(500).json({
        success: false,
        message: "Lỗi khi đặt lại mật khẩu " + error.message,
      });
    }
  },

  getUsageInfo: async (req, res) => {
    try {
      const userId = req.user.id; // Lấy từ token
      const usageInfo = await userService.getUserUsageInfo(userId);
      res.status(200).json({ success: true, data: usageInfo });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy thông tin sử dụng.",
        error: error.message,
      });
    }
  },

  getCurrentSubscriptionInfo: async (req, res) => {
    try {
      const userId = req.user.id; // Lấy từ token
      // Tái sử dụng service đã viết cho API /users/me/usage
      const subscriptionInfo = await userService.getUserUsageInfo(userId);
      res.status(200).json({ success: true, data: subscriptionInfo });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy thông tin gói đăng ký.",
        error: error.message,
      });
    }
  },

  getUserProfile: async (req, res) => {
    try {
      // ID của người dùng được lấy từ token đã được giải mã bởi middleware
      const userId = req.user.id;
      const userProfile = await userService.getUserProfile(userId);

      res.status(200).json({
        success: true,
        message: "Lấy thông tin cá nhân thành công.",
        data: userProfile,
      });
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy thông tin cá nhân",
        error: error.message,
      });
    }
  },

  // PUT /api/users/profile
  updateUserProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      const updateData = req.body;

      if (Object.keys(updateData).length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Không có dữ liệu để cập nhật." });
      }

      const updatedUser = await userService.updateUserProfile(
        userId,
        updateData
      );

      res.status(200).json({
        success: true,
        message: "Cập nhật thông tin cá nhân thành công.",
        data: updatedUser,
      });
    } catch (error) {
      if (error.code === "23505") {
        // Lỗi unique (ví dụ: email đã được sử dụng)
        return res
          .status(409)
          .json({ success: false, message: `Lỗi: ${error.detail}` });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi cập nhật thông tin cá nhân",
        error: error.message,
      });
    }
  },

  getCurrentUserBadge: async (req, res) => {
    try {
      const userId = req.user.id; // Lấy từ token
      const badgeDetails = await userService.getUserBadgeDetails(userId);

      res.status(200).json({
        success: true,
        message: "Lấy thông tin huy hiệu thành công.",
        data: badgeDetails,
      });
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy thông tin huy hiệu",
        error: error.message,
      });
    }
  },

  getUserAchievements: async (req, res) => {
    try {
      const userId = req.user.id;
      const achievements = await achievementService.getAchievedByUser(userId);
      res.status(200).json({ success: true, data: achievements });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy thành tích đã đạt",
        error: error.message,
      });
    }
  },

  // --- HÀM MỚI ---
  getUserAchievementsProgress: async (req, res) => {
    try {
      const userId = req.user.id;
      const progress = await achievementService.getProgressForUser(userId);
      res.status(200).json({ success: true, data: progress });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy tiến độ thành tích",
        error: error.message,
      });
    }
  },

  getMyPosts: async (req, res) => {
    try {
      const userId = req.user.id;
      const filters = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
      };

      // Gọi service getUserPosts, truyền userId 2 lần
      // lần 1: để lọc bài viết của user này
      // lần 2: để kiểm tra trạng thái like/comment của user này
      const result = await postService.getUserPosts(userId, userId, filters);

      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy bài viết của bạn",
        error: error.message,
      });
    }
  },

  // API 2: Lấy các bài viết tôi đã tương tác
  getMyInteractedPosts: async (req, res) => {
    try {
      const userId = req.user.id;
      const filters = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
      };

      const result = await postService.getInteractedPosts(userId, filters);

      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy bài viết đã tương tác",
        error: error.message,
      });
    }
  },

  // API: Lấy thời gian hoạt động của user trong tuần hiện tại
  getWeeklyActivity: async (req, res) => {
    try {
      const userId = req.user.id;

      const result = await userService.getWeeklyActivity(userId);

      res.status(200).json({
        success: true,
        message: "Lấy thống kê hoạt động tuần thành công",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy thống kê hoạt động tuần",
        error: error.message,
      });
    }
  },

  // Ban user
  banUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason, ruleIds, resolution, severity } = req.body;

      if (!reason) {
        return res
          .status(400)
          .json({ success: false, message: "Lý do cấm là bắt buộc." });
      }

      const result = await userService.banUser(userId, {
        reason,
        ruleIds,
        resolution,
        severity,
      });

      // Tính ngày hết hạn khiếu nại (7 ngày từ bây giờ)
      const appealDeadline = new Date();
      appealDeadline.setDate(appealDeadline.getDate() + 7);
      const deadlineStr = appealDeadline.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Tạo nội dung thông báo chi tiết
      const notificationContent = `
        <div style="padding: 16px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
          <h3 style="color: #856404; margin-top: 0;">⚠️ Tài khoản của bạn đã bị cấm</h3>
          
          <div style="margin: 16px 0;">
            <strong>Lý do:</strong>
            <p style="margin: 8px 0;">${reason}</p>
          </div>

          ${resolution ? `
          <div style="margin: 16px 0;">
            <strong>Chi tiết vi phạm:</strong>
            <p style="margin: 8px 0;">${resolution}</p>
          </div>
          ` : ''}

          <div style="margin: 16px 0; padding: 12px; background-color: #fff; border-radius: 4px;">
            <strong style="color: #d32f2f;">⏰ Thời hạn khiếu nại:</strong>
            <p style="margin: 8px 0;">Bạn có <strong>7 ngày</strong> (đến <strong>${deadlineStr}</strong>) để gửi khiếu nại nếu bạn cho rằng đây là quyết định sai lầm.</p>
            <p style="margin: 8px 0; color: #d32f2f;"><strong>Lưu ý:</strong> Sau thời hạn này, tài khoản của bạn sẽ bị cấm vĩnh viễn và không thể khôi phục.</p>
          </div>

          <div style="margin: 16px 0;">
            <p>Để gửi khiếu nại, vui lòng:</p>
            <ol style="margin: 8px 0; padding-left: 20px;">
              <li>Truy cập mục "Vi phạm của tôi" trong tài khoản</li>
              <li>Chọn vi phạm cần khiếu nại</li>
              <li>Gửi khiếu nại kèm theo bằng chứng (nếu có)</li>
            </ol>
          </div>

          <p style="margin-top: 16px; color: #666; font-size: 14px;">
            Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ với đội ngũ hỗ trợ.
          </p>
        </div>
      `;

      // Gửi thông báo chi tiết cho user
      await require("../models/notificationModel").create({
        recipient_id: userId,
        audience: "user",
        type: "system",
        title: "⚠️ Tài khoản của bạn đã bị cấm - Bạn có 7 ngày để khiếu nại",
        content: JSON.stringify({ html: notificationContent }),
      });

      res.status(200).json({
        success: true,
        message: "Cấm người dùng thành công.",
        user: result.bannedUser,
        violation: result.violation,
      });
    } catch (error) {
      if (
        error.message.includes("không tồn tại") ||
        error.message.includes("đã bị cấm")
      ) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi cấm người dùng",
        error: error.message,
      });
    }
  },

  // API: Lấy bảng xếp hạng điểm cộng đồng
  getCommunityLeaderboard: async (req, res) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10; // Trả về top 10

      const result = await userService.getCommunityLeaderboard({ page, limit });

      res.status(200).json({
        success: true,
        message: "Lấy bảng xếp hạng thành công.",
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy bảng xếp hạng",
        error: error.message,
      });
    }
  },

  // API: Đổi avatar cho user
  updateAvatar: async (req, res) => {
    try {
      const userId = req.user.id;
      const { avatar_url } = req.body;

      if (!avatar_url) {
        return res.status(400).json({
          success: false,
          message: "Trường 'avatar_url' là bắt buộc.",
        });
      }

      const updatedUser = await userService.updateAvatar(userId, avatar_url);

      res.status(200).json({
        success: true,
        message: "Cập nhật avatar thành công.",
        data: updatedUser,
      });
    } catch (error) {
      if (error.message.includes("không tồn tại")) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi cập nhật avatar",
        error: error.message,
      });
    }
  },

  // API: Đổi avatar cho danh sách người dùng (Admin)
  updateAvatarBulk: async (req, res) => {
    try {
      const { users } = req.body;

      if (!users || !Array.isArray(users) || users.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Trường 'users' là bắt buộc và phải là một mảng không rỗng.",
        });
      }

      // Validate từng item trong mảng
      for (const user of users) {
        if (!user.userId || !user.avatarUrl) {
          return res.status(400).json({
            success: false,
            message:
              "Mỗi người dùng phải có 'userId' và 'avatarUrl'.",
          });
        }
      }

      const results = await userService.updateAvatarBulk(users);

      res.status(200).json({
        success: true,
        message: "Cập nhật avatar hàng loạt hoàn tất.",
        data: results,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Lỗi khi cập nhật avatar hàng loạt",
        error: error.message,
      });
    }
  },

  unbanUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res
          .status(400)
          .json({ success: false, message: "Lý do bỏ cấm là bắt buộc." });
      }

      const unbannedUser = await userService.unbanUser(userId, reason);

      // Gửi thông báo cho user
      await require("../models/notificationModel").create({
        recipient_id: userId,
        audience: "user",
        type: "system",
        title: "Tài khoản của bạn đã được khôi phục",
        content: JSON.stringify({ html: reason }),
      });

      res.status(200).json({
        success: true,
        message: "Bỏ cấm người dùng thành công.",
        user: unbannedUser,
      });
    } catch (error) {
      if (
        error.message.includes("không tồn tại") ||
        error.message.includes("chưa bị cấm")
      ) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: "Lỗi khi bỏ cấm người dùng",
        error: error.message,
      });
    }
  },
};

module.exports = userController;
