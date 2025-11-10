const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const refreshTokenModel = require("../models/refreshTokenModel");
const achievementModel = require("../models/achievementModel");
const userSubscriptionModel = require("../models/userSubscriptionModel");

require("dotenv").config();
const db = require("../config/db");

const saltRounds = 10;

const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION || "1d",
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION || "7d",
  });
};

const userService = {
  createUser: async (userData) => {
    if (!userData || typeof userData !== "object") {
      throw new Error("Dữ liệu đầu vào không hợp lệ");
    }

    const data = { ...userData };

    if (data.password && typeof data.password === "string") {
      data.password_hash = await bcrypt.hash(data.password, saltRounds);
      delete data.password;
    } else {
      data.password_hash = null;
    }
    const newUser = await userModel.createUser(data);

    return { ...newUser };
  },

  login: async ({ username, password, ip_address, device }) => {
    // 1. Tìm người dùng
    const user = await userModel.findUserByUsername(username);
    if (!user) {
      throw new Error("Tên đăng nhập không tồn tại.");
    }
    if (!user.is_active) {
      throw new Error("Tài khoản đã bị vô hiệu hóa.");
    }

    if (
      !user.password_hash ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      throw new Error("Mật khẩu không đúng");
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Lưu refresh token vào DB
    await refreshTokenModel.createToken({
      user_id: user.id,
      token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // // Chạy các tác vụ đồng bộ song song để tối ưu hiệu suất
    await Promise.all([
      userModel.updateLastLogin(user.id, now),
      userModel.createSession(user.id, ip_address, device),
      userModel.updateDailyActivity(user.id, today),
      userService.updateLoginStreak(user.id, today),
    ]);

    const user2 = await userModel.findUserDetailsById(user.id);

    return {
      token: accessToken,
      refreshToken: refreshToken,
      user: user2,
    };
  },

  googleLogin: async ({ email, name, avatar_url, ip_address, device }) => {
    // 1. Kiểm tra nếu user đã tồn tại
    let user = await userModel.findUserByEmail(email);
    if (!user) {
      // 2. Nếu chưa tồn tại, tạo user mới
      const newUserData = {
        username: null,
        password_hash: null,
        email,
        name,
        provider: "google",
        provider_id: null,
        avatar_url,
      };
      user = await userModel.createUser(newUserData);
    }
    // 3. Tạo token
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Lưu refresh token vào DB
    await refreshTokenModel.createToken({
      user_id: user.id,
      token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // // Chạy các tác vụ đồng bộ song song để tối ưu hiệu suất
    await Promise.all([
      userModel.updateLastLogin(user.id, now),
      userModel.createSession(user.id, ip_address, device),
      userModel.updateDailyActivity(user.id, today),
      userService.updateLoginStreak(user.id, today),
    ]);
    const user2 = await userModel.findUserDetailsById(user.id);

    // const { password_hash, ...userWithoutPassword } = user;

    return {
      token: accessToken,
      refreshToken: refreshToken,
      user: user2,
    };
  },

  updateLoginStreak: async (userId, loginDate) => {
    const streak = await userModel.getUserStreak(userId);
    const today = loginDate;

    if (!streak) {
      // Nếu user chưa có record streak, tạo mới
      return userModel.createUserStreak(userId, 1, 1, today);
    }

    const lastLogin = new Date(streak.last_login_date);
    const diffTime = today - lastLogin;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Đăng nhập vào ngày hôm sau -> tăng streak
      const newCurrentStreak = streak.current_streak + 1;
      const newLongestStreak = Math.max(
        newCurrentStreak,
        streak.longest_streak
      );
      return userModel.updateUserStreak(
        userId,
        newCurrentStreak,
        newLongestStreak,
        today
      );
    } else if (diffDays > 1) {
      // Bỏ lỡ ngày đăng nhập -> reset streak về 1
      return userModel.updateUserStreak(
        userId,
        1,
        streak.longest_streak,
        today
      );
    }
    // Nếu đăng nhập lại trong cùng ngày (diffDays === 0), không làm gì cả
  },

  refreshToken: async (refresh_token) => {
    if (!refresh_token) throw new Error("Thiếu refresh token");

    // Kiểm tra trong DB
    const result = await db.query(
      `SELECT * FROM "RefreshTokens" WHERE token = $1 AND expires_at > NOW()`,
      [refresh_token]
    );
    if (result.rowCount === 0)
      throw new Error("Refresh token không hợp lệ hoặc đã hết hạn");

    // Verify token
    const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);

    const user = await userModel.findUserById(decoded.id);
    if (!user) throw new Error("User không tồn tại");

    const newAccessToken = generateAccessToken(user);
    return { access_token: newAccessToken };
  },

  logout: async (refreshToken) => {
    const storedToken = await refreshTokenModel.findToken(refreshToken);
    if (!storedToken) {
      throw new Error("Refresh token không hợp lệ hoặc đã hết hạn.");
    }
    const { user_id } = storedToken;
    await userModel.endUserSessionAndClearToken(user_id, refreshToken);

    return { success: true, message: "Đăng xuất thành công." };
  },

  getUsersAdmin: async ({ page, limit, searchTerm, roleFilter }) => {
    const offset = (page - 1) * limit;

    // Gọi model để lấy dữ liệu từ DB
    const { users, totalItems } = await userModel.findAllPaginated({
      limit,
      offset,
      searchTerm,
      roleFilter,
    });

    // Tính toán tổng số trang
    const totalPages = Math.ceil(totalItems / limit);

    return {
      users,
      totalItems,
      totalPages,
      currentPage: page,
    };
  },

  getUserDetailsAdmin: async (userId) => {
    // Sử dụng Promise.all để chạy tất cả các truy vấn song song, tăng hiệu suất
    const [
      user,
      achievements,
      dailyActivities,
      sessions,
      streak,
      subscription,
      usage,
    ] = await Promise.all([
      userModel.findUserDetailsById(userId), // Lấy thông tin cơ bản
      userModel.findUserAchievements(userId), // Lấy thành tựu
      userModel.findUserDailyActivities(userId, 30), // Lấy 30 hoạt động gần nhất
      userModel.findUserSessions(userId, 10), // Lấy 10 phiên đăng nhập gần nhất
      userModel.getUserStreak(userId), // Lấy chuỗi đăng nhập
      userModel.findUserActiveSubscription(userId), // Lấy gói đăng ký đang hoạt động
      userModel.findUserUsage(userId), // Lấy thông tin sử dụng tính năng
    ]);

    // Nếu không tìm thấy thông tin user cơ bản, trả về lỗi
    if (!user) {
      throw new Error("Người dùng không tồn tại.");
    }

    // Tổng hợp tất cả dữ liệu vào một object duy nhất
    return {
      user,
      achievements,
      dailyActivities,
      sessions,
      streak: streak || null, // Trả về null nếu user chưa có streak
      subscription: subscription || null, // Trả về null nếu user không có gói active
      usage,
    };
  },

  updateUserAdmin: async (userId, updateData) => {
    // Tạo một bản sao của dữ liệu để tránh thay đổi object gốc
    const safeUpdateData = { ...updateData };

    // --- BIỆN PHÁP BẢO MẬT ---
    // Không cho phép cập nhật mật khẩu trực tiếp qua API này.
    // Nên có một API riêng cho việc "đặt lại mật khẩu" nếu cần.
    delete safeUpdateData.password;
    delete safeUpdateData.password_hash;
    // Không cho phép cập nhật ID
    delete safeUpdateData.id;
    // Không cho phép cập nhật các trường do hệ thống quản lý
    delete safeUpdateData.created_at;
    delete safeUpdateData.last_login;

    const updatedUser = await userModel.updateUser(userId, safeUpdateData);

    if (!updatedUser) {
      throw new Error("Người dùng không tồn tại.");
    }

    return updatedUser;
  },

  grantAchievementToUser: async (options) => {
    const { userId, achievementId, progress } = options;

    // Sử dụng Promise.all để kiểm tra song song, tăng hiệu suất
    const [userExists, achievementExists] = await Promise.all([
      userModel.findUserById(userId),
      achievementModel.findById(achievementId),
    ]);

    if (!userExists) {
      throw new Error("Người dùng không tồn tại.");
    }
    if (!achievementExists) {
      throw new Error("Thành tích không tồn tại.");
    }

    // Lấy điểm từ achievement để cộng cho user
    const pointsToAdd = achievementExists.points || 0;

    // Gọi model để thực hiện gán trong một transaction
    const newUserAchievement = await userModel.addAchievement({
      userId,
      achievementId,
      progress,
      pointsToAdd,
    });

    return newUserAchievement;
  },

  getUserExamHistory: async ({ userId, page, limit }) => {
    const offset = (page - 1) * limit;
    const { history, totalItems } = await userModel.findExamHistory({
      userId,
      limit,
      offset,
    });
    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: history,
      meta: { page, limit, total: totalItems, totalPages },
    };
  },

  getViolationsByUserId: async (userId) => {
    return await userModel.findViolationsByUserId(userId);
  },

  deleteUserPermanently: async (userIdToDelete, adminId) => {
    if (userIdToDelete === adminId) {
      throw new Error("Admins cannot delete their own account.");
    }

    const userToDelete = await userModel.findUserById(userIdToDelete);
    if (!userToDelete) {
      throw new Error("User not found.");
    }

    // Thêm quy tắc nghiệp vụ: không cho phép xóa super admin
    if (userToDelete.role === "super admin") {
      throw new Error("Cannot delete a super admin account.");
    }

    // Các hành động khác có thể được thêm ở đây trước khi xóa,
    // ví dụ: ghi log chi tiết vào một bảng riêng,
    // chuyển quyền sở hữu các tài nguyên (bài viết,...) cho một user hệ thống.

    const success = await userModel.deleteById(userIdToDelete);
    if (!success) {
      // Trường hợp này hiếm khi xảy ra nếu findUserById đã thành công,
      // nhưng vẫn nên có để đảm bảo.
      throw new Error("Failed to delete user from the database.");
    }

    // Ghi log hành động xóa
    // await adminLogModel.create({ userId: adminId, action: 'DELETE_USER', targetId: userIdToDelete, ... });

    return { success: true };
  },

  resetQuota: async (userId, feature) => {
    const validFeatures = ["ai_lesson", "ai_translate"];
    if (!validFeatures.includes(feature)) {
      throw new Error(
        `Invalid feature specified. Must be one of: ${validFeatures.join(
          ", "
        )}.`
      );
    }

    // Kiểm tra xem người dùng có tồn tại không
    const user = await userModel.findUserById(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    return await userModel.resetUserQuota(userId, feature);
  },

  getUserUsageInfo: async (userId) => {
    // 1. Lấy gói đăng ký đang hoạt động của người dùng
    const activeUserSub =
      await userSubscriptionModel.findActiveSubscriptionByUserId(userId);

    let subscriptionPlan = null;
    if (activeUserSub) {
      subscriptionPlan = await userSubscriptionModel.findSubscriptionById(
        activeUserSub.subscription_id
      );
    } else {
      // Nếu không có gói active, có thể tìm một gói "Free" mặc định nếu hệ thống của bạn có
      // subscriptionPlan = await userSubscriptionModel.findByName('Free'); // Ví dụ
    }

    // 2. Lấy thông tin sử dụng hiện tại của người dùng
    const usages = await userModel.findUserUsage(userId); // Giả sử hàm này đã có hoặc cần tạo

    // 3. Xử lý logic reset nếu đã sang ngày mới
    const processedUsages = [];
    const today = new Date().toDateString();

    for (const usage of usages) {
      const lastResetDate = new Date(usage.last_reset).toDateString();
      if (lastResetDate !== today) {
        // Đã sang ngày mới, reset và trả về count = 0
        await userModel.resetUserQuota(userId, usage.feature);
        processedUsages.push({ ...usage, daily_count: 0 });
      } else {
        processedUsages.push(usage);
      }
    }

    // 4. Tổng hợp dữ liệu
    const usageMap = new Map(
      processedUsages.map((u) => [u.feature, u.daily_count])
    );

    const features = [
      {
        name: "ai_lesson",
        quota: subscriptionPlan?.daily_quota_ai_lesson ?? 0,
      },
      {
        name: "ai_translate",
        quota: subscriptionPlan?.daily_quota_translate ?? 0,
      },
    ];

    const result = features.map((feature) => ({
      feature: feature.name,
      used: usageMap.get(feature.name) || 0,
      quota: feature.quota,
      remaining: Math.max(0, feature.quota - (usageMap.get(feature.name) || 0)),
    }));

    return {
      subscriptionName: subscriptionPlan?.name || "Free User",
      expiryDate: activeUserSub?.expiry_date || null,
      usages: result,
    };
  },

  getUserProfile: async (userId) => {
    // Chúng ta có thể dùng lại hàm findUserDetailsById đã viết cho admin
    const userProfile = await userModel.findUserDetailsById(userId);

    if (!userProfile) {
      throw new Error("Người dùng không tồn tại.");
    }

    return userProfile;
  },

  updateUserProfile: async (userId, updateData) => {
    // --- LỚP BẢO MẬT: Chỉ cho phép cập nhật các trường được chỉ định ---
    const allowedFields = ["name", "avatar_url", "language"];
    const safeUpdateData = {};

    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key)) {
        safeUpdateData[key] = updateData[key];
      }
    });

    if (Object.keys(safeUpdateData).length === 0) {
      // Nếu người dùng chỉ gửi các trường không được phép,
      // chúng ta coi như không có gì để cập nhật.
      // Trả về thông tin user hiện tại.
      return userModel.findUserDetailsById(userId);
    }

    // Chúng ta có thể dùng lại hàm updateUser đã viết cho admin,
    // vì nó đã được thiết kế để xử lý dữ liệu động một cách an toàn.
    const updatedUser = await userModel.updateUser(userId, safeUpdateData);

    return updatedUser;
  },

  changePassword: async (username, oldPassword, newPassword) => {
    // 1. Tìm user để lấy password hash hiện tại
    // Chúng ta cần một hàm model trả về cả password_hash
    const user = await userModel.findUserByUsernameForAuth(username);

    if (!user) {
      throw new Error("Tên đăng nhập không tồn tại.");
    }

    // 2. So sánh mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      throw new Error("Mật khẩu cũ không chính xác.");
    }

    // 3. Mã hóa mật khẩu mới
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 4. Cập nhật vào database
    await userModel.updatePassword(user.id, newPasswordHash);
  },

  // --- HÀM MỚI 2 ---
  resetPassword: async (userId, oldPassword, newPassword) => {
    // 1. Tìm user theo ID
    const user = await userModel.findUserByIdForAuth(userId);

    if (!user) {
      throw new Error("Người dùng không tồn tại.");
    }

    // 2. So sánh mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      throw new Error("Mật khẩu cũ không chính xác.");
    }

    // 3. Mã hóa mật khẩu mới
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 4. Cập nhật vào database
    await userModel.updatePassword(userId, newPasswordHash);
  },

  getUserBadgeDetails: async (userId) => {
    const badge = await userModel.findUserBadgeDetails(userId);

    // Nếu không tìm thấy user hoặc user không có badge (badge_level=0 hoặc null) và không join được
    if (!badge) {
      // Bạn có thể quyết định trả về lỗi hoặc một huy hiệu mặc định.
      // Ở đây chúng ta trả về lỗi để rõ ràng.
      throw new Error("Không tìm thấy thông tin huy hiệu cho người dùng này.");
      // Hoặc trả về một object mặc định:
      // return { level: 0, name: "Chưa có huy hiệu", icon: null, min_points: 0 };
    }

    return badge;
  },
};

module.exports = userService;
