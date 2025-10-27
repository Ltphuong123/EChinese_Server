// file: services/achievementService.js
const db = require('../config/db');
const achievementModel = require('../models/achievementModel');
const userModel = require('../models/userModel');
const userService = require('../services/userService');



const achievementService = {
  createAchievement: async (payload) => {
    // Hiện tại, service chỉ cần truyền dữ liệu xuống model.
    // Trong tương lai, có thể thêm logic kiểm tra xem 'criteria.type' có hợp lệ không.
    const newAchievement = await achievementModel.create(payload);
    return newAchievement;
  },

  getPaginatedAchievements: async (filters) => {
    const { page, limit } = filters;
    const offset = (page - 1) * limit;

    const { achievements, totalItems } = await achievementModel.findAllPaginated({
      ...filters,
      limit,
      offset,
    });
    
    const totalPages = Math.ceil(totalItems / limit);
    
    return {
      data: achievements,
      meta: {
        page,
        limit,
        total: totalItems,
        totalPages,
      }
    };
  },

  getUsersForAchievement: async (options) => {
    const { achievementId, page, limit } = options;
    const offset = (page - 1) * limit;

    // Kiểm tra xem achievement có tồn tại không
    const achievementExists = await achievementModel.findById(achievementId);
    if (!achievementExists) {
        throw new Error('Thành tích không tồn tại.');
    }

    const { users, totalItems } = await achievementModel.findUsersByAchievementId({
      achievementId,
      limit,
      offset,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: users,
      meta: {
        page,
        limit,
        total: totalItems,
        totalPages,
      }
    };
  },

  updateAchievement: async (id, payload) => {
    // Không cho phép cập nhật các trường hệ thống
    const safePayload = { ...payload };
    delete safePayload.id;
    delete safePayload.created_at;

    const updatedAchievement = await achievementModel.update(id, safePayload);
    if (!updatedAchievement) {
      throw new Error('Thành tích không tồn tại.');
    }
    return updatedAchievement;
  },

  deleteAchievement: async (id) => {
    // Logic được xử lý hoàn toàn trong model bằng transaction
    const deletedCount = await achievementModel.deleteWithRelations(id);
    if (deletedCount === 0) {
      throw new Error('Thành tích không tồn tại.');
    }
  },

  getAllWithUserProgress: async (userId) => {
    // Câu truy vấn này sử dụng LEFT JOIN để lấy tất cả thành tựu,
    // và kiểm tra xem người dùng có bản ghi tương ứng trong UserAchievements không.
    const queryText = `
      SELECT
        a.id,
        a.name,
        a.description,
        a.icon,
        a.points,
        CASE WHEN ua.user_id IS NOT NULL THEN true ELSE false END as "isAchieved",
        ua.achieved_at
      FROM "Achievements" a
      LEFT JOIN "UserAchievements" ua ON a.id = ua.achievement_id AND ua.user_id = $1
      WHERE a.is_active = true
      ORDER BY a.points ASC, a.name ASC;
    `;
    
    const result = await db.query(queryText, [userId]);
    return result.rows;
  },

  getAllPublicAchievements: async () => {
    return await achievementModel.findAllPublic();
  },

  getAchievedByUser: async (userId) => {
    // Kiểm tra user có tồn tại không
    const user = await userModel.findUserById(userId);
    if (!user) {
        throw new Error("Người dùng không tồn tại.");
    }
    return await achievementModel.findAchievedByUserId(userId);
  },

  getProgressForUser: async (userId) => {
    // 1. Lấy tất cả thành tích mà người dùng CHƯA đạt được
    const unachieved = await achievementModel.findUnachievedByUser(userId);

    // 2. Lấy thông tin tiến độ hiện tại của người dùng (ví dụ: số post đã tạo, số like đã nhận...)
    // Đây là bước phức tạp, cần một hàm tổng hợp dữ liệu người dùng
    const userStats = await userModel.getUserStats(userId); // Giả sử có hàm này

    const progressList = [];
    
    // 3. So sánh và tính toán
    for (const achievement of unachieved) {
      const criteriaType = achievement.criteria.type;
      const requiredValue = achievement.criteria.value;
      let currentValue = 0;

      // Ánh xạ criteria type với dữ liệu stats của người dùng
      switch (criteriaType) {
        case 'post_created':
          currentValue = userStats.post_count || 0;
          break;
        case 'post_likes_received':
          currentValue = userStats.likes_received_count || 0;
          break;
        case 'login_streak':
          currentValue = userStats.current_streak || 0;
          break;
        // Thêm các case khác cho các loại tiêu chí khác...
      }

      // Chỉ trả về các thành tích mà người dùng đã bắt đầu có tiến độ
      if (currentValue > 0) {
        progressList.push({
          ...achievement,
          progress: {
            current: currentValue,
            required: requiredValue,
          }
        });
      }
    }
    
    return progressList;
  },
   /**
   * Hàm trung tâm để kiểm tra và cập nhật tiến độ thành tích cho người dùng.
   * Hàm này sẽ được gọi từ các service khác (user, post, comment service...).
   * @param {string} userId - ID của người dùng.
   * @param {string} criteriaType - Loại hành động (ví dụ: 'post_created', 'login_streak').
   * @param {number} currentValue - Giá trị hiện tại của hành động đó (ví dụ: tổng số bài viết, số ngày streak).
   */
  async checkAndGrantAchievements(userId, criteriaType, currentValue) {
    // 1. Lấy tất cả thành tích có `criteria.type` khớp và người dùng chưa đạt được.
    const relevantAchievements = await achievementModel.findRelevantUnachieved(userId, criteriaType);

    for (const achievement of relevantAchievements) {
      const requiredValue = achievement.criteria.value;

      // 2. Kiểm tra xem giá trị hiện tại có đủ điều kiện không
      if (currentValue >= requiredValue) {
        // 3. ĐỦ ĐIỀU KIỆN -> Trao thưởng
        console.log(`User ${userId} đạt được thành tích ${achievement.name}!`);

        // Gọi thẳng đến model để tránh lỗi circular dependency với userService
        // Logic này sẽ tạo UserAchievement và cộng điểm trong một transaction.
        await userModel.addAchievement({
          userId: userId,
          achievementId: achievement.id,
          pointsToAdd: achievement.points || 0,
          progress: { current: currentValue, required: requiredValue }
        });

        // TODO: Gửi thông báo cho người dùng
        // notificationService.createNotification({ ... });
        
      } else {
        // 4. CHƯA ĐỦ ĐIỀU KIỆN -> Cập nhật tiến độ
        // Tìm xem đã có bản ghi tiến độ cho thành tích này chưa, nếu có thì cập nhật, không thì tạo mới
        await achievementModel.upsertAchievementProgress({
            userId: userId,
            achievementId: achievement.id,
            progress: { current: currentValue, required: requiredValue }
        });
      }
    }
  },

  upsertAchievementProgress: async (options) => {
    const { userId, achievementId, progress } = options;
    
    // Kiểm tra sự tồn tại của user và achievement
    const [userExists, achievementExists] = await Promise.all([
      userModel.findUserById(userId),
      achievementModel.findById(achievementId)
    ]);

    if (!userExists) throw new Error('Người dùng không tồn tại.');
    if (!achievementExists) throw new Error('Thành tích không tồn tại.');
    
    const requiredValue = achievementExists.criteria.value;

    // Kiểm tra nếu tiến độ mới >= yêu cầu -> GỌI HÀM GRANT
    if (progress.current >= requiredValue) {
      // Dùng hàm grant đã có, nó sẽ tự xử lý việc tạo bản ghi và cộng điểm
      return await userService.grantAchievementToUser({
        userId,
        achievementId,
        progress: { current: progress.current, required: requiredValue }
      });
    } else {
      // Nếu chưa đủ, chỉ cập nhật/tạo mới tiến độ
      return await achievementModel.upsertProgress({
        userId,
        achievementId,
        progress: { current: progress.current, required: requiredValue }
      });
    }
  },

  //////////////////
  updateProgress: async (userId, criteriaType, value) => {
    // 1. Lấy tất cả các thành tích có cùng loại tiêu chí mà người dùng này CHƯA đạt được
    const relevantAchievements = await achievementModel.findUnachievedByCriteria2(userId, criteriaType);
    if (relevantAchievements.length === 0) {
      return { newAchievements: [] }; // Không có gì để cập nhật
    }

    // 2. Lấy tất cả các bản ghi tiến độ (UserAchievements) hiện có của người dùng cho các thành tích này
    const userProgressRecords = await achievementModel.findUserProgressForAchievements2(userId, relevantAchievements.map(a => a.id));
    const progressMap = new Map(userProgressRecords.map(p => [p.achievement_id, p]));

    const newlyAchieved = [];
    const progressToUpdate = [];

    // 3. Lặp qua từng thành tích liên quan
    for (const achievement of relevantAchievements) {
      const existingRecord = progressMap.get(achievement.id);
      
      // Lấy tiến độ hiện tại, nếu không có thì là 0
      const currentProgressValue = existingRecord?.progress?.current || 0;
      
      // Logic cộng dồn (bạn có thể thay đổi logic này nếu cần, ví dụ: lấy giá trị lớn nhất)
      const newProgressValue = currentProgressValue + value;
      
      const requiredValue = achievement.criteria.value;

      // 4. KIỂM TRA ĐIỀU KIỆN
      if (newProgressValue >= requiredValue) {
        // --- ĐẠT ĐƯỢC THÀNH TÍCH ---
        newlyAchieved.push({
          userId,
          achievementId: achievement.id,
          pointsToAdd: achievement.points || 0,
          progress: { current: newProgressValue, required: requiredValue }
        });
      } else {
        // --- CHƯA ĐẠT, CHỈ CẬP NHẬT TIẾN ĐỘ ---
        progressToUpdate.push({
          userId,
          achievementId: achievement.id,
          progress: { current: newProgressValue, required: requiredValue }
        });
      }
    }

    // 5. Thực hiện các hành động với database
    if (newlyAchieved.length > 0) {
      // Gọi hàm model để grant tất cả các thành tích mới đạt được
      await achievementModel.grantMultipleAchievements(newlyAchieved);

      // Cộng điểm cho người dùng
      const totalPointsToAdd = newlyAchieved.reduce((sum, ach) => sum + ach.pointsToAdd, 0);
      if (totalPointsToAdd > 0) {
        await userModel.addCommunityPoints(userId, totalPointsToAdd); // Bạn cần có hàm này trong userModel
      }
    }

    if (progressToUpdate.length > 0) {
      // Gọi hàm model để cập nhật tất cả các tiến độ chưa hoàn thành
      await achievementModel.upsertMultipleProgress(progressToUpdate);
    }

    return { 
        newlyAchieved: newlyAchieved.map(a => a.achievementId),
        updatedProgress: progressToUpdate.map(p => p.achievementId) 
    };
  },

  // --- HÀM MỚI ---
  getAchievedByUser: async (userId) => {
    return await achievementModel.findAchievedByUserId2(userId);
  },

  // --- HÀM MỚI ---
  getProgressForUser: async (userId) => {
    // Lấy tất cả thành tích người dùng chưa đạt được
    const allUnachieved = await achievementModel.findAllUnachievedByUser(userId);
    if (allUnachieved.length === 0) return [];
    
    // Lấy tiến độ hiện tại
    const userProgress = await achievementModel.findUserProgressForAchievements(userId, allUnachieved.map(a => a.id));
    const progressMap = new Map(userProgress.map(p => [p.achievement_id, p.progress]));

    // Gộp dữ liệu
    return allUnachieved.map(achievement => ({
      ...achievement,
      progress: progressMap.get(achievement.id) || { current: 0 }
    }));
  },





};

module.exports = achievementService;