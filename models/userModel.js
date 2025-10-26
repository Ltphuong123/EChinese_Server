const db = require('../config/db');

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
      provider ,
      provider_id
    } = userData;
    const queryText = `
      INSERT INTO "Users" (username, password_hash, name, email, provider, provider_id)
      VALUES  ($1, $2, $3, $4, $5, $6)
      
      RETURNING id, username, name, email;
    `;
    const values = [
      username,
      password_hash,
      name,
      email,
      provider,
      provider_id
    ];
    const result = await db.query(queryText, values);
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

  createUserStreak: async (userId, currentStreak, longestStreak, lastLoginDate) => {
    const queryText = `
      INSERT INTO "UserStreaks" (user_id, current_streak, longest_streak, last_login_date)
      VALUES ($1, $2, $3, $4);
    `;
    await db.query(queryText, [userId, currentStreak, longestStreak, lastLoginDate]);
  },

  updateUserStreak: async (userId, currentStreak, longestStreak, lastLoginDate) => {
    const queryText = `
      UPDATE "UserStreaks"
      SET current_streak = $1, longest_streak = $2, last_login_date = $3
      WHERE user_id = $4;
    `;
    await db.query(queryText, [currentStreak, longestStreak, lastLoginDate, userId]);
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
            await client.query('BEGIN');

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
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const updateActivityQuery = `
                        UPDATE "UserDailyActivity" 
                        SET minutes_online = minutes_online + $1 
                        WHERE user_id = $2 AND date = $3;
                    `;
                    await client.query(updateActivityQuery, [durationMinutes, userId, today]);
                }
            }

            // --- Thao tác 4: Xóa refresh token khỏi DB ---
            const deleteTokenQuery = `DELETE FROM "RefreshTokens" WHERE token = $1;`;
            await client.query(deleteTokenQuery, [refreshToken]);

            // Nếu tất cả thành công, commit transaction
            await client.query('COMMIT');

        } catch (error) {
            // Nếu có bất kỳ lỗi nào, rollback tất cả các thay đổi
            await client.query('ROLLBACK');
            console.error('Lỗi trong transaction khi logout:', error);
            throw new Error('Không thể hoàn tất quá trình đăng xuất.');
        } finally {
            // Luôn luôn giải phóng client trở lại pool
            client.release();
        }
  },

  findAllPaginated: async ({ limit, offset, searchTerm, roleFilter }) => {
    // Mảng để chứa các giá trị cho câu truy vấn có tham số, chống SQL Injection
    const queryParams = [];
    
    // --- Xây dựng câu truy vấn COUNT ---
    let countQuery = `SELECT COUNT(*) FROM "Users" WHERE 1=1`;
    
    // --- Xây dựng câu truy vấn SELECT ---
    // Luôn chỉ định rõ các cột để tránh lấy password_hash
    let selectQuery = `
      SELECT 
        id, username, name, avatar_url, email, role, is_active, 
        "isVerify", community_points, level, badge_level, language, 
        created_at, last_login 
      FROM "Users" WHERE 1=1
    `;
    
    // --- Thêm điều kiện LỌC và TÌM KIẾM động ---
    
    // Lọc theo vai trò (roleFilter)
    if (roleFilter && roleFilter !== 'all') {
      queryParams.push(roleFilter);
      const roleCondition = ` AND role = $${queryParams.length}`;
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
    selectQuery += ` ORDER BY created_at DESC`;
    
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

  findUserDetailsById: async (id) => {
    const queryText = `
      SELECT id, username, name, avatar_url, email, provider, role, 
             is_active, "isVerify", community_points, level, badge_level, 
             language, created_at, last_login 
      FROM "Users" WHERE id = $1;
    `;
    const result = await db.query(queryText, [id]);
    return result.rows[0];
  },

  findUserAchievements: async (userId) => {
    const queryText = `
      SELECT a.name, a.description, a.icon, a.points, ua.achieved_at
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
      SELECT date, minutes_online, login_count
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
      SELECT login_at, logout_at, device, ip_address
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
      SELECT s.*, us.start_date, us.expiry_date, us.auto_renew
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
      SELECT feature, daily_count, last_reset
      FROM "UserUsage"
      WHERE user_id = $1;
    `;
    const result = await db.query(queryText, [userId]);
    return result.rows;
  },

  updateUser: async (userId, updateData) => {
    // Lấy danh sách các trường cần cập nhật từ keys của object
    const fieldsToUpdate = Object.keys(updateData);

    // Nếu không có trường nào để cập nhật, trả về null
    if (fieldsToUpdate.length === 0) {
      return null;
    }

    // Xây dựng phần SET của câu truy vấn động
    // Ví dụ: "name" = $1, "role" = $2, "is_active" = $3
    const setClause = fieldsToUpdate
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(', ');

    // Lấy danh sách các giá trị tương ứng với các trường
    const values = Object.values(updateData);

    // return setClause
    // Xây dựng toàn bộ câu truy vấn
    // Sử dụng RETURNING để trả về dữ liệu đã cập nhật ngay lập tức,
    // giúp tiết kiệm một câu lệnh SELECT.
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
    const queryText = `UPDATE "Users" SET badge_level = $1 WHERE id = $2 RETURNING id, username, badge_level;`;
    const result = await db.query(queryText, [newBadgeLevel, userId]);
    return result.rows[0];
  },

  addAchievement: async (options) => {
    const { userId, achievementId, progress, pointsToAdd } = options;
    
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Thao tác 1: Thêm bản ghi vào UserAchievements
      const insertQuery = `
        INSERT INTO "UserAchievements" (user_id, achievement_id, progress)
        VALUES ($1, $2, $3)
        RETURNING *;
      `;
      // Nếu progress không được cung cấp, nó sẽ là null, db sẽ xử lý.
      const insertResult = await client.query(insertQuery, [userId, achievementId, progress]);
      
      // Thao tác 2: Cập nhật điểm cộng đồng cho người dùng
      if (pointsToAdd > 0) {
        const updatePointsQuery = `
          UPDATE "Users"
          SET community_points = community_points + $1
          WHERE id = $2;
        `;
        await client.query(updatePointsQuery, [pointsToAdd, userId]);
      }

      await client.query('COMMIT');
      
      return insertResult.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Lỗi trong transaction khi gán thành tích:', error);
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
    // Nhờ có ON DELETE CASCADE, các dữ liệu liên quan trong các bảng
    // UserSessions, UserDailyActivity, UserStreaks, UserAchievements, 
    // UserSubscriptions, Notebooks, AILessons, TranslationHistory, UserUsage,
    // Violations, Appeals, RefreshTokens sẽ tự động được xóa.
    const queryText = `DELETE FROM "Users" WHERE id = $1;`;
    const result = await db.query(queryText, [userId]);
    return result.rowCount > 0;
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



};

module.exports = userModel;