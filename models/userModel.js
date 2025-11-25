const db = require("../config/db");
const userSubscriptionService = require("../services/userSubscriptionService");
const userUsageService = require("../services/usageService");
require("dotenv").config();

const userModel = {
  getAllUsers: async () => {
    const queryText = `
      SELECT * FROM  "Users";
    `;
    const result = await db.query(queryText);
    return result.rows;
  },

  createUser: async (userData) => {
    const {
      username,
      password_hash,
      name,
      email,
      provider,
      provider_id,
      avatar_url,
      isVerify = false,
    } = userData;
    const queryText = `
      INSERT INTO "Users" (username, password_hash, name, email, provider, provider_id, avatar_url, "isVerify")
      VALUES  ($1, $2, $3, $4, $5, $6, $7, $8)
      
      RETURNING id, username, name, email;
    `;
    const values = [
      username,
      password_hash,
      name,
      email,
      provider,
      provider_id,
      avatar_url,
      isVerify,
    ];

    const result = await db.query(queryText, values);

    await userSubscriptionService.addSubscription(
      result.rows[0].id,
      process.env.FREE_PLAN_ID
    );
    await userUsageService.resetUsageCounters(result.rows[0].id, [
      "ai_lesson",
      "ai_translate",
    ]);

    return result.rows[0];
  },

  findUserById1: async (id, client = db) => {
    const result = await client.query('SELECT * FROM "Users" WHERE id = $1', [
      id,
    ]);
    return result.rows[0];
  },

  findUserByEmail: async (email) => {
    const queryText = `SELECT * FROM  "Users" WHERE email = $1;`;
    const result = await db.query(queryText, [email]);
    return result.rows[0];
  },

  findUserByUsername: async (username) => {
    const queryText = `SELECT * FROM  "Users" WHERE username = $1;`;
    const result = await db.query(queryText, [username]);

    return result.rows[0];
  },

  updateLastLogin: async (userId, loginTime) => {
    const queryText = `UPDATE "Users" SET last_login = $1 WHERE id = $2;`;
    await db.query(queryText, [loginTime, userId]);
  },

  createSession: async (userId, device, ipAddress) => {
    const queryText = `
      INSERT INTO "UserSessions" (user_id, device, ip_address)
      VALUES ($1, $2, $3);
    `;
    await db.query(queryText, [userId, device, ipAddress]);
  },

  updateDailyActivity: async (userId, date) => {
    const queryText = `
      INSERT INTO "UserDailyActivity" (user_id, date, login_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, date)
      DO UPDATE SET login_count = "UserDailyActivity".login_count + 1;
    `;
    await db.query(queryText, [userId, date]);
  },

  getUserStreak: async (userId) => {
    const queryText = `SELECT * FROM "UserStreaks" WHERE user_id = $1;`;
    const result = await db.query(queryText, [userId]);
    return result.rows[0];
  },

  createUserStreak: async (
    userId,
    currentStreak,
    longestStreak,
    lastLoginDate
  ) => {
    const queryText = `
      INSERT INTO "UserStreaks" (user_id, current_streak, longest_streak, last_login_date)
      VALUES ($1, $2, $3, $4);
    `;
    await db.query(queryText, [
      userId,
      currentStreak,
      longestStreak,
      lastLoginDate,
    ]);
  },

  updateUserStreak: async (
    userId,
    currentStreak,
    longestStreak,
    lastLoginDate
  ) => {
    const queryText = `
      UPDATE "UserStreaks"
      SET current_streak = $1, longest_streak = $2, last_login_date = $3
      WHERE user_id = $4;
    `;
    await db.query(queryText, [
      currentStreak,
      longestStreak,
      lastLoginDate,
      userId,
    ]);
  },

  findUserById: async (id) => {
    const queryText = `SELECT * FROM "Users" WHERE id = $1;`;
    const result = await db.query(queryText, [id]);
    return result.rows[0];
  },

  endUserSessionAndClearToken: async (userId, refreshToken) => {
    // Lấy một client từ connection pool để quản lý transaction
    // const client = await db.connect();
    const client = await db.pool.connect();

    try {
      // Bắt đầu transaction
      await client.query("BEGIN");

      // --- Thao tác 1: Tìm session hiện tại và tính toán thời gian online ---
      const findSessionQuery = `
                SELECT id, login_at 
                FROM "UserSessions" 
                WHERE user_id = $1 AND logout_at IS NULL 
                ORDER BY login_at DESC 
                LIMIT 1;
            `;
      const sessionResult = await client.query(findSessionQuery, [userId]);
      const currentSession = sessionResult.rows[0];

      if (currentSession) {
        // Tính toán số phút online của phiên này
        const loginAt = new Date(currentSession.login_at);
        const now = new Date();
        const durationMinutes = Math.round((now - loginAt) / (1000 * 60));

        // --- Thao tác 2: Cập nhật bản ghi session với thời gian logout ---
        const updateSessionQuery = `
                    UPDATE "UserSessions" SET logout_at = $1 WHERE id = $2;
                `;
        await client.query(updateSessionQuery, [now, currentSession.id]);

        // --- Thao tác 3: Cập nhật số phút online trong ngày ---
        if (durationMinutes > 0) {
          const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          const updateActivityQuery = `
                        UPDATE "UserDailyActivity" 
                        SET minutes_online = minutes_online + $1 
                        WHERE user_id = $2 AND date = $3;
                    `;
          await client.query(updateActivityQuery, [
            durationMinutes,
            userId,
            today,
          ]);
        }
      }

      // --- Thao tác 4: Xóa refresh token khỏi DB ---
      const deleteTokenQuery = `DELETE FROM "RefreshTokens" WHERE token = $1;`;
      await client.query(deleteTokenQuery, [refreshToken]);

      // Nếu tất cả thành công, commit transaction
      await client.query("COMMIT");
    } catch (error) {
      // Nếu có bất kỳ lỗi nào, rollback tất cả các thay đổi
      await client.query("ROLLBACK");
      console.error("Lỗi trong transaction khi logout:", error);
      throw new Error("Không thể hoàn tất quá trình đăng xuất.");
    } finally {
      // Luôn luôn giải phóng client trở lại pool
      client.release();
    }
  },

  findAllPaginated: async ({ limit, offset, searchTerm, roleFilter }) => {
    // Mảng để chứa các giá trị cho câu truy vấn có tham số, chống SQL Injection
    const queryParams = [];

    // --- Xây dựng câu truy vấn COUNT ---
    let countQuery = `SELECT COUNT(*) FROM "Users" u WHERE 1=1`;

    // --- Xây dựng câu truy vấn SELECT với JOIN để lấy thông tin subscription ---
    let selectQuery = `
      SELECT 
        u.id, u.username, u.name, u.avatar_url, u.email, u.provider, u.provider_id, 
        u.role, u.is_active, u."isVerify", u.community_points, u.level, u.badge_level, 
        u.language, u.created_at, u.last_login,
        CASE 
          WHEN us.id IS NOT NULL THEN json_build_object(
            'id', s.id,
            'name', s.name,
            'duration_months', s.duration_months,
            'price', s.price,
            'expiry_date', us.expiry_date,
            'is_active', us.is_active
          )
          ELSE NULL
        END as subscription
      FROM "Users" u
      LEFT JOIN "UserSubscriptions" us ON u.id = us.user_id 
        AND us.is_active = true 
        AND us.expiry_date > CURRENT_TIMESTAMP
      LEFT JOIN "Subscriptions" s ON us.subscription_id = s.id
      WHERE 1=1
    `;

    // --- Thêm điều kiện LỌC và TÌM KIẾM động ---

    // Lọc theo vai trò (roleFilter)
    if (roleFilter && roleFilter !== "all") {
      queryParams.push(roleFilter);
      const roleCondition = ` AND u.role = $${queryParams.length}`;
      countQuery += roleCondition;
      selectQuery += roleCondition;
    }

    // Tìm kiếm (searchTerm)
    if (searchTerm) {
      queryParams.push(`%${searchTerm}%`);
      const searchCondition = ` AND (username ILIKE $${queryParams.length} OR name ILIKE $${queryParams.length} OR email ILIKE $${queryParams.length})`;
      countQuery += searchCondition;
      selectQuery += searchCondition;
    }

    // --- Thực thi câu truy vấn COUNT để lấy tổng số bản ghi ---
    const totalResult = await db.query(countQuery, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    // --- Thêm SẮP XẾP và PHÂN TRANG vào câu truy vấn SELECT ---
    selectQuery += ` ORDER BY u.created_at DESC`;

    queryParams.push(limit);
    selectQuery += ` LIMIT $${queryParams.length}`;

    queryParams.push(offset);
    selectQuery += ` OFFSET $${queryParams.length}`;

    // --- Thực thi câu truy vấn SELECT để lấy danh sách người dùng ---
    const usersResult = await db.query(selectQuery, queryParams);

    return {
      users: usersResult.rows,
      totalItems: totalItems,
    };
  },

  // findUserDetailsById: async (id) => {
  //   const queryText = `
  //     SELECT id, username, name, avatar_url, email, provider, role,
  //            is_active, "isVerify", community_points, level, badge_level,
  //            language, created_at, last_login
  //     FROM "Users" WHERE id = $1;
  //   `;
  //   const result = await db.query(queryText, [id]);
  //   return result.rows[0];
  // },
  findUserDetailsById: async (id) => {
    const queryText = `
      SELECT 
        -- Chọn tất cả các cột từ bảng Users
        u.id, u.username, u.name, u.avatar_url, u.email, u.provider, u.role, 
        u.is_active, u."isVerify", u.community_points, u.level, u.badge_level, 
        u.language, u.created_at, u.last_login,

        -- Sử dụng json_build_object để nhóm thông tin huy hiệu vào một object
        -- Dùng COALESCE để đảm bảo trả về NULL nếu không có huy hiệu, thay vì object rỗng
        COALESCE(
          json_build_object(
            'level', bl.level,
            'name', bl.name,
            'icon', bl.icon,
            'min_points', bl.min_points
          ),
          NULL
        ) as badge,

        -- Tương tự, nhóm thông tin gói đăng ký vào một object
        COALESCE(
          json_build_object(
            'id', s.id,
            'name', s.name,
            'description', s.description,
            'start_date', us.start_date,
            'expiry_date', us.expiry_date,
            'auto_renew', us.auto_renew,
            'daily_quota_ai_lesson', s.daily_quota_ai_lesson,
            'daily_quota_translate', s.daily_quota_translate
          ),
          NULL
        ) as subscription

      FROM "Users" u

      -- Join với BadgeLevels dựa trên level
      LEFT JOIN "BadgeLevels" bl ON u.badge_level = bl.level

      -- Join với UserSubscriptions để tìm gói đang hoạt động của người dùng
      LEFT JOIN "UserSubscriptions" us ON u.id = us.user_id AND us.is_active = true
      
      -- Từ UserSubscriptions, join tiếp với Subscriptions để lấy chi tiết gói
      LEFT JOIN "Subscriptions" s ON us.subscription_id = s.id

      WHERE u.id = $1;
    `;
    const result = await db.query(queryText, [id]);

    // Vẫn trả về result.rows[0], nhưng object này giờ đã chứa thêm 2 trường 'badge' và 'subscription'
    return result.rows[0];
  },

  findUserAchievements: async (userId) => {
    const queryText = `
      SELECT 
        ua.id,
        ua.user_id,
        ua.achievement_id,
        a.name AS achievement_name,
        a.description,
        a.icon,
        a.points,
        ua.achieved_at
      FROM "UserAchievements" ua
      JOIN "Achievements" a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1
      ORDER BY ua.achieved_at DESC;
    `;
    const result = await db.query(queryText, [userId]);
    return result.rows;
  },

  findUserDailyActivities: async (userId, limit = 30) => {
    const queryText = `
      SELECT user_id, date, minutes_online, login_count
      FROM "UserDailyActivity"
      WHERE user_id = $1
      ORDER BY date DESC
      LIMIT $2;
    `;
    const result = await db.query(queryText, [userId, limit]);
    return result.rows;
  },

  findUserSessions: async (userId, limit = 10) => {
    const queryText = `
      SELECT id, user_id, login_at, logout_at, device, ip_address
      FROM "UserSessions"
      WHERE user_id = $1
      ORDER BY login_at DESC
      LIMIT $2;
    `;
    const result = await db.query(queryText, [userId, limit]);
    return result.rows;
  },

  findUserActiveSubscription: async (userId) => {
    const queryText = `
      SELECT s.*, us.start_date, us.expiry_date, us.auto_renew, us.is_active
      FROM "UserSubscriptions" us
      JOIN "Subscriptions" s ON us.subscription_id = s.id
      WHERE us.user_id = $1 AND us.is_active = true
      LIMIT 1;
    `;
    const result = await db.query(queryText, [userId]);
    return result.rows[0]; // Chỉ trả về một gói đang hoạt động
  },

  findUserUsage: async (userId) => {
    const queryText = `
      SELECT id, user_id, feature, daily_count, last_reset
      FROM "UserUsage"
      WHERE user_id = $1;
    `;
    const result = await db.query(queryText, [userId]);
    return result.rows;
  },

  updateUser: async (userId, updateData) => {
    // --- BƯỚC 1: ĐỊNH NGHĨA CÁC TRƯỜNG ĐƯỢC PHÉP CẬP NHẬT ---
    const allowedFields = [
      "name",
      "email",
      "avatar_url",
      "level",
      "language",
      "is_active",
      "isVerify",
    ];

    // --- BƯỚC 2: LỌC DỮ LIỆU ĐẦU VÀO ĐỂ CHỈ GIỮ LẠI CÁC TRƯỜNG HỢP LỆ ---
    const filteredUpdateData = Object.keys(updateData)
      .filter((key) => allowedFields.includes(key)) // Giữ lại các key có trong mảng allowedFields
      .reduce((obj, key) => {
        obj[key] = updateData[key]; // Tạo một object mới chỉ chứa dữ liệu hợp lệ
        return obj;
      }, {});

    // Lấy danh sách các trường sẽ thực sự được cập nhật từ object đã lọc
    const fieldsToUpdate = Object.keys(filteredUpdateData);

    // Nếu không có trường hợp lệ nào để cập nhật, trả về null
    if (fieldsToUpdate.length === 0) {
      console.log("Không có trường hợp lệ nào được cung cấp để cập nhật.");
      return null;
    }

    // --- CÁC BƯỚC CÒN LẠI GIỮ NGUYÊN LOGIC CỦA BẠN, NHƯNG SỬ DỤNG DỮ LIỆU ĐÃ LỌC ---

    // Xây dựng phần SET của câu truy vấn động
    const setClause = fieldsToUpdate
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(", ");

    // Lấy danh sách các giá trị tương ứng từ object đã lọc
    const values = Object.values(filteredUpdateData);

    // Xây dựng toàn bộ câu truy vấn
    const queryText = `
      UPDATE "Users"
      SET ${setClause}
      WHERE id = $${fieldsToUpdate.length + 1}
      RETURNING 
        id, username, name, avatar_url, email, role, is_active, 
        "isVerify", community_points, level, badge_level, language, 
        created_at, last_login;
    `;

    // Thêm userId vào cuối mảng values cho điều kiện WHERE
    const queryParams = [...values, userId];

    const result = await db.query(queryText, queryParams);

    // Trả về bản ghi đã được cập nhật
    return result.rows[0];
  },

  getAllUsers2: async () => {
    const queryText = `SELECT id, community_points, badge_level FROM "Users";`;
    const result = await db.query(queryText);
    return result.rows;
  },

  updateUserBadge: async (userId, newBadgeLevel) => {
    const queryText = `UPDATE "Users" SET badge_level = $1 WHERE id = $2 RETURNING id, username, badge_level, community_points;`;
    const result = await db.query(queryText, [newBadgeLevel, userId]);
    const updatedUser = result.rows[0];

    // Gửi thông báo khi nhận huy hiệu mới
    try {
      const badgeQuery = `SELECT * FROM "BadgeLevels" WHERE level = $1`;
      const badgeResult = await db.query(badgeQuery, [newBadgeLevel]);
      const badge = badgeResult.rows[0];

      if (badge) {
        const notificationService = require("../services/notificationService");
        await notificationService.createNotification(
          {
            recipient_id: userId,
            audience: "user",
            type: "system",
            title: "Bạn đã nhận huy hiệu mới!",
            content: `Chúc mừng! Bạn đã đạt huy hiệu "${badge.name}" (Level ${
              badge.level
            }). ${badge.rule_description || ""}. Điểm cộng đồng hiện tại: ${
              updatedUser.community_points
            }/${
              badge.min_points
            }. Thời gian đạt được: ${new Date().toLocaleString("vi-VN")}.`,
            redirect_type: "profile",
            data: {
              id: userId,
              data: `Huy hiệu: ${badge.name}\nLevel: ${badge.level}\nMô tả: ${
                badge.rule_description || "Không có mô tả"
              }\nĐiểm tối thiểu: ${badge.min_points}\nĐiểm hiện tại: ${
                updatedUser.community_points
              }\nThời gian: ${new Date().toLocaleString("vi-VN")}`,
            },
            priority: 2,
            from_system: true,
          },
          true
        ); // auto push = true
      }
    } catch (notifError) {
      console.error("Error sending badge notification:", notifError);
      // Không throw để không ảnh hưởng đến việc cập nhật badge
    }

    return updatedUser;
  },

  addAchievement: async (options) => {
    const { userId, achievementId, progress, pointsToAdd } = options;

    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      // Thao tác 1: Thêm bản ghi vào UserAchievements
      const insertQuery = `
        INSERT INTO "UserAchievements" (user_id, achievement_id, progress)
        VALUES ($1, $2, $3)
        RETURNING *;
      `;
      // Nếu progress không được cung cấp, nó sẽ là null, db sẽ xử lý.
      const insertResult = await client.query(insertQuery, [
        userId,
        achievementId,
        progress,
      ]);

      // Thao tác 2: Cập nhật điểm cộng đồng cho người dùng
      if (pointsToAdd > 0) {
        const updatePointsQuery = `
          UPDATE "Users"
          SET community_points = community_points + $1
          WHERE id = $2;
        `;
        await client.query(updatePointsQuery, [pointsToAdd, userId]);
      }

      await client.query("COMMIT");

      const userAchievement = insertResult.rows[0];

      // Gửi thông báo khi đạt achievement
      try {
        const achievementModel = require("./achievementModel");
        const achievement = await achievementModel.findById(achievementId);

        if (achievement) {
          const pointsEarned = pointsToAdd || achievement.points || 0;
          const notificationService = require("../services/notificationService");
          await notificationService.createNotification(
            {
              recipient_id: userId,
              audience: "user",
              type: "achievement",
              title: "Bạn đã đạt thành tích mới!",
              content: {
                html: `<h3>🎉 Chúc mừng! Bạn đã mở khóa thành tích mới!</h3>
<p>Bạn đã đạt thành tích <strong>"${achievement.name}"</strong>.</p>
${achievement.description ? `<p><em>${achievement.description}</em></p>` : ""}
<p>🎁 <strong>Phần thưởng:</strong> +${pointsEarned} điểm cộng đồng</p>
${progress ? `<p>📈 <strong>Tiến độ:</strong> ${progress}</p>` : ""}
<p><small>Hãy tiếp tục phát huy để mở khóa thêm nhiều thành tích khác!</small></p>`,
              },
              redirect_type: "achievement",
              data: {
                id: achievementId,
                data: `Thành tích: ${achievement.name}\nMô tả: ${
                  achievement.description || "Không có mô tả"
                }\nĐiểm nhận được: ${pointsEarned}\n${
                  progress ? `Tiến độ: ${progress}\n` : ""
                }Thời gian: ${new Date().toLocaleString("vi-VN")}`,
              },
              priority: 2,
              from_system: true,
            },
            true
          ); // auto push = true
        }
      } catch (notifError) {
        console.error("Error sending achievement notification:", notifError);
        // Không throw để không ảnh hưởng đến việc gán achievement
      }

      return userAchievement;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Lỗi trong transaction khi gán thành tích:", error);
      throw error;
    } finally {
      client.release();
    }
  },

  findExamHistory: async ({ userId, limit, offset }) => {
    const baseQuery = `FROM "User_Exam_Attempts" uea JOIN "Exams" e ON uea.exam_id = e.id WHERE uea.user_id = $1 AND uea.end_time IS NOT NULL`;

    const countQuery = `SELECT COUNT(*) ${baseQuery}`;
    const countResult = await db.query(countQuery, [userId]);
    const totalItems = parseInt(countResult.rows[0].count, 10);

    const selectQuery = `
        SELECT uea.id, e.name as exam_name, uea.score_total, uea.is_passed, uea.end_time
        ${baseQuery}
        ORDER BY uea.end_time DESC
        LIMIT $2 OFFSET $3;
    `;
    const historyResult = await db.query(selectQuery, [userId, limit, offset]);

    return { history: historyResult.rows, totalItems };
  },

  findViolationsByUserId: async (userId) => {
    // Lấy thông tin vi phạm và các luật liên quan
    const queryText = `
      SELECT 
        v.*,
        (
          SELECT json_agg(cr.title) 
          FROM "ViolationRules" vr 
          JOIN "CommunityRules" cr ON vr.rule_id = cr.id
          WHERE vr.violation_id = v.id
        ) as rules
      FROM "Violations" v
      WHERE v.user_id = $1
      ORDER BY v.created_at DESC;
    `;
    const result = await db.query(queryText, [userId]);
    return result.rows;
  },

  deleteById: async (userId) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Xóa tất cả dữ liệu liên quan theo thứ tự
      
      // 1. Xóa dữ liệu community
      await client.query(`DELETE FROM "User_Answers" WHERE attempt_id IN (SELECT id FROM "User_Exam_Attempts" WHERE user_id = $1)`, [userId]);
      await client.query(`DELETE FROM "User_Exam_Attempts" WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM "PostLikes" WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM "PostViews" WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM "Comments" WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM "Posts" WHERE user_id = $1`, [userId]);
      
      // 2. Xóa dữ liệu moderation
      await client.query(`DELETE FROM "Appeals" WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM "Violations" WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM "Reports" WHERE reporter_id = $1`, [userId]);
      
      // 3. Xóa dữ liệu payment & subscription
      await client.query(`DELETE FROM "Refunds" WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM "Payments" WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM "UserSubscriptions" WHERE user_id = $1`, [userId]);
      
      // 4. Xóa dữ liệu AI & learning
      await client.query(`DELETE FROM "TranslationHistory" WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM "AILessons" WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM "Notebooks" WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM "UserUsage" WHERE user_id = $1`, [userId]);
      
      // 5. Xóa dữ liệu achievements & activity
      await client.query(`DELETE FROM "UserAchievements" WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM "UserStreaks" WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM "UserDailyActivity" WHERE user_id = $1`, [userId]);
      
      // 6. Xóa dữ liệu session & auth
      await client.query(`DELETE FROM "UserSessions" WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM "RefreshTokens" WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM "DeviceTokens" WHERE user_id = $1`, [userId]);
      
      // 7. Xóa notifications
      await client.query(`DELETE FROM "Notifications" WHERE recipient_id = $1`, [userId]);
      
      // 8. Cuối cùng xóa user
      const result = await client.query(`DELETE FROM "Users" WHERE id = $1`, [userId]);
      
      await client.query('COMMIT');
      return result.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting user:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  resetUserQuota: async (userId, feature) => {
    const queryText = `
      UPDATE "UserUsage"
      SET daily_count = 0, last_reset = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND feature = $2;
    `;
    const result = await db.query(queryText, [userId, feature]);
    // result.rowCount sẽ là 1 nếu cập nhật thành công, 0 nếu không tìm thấy bản ghi nào để cập nhật
    return result.rowCount > 0;
  },

  resetAllUserQuotas: async (userId, client = db) => {
    const queryText = `
      UPDATE "UserUsage"
      SET daily_count = 0, last_reset = CURRENT_TIMESTAMP
      WHERE user_id = $1;
    `;
    // Chúng ta không cần quan tâm đến kết quả, chỉ cần thực thi
    await client.query(queryText, [userId]);
  },

  findUserByUsernameForAuth: async (username) => {
    const queryText = `SELECT id, username, password_hash FROM "Users" WHERE username = $1;`;
    const result = await db.query(queryText, [username]);
    return result.rows[0];
  },

  // Tìm user theo ID và trả về password_hash để xác thực
  findUserByIdForAuth: async (id) => {
    const queryText = `SELECT id, password_hash FROM "Users" WHERE id = $1;`;
    const result = await db.query(queryText, [id]);
    return result.rows[0];
  },

  // Cập nhật mật khẩu mới
  updatePassword: async (userId, newPasswordHash) => {
    // Có thể bạn muốn cập nhật thêm trường 'updated_at' hoặc 'last_password_change' nếu có
    const queryText = `
      UPDATE "Users"
      SET password_hash = $1
      WHERE id = $2;
    `;
    await db.query(queryText, [newPasswordHash, userId]);
  },

  getUserStats: async (userId) => {
    // Sử dụng Promise.all để lấy các thông số song song
    const [postCountRes, likesReceivedRes, streakRes] = await Promise.all([
      db.query(
        `SELECT COUNT(*) FROM "Posts" WHERE user_id = $1 AND deleted_at IS NULL`,
        [userId]
      ),
      db.query(
        `SELECT COALESCE(SUM(likes), 0) as total FROM "Posts" WHERE user_id = $1 AND deleted_at IS NULL`,
        [userId]
      ),
      db.query(`SELECT current_streak FROM "UserStreaks" WHERE user_id = $1`, [
        userId,
      ]),
    ]);

    return {
      post_count: parseInt(postCountRes.rows[0].count, 10),
      likes_received_count: parseInt(likesReceivedRes.rows[0].total, 10),
      current_streak: streakRes.rows[0] ? streakRes.rows[0].current_streak : 0,
      // Thêm các stats khác ở đây...
    };
  },

  findUserBadgeDetails: async (userId) => {
    const queryText = `
      SELECT 
        bl.id,
        bl.level,
        bl.name,
        bl.icon,
        bl.min_points,
        bl.rule_description,
        bl.is_active,
        bl.created_at,
        bl.updated_at
      FROM "Users" u
      JOIN "BadgeLevels" bl ON u.badge_level = bl.level
      WHERE u.id = $1;
    `;

    const result = await db.query(queryText, [userId]);

    // Trả về bản ghi đầu tiên, hoặc undefined nếu không tìm thấy (user không tồn tại hoặc badge_level không hợp lệ)
    return result.rows[0];
  },

  addCommunityPoints: async (userId, points) => {
    const queryText = `
            UPDATE "Users" 
            SET community_points = community_points + $1 
            WHERE id = $2
            RETURNING community_points;
        `;

    const result = await db.query(queryText, [points, userId]);
    const newTotalPoints = result.rows[0]?.community_points || 0;

    // Cập nhật tiến độ thành tích community_points với giá trị tuyệt đối
    try {
      const achievementService = require('../services/achievementService');
      await achievementService.updateProgress(userId, "community_points", newTotalPoints, true);
    } catch (error) {
      console.error("Lỗi khi cập nhật tiến độ thành tích community_points:", error);
      // Không throw để không ảnh hưởng đến flow chính
    }

    return newTotalPoints;
  },
};

module.exports = userModel;
