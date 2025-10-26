// file: services/badgeLevelService.js

const badgeLevelModel = require('../models/badgeLevelModel');
const userModel = require('../models/userModel');

const badgeLevelService = {
  /**
   * Xử lý logic tạo Badge Level mới.
   * @param {object} payload - Dữ liệu từ controller.
   * @returns {Promise<object>} Huy hiệu mới.
   */
  createBadgeLevel: async (payload) => {
    // 1. Tìm level cao nhất hiện tại
    const maxLevel = await badgeLevelModel.findMaxLevel();
    
    // 2. Tính toán level mới
    const newLevel = maxLevel + 1;
    
    // 3. Gộp level mới vào dữ liệu để tạo
    const badgeData = {
      ...payload,
      level: newLevel,
    };

    const newBadgeLevel = await badgeLevelModel.create(badgeData);
    return newBadgeLevel;
  },

  getAllBadgeLevels: async () => {
    return await badgeLevelModel.findAll();
  },

  updateBadgeLevel: async (id, payload) => {
    // Kiểm tra trùng lặp min_points
    if (payload.min_points !== undefined) {
      const isDuplicate = await badgeLevelModel.checkMinPointsConflict(payload.min_points, id);
      if (isDuplicate) {
        throw new Error(`Điểm tối thiểu (min_points) ${payload.min_points} đã tồn tại ở một huy hiệu khác.`);
      }
    }

    const updatedBadge = await badgeLevelModel.update(id, payload);
    if (!updatedBadge) {
      throw new Error('Huy hiệu không tồn tại.');
    }
    return updatedBadge;
  },

  deleteBadgeLevel: async (id) => {
    const deletedCount = await badgeLevelModel.delete(id);
    if (deletedCount === 0) {
      throw new Error('Huy hiệu không tồn tại.');
    }
  },

  resyncAllUserBadges: async () => {
    // 1. Lấy tất cả các huy hiệu, sắp xếp theo điểm giảm dần
    const allBadges = await badgeLevelModel.findAllDesc();
    
    // 2. Lấy tất cả người dùng
    const allUsers = await userModel.getAllUsers2(); // Giả sử bạn có hàm này, nếu không, chúng ta sẽ tạo nó
    
    const updatedUsersPromises = [];

    // 3. Lặp qua từng người dùng
    for (const user of allUsers) {
      let newBadgeLevel = 0; // Mặc định là level 0
      // 4. Tìm huy hiệu cao nhất mà người dùng đủ điều kiện
      for (const badge of allBadges) {
        if (user.community_points >= badge.min_points) {
          newBadgeLevel = badge.level;
          break; // Dừng lại ngay khi tìm thấy level cao nhất phù hợp
        }
      }

      // 5. Nếu huy hiệu của người dùng khác với huy hiệu mới, cập nhật
      if (user.badge_level !== newBadgeLevel) {
        const updatePromise = userModel.updateUserBadge(user.id, newBadgeLevel);
        updatedUsersPromises.push(updatePromise);
      }
    }
    
    // 6. Thực thi tất cả các cập nhật song song
    const updatedUsersResults = await Promise.all(updatedUsersPromises);
    
    // Lọc ra các kết quả không phải null/undefined (nếu có)
    return updatedUsersResults.filter(Boolean);
  },


};

module.exports = badgeLevelService;