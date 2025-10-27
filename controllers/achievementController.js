const achievementService = require('../services/achievementService');

const achievementController = {
  createAchievementAdmin: async (req, res) => {
    const payload = req.body;

    try {
      // Validation
      if (!payload.name || !payload.description || !payload.criteria) {
        return res.status(400).json({
          success: false,
          message: "Các trường 'name', 'description', và 'criteria' là bắt buộc."
        });
      }
      if (typeof payload.criteria !== 'object' || payload.criteria === null) {
          return res.status(400).json({
              success: false,
              message: "Trường 'criteria' phải là một object."
          });
      }

      const newAchievement = await achievementService.createAchievement(payload);

      res.status(201).json({
        success: true,
        message: 'Tạo thành tích thành công.',
        data: newAchievement
      });

    } catch (error) {
      // Xử lý lỗi UNIQUE constraint trên cột 'name'
      if (error.code === '23505') { 
        return res.status(409).json({ 
          success: false, 
          message: `Tên thành tích '${payload.name}' đã tồn tại.` 
        });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi tạo thành tích', error: error.message });
    }
  },

  getAchievementsAdmin: async (req, res) => {
    try {
      const filters = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
        search: req.query.search || '',
        status: req.query.status || 'all',
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: req.query.sortOrder || 'desc',
      };

      const result = await achievementService.getPaginatedAchievements(filters);
      
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách thành tích thành công.',
        data: result.data,
        meta: result.meta
      });

    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách thành tích', error: error.message });
    }
  },

  getUsersForAchievementAdmin: async (req, res) => {
    try {
      const { achievementId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const result = await achievementService.getUsersForAchievement({
        achievementId,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });

      res.status(200).json({
        success: true,
        message: 'Lấy danh sách người dùng thành công.',
        data: result,
        
      });

    } catch (error) {
       if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách người dùng của thành tích', error: error.message });
    }
  },

  updateAchievementAdmin: async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    try {
      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ success: false, message: 'Không có dữ liệu để cập nhật.' });
      }
      const updatedAchievement = await achievementService.updateAchievement(id, payload);
      res.status(200).json({
        success: true,
        message: 'Cập nhật thành tích thành công.',
        data: updatedAchievement
      });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.code === '23505') { // Tên trùng lặp
        return res.status(409).json({ success: false, message: `Tên thành tích '${payload.name}' đã tồn tại.` });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật thành tích', error: error.message });
    }
  },

  deleteAchievementAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      await achievementService.deleteAchievement(id);
      res.status(200).send({ success: false, message: 'thành công' });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi xóa thành tích', error: error.message });
    }
  },

  getUserAchievements: async (req, res) => {
    try {
      const userId = req.user.id; // Lấy từ token
      const achievements = await achievementService.getAllWithUserProgress(userId);
      res.status(200).json({ success: true, data: achievements });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách thành tựu.', error: error.message });
    }
  },

  getPublicAchievements: async (req, res) => {
    try {
      const achievements = await achievementService.getAllPublicAchievements();
      res.status(200).json({ success: true, data: achievements });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách thành tích', error: error.message });
    }
  },

  // GET /api/users/me/achievements
  getUserAchievements: async (req, res) => {
    try {
      const userId = req.user.id;
      const achievements = await achievementService.getAchievedByUser(userId);
      res.status(200).json({ success: true, data: achievements });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy thành tích của bạn', error: error.message });
    }
  },

  // GET /api/users/me/achievements/progress
  getUserAchievementProgress: async (req, res) => {
    try {
      const userId = req.user.id;
      const progress = await achievementService.getProgressForUser(userId);
      res.status(200).json({ success: true, data: progress });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy tiến độ thành tích', error: error.message });
    }
  },
  
  // GET /api/users/:userId/achievements
  getPublicUserAchievements: async (req, res) => {
    try {
      const { userId } = req.params;
      const achievements = await achievementService.getAchievedByUser(userId);
      res.status(200).json({ success: true, data: achievements });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
          return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi lấy thành tích người dùng', error: error.message });
    }
  },

  updateUserAchievementProgressAdmin: async (req, res) => {
      try {
        const { userId, criteriaType, value } = req.body;

        if (!userId || !criteriaType || value === undefined) {
          return res.status(400).json({ success: false, message: "Các trường 'userId', 'criteriaType', và 'value' là bắt buộc." });
        }

        // Chỉ gọi service, không thay đổi
        const result = await achievementService.updateProgress(userId, criteriaType, value);

        res.status(200).json({ success: true, message: "Cập nhật tiến độ thành tích thành công.", data: result });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật tiến độ', error: error.message });
      }
  },



};

module.exports = achievementController;