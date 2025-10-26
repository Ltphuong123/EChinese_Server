// file: services/achievementService.js
const db = require('../config/db');
const achievementModel = require('../models/achievementModel');

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
  }


};

module.exports = achievementService;