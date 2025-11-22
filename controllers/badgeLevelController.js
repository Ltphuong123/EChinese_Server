// file: controllers/badgeLevelController.js

const badgeLevelService = require('../services/badgeLevelService');

const badgeLevelController = {
  /**
   * Controller để admin tạo một Badge Level mới.
   */
  createBadgeLevelAdmin: async (req, res) => {
    const payload = req.body;

    try {
      // Validation
      if (!payload.name || !payload.icon || payload.min_points === undefined) {
        return res.status(400).json({
          success: false,
          message: "Các trường 'name', 'icon', và 'min_points' là bắt buộc."
        });
      }

      const newBadgeLevel = await badgeLevelService.createBadgeLevel(payload);

      res.status(201).json({
        success: true,
        message: 'Tạo cấp độ huy hiệu thành công.',
        data: newBadgeLevel
      });

    } catch (error) {
      // UNIQUE constraint trên 'level' hoặc 'name' (nếu có)
      if (error.code === '23505') { 
        // Lỗi này ít khả năng xảy ra với level vì ta tự tăng, nhưng có thể xảy ra với name nếu bạn thêm UNIQUE constraint
        return res.status(409).json({ 
          success: false, 
          message: `Dữ liệu bị trùng lặp. Chi tiết: ${error.detail}`
        });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi tạo cấp độ huy hiệu', error: error.message });
    }
  },

  getAllBadgeLevelsAdmin: async (req, res) => {
    try {
      const badgeLevels = await badgeLevelService.getAllBadgeLevels();
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách huy hiệu thành công.',
        data: badgeLevels
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách huy hiệu', error: error.message });
    }
  },

  getAllActiveBadgeLevels: async (req, res) => {
    try {
      const badgeLevels = await badgeLevelService.getAllActiveBadgeLevels();
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách huy hiệu đang hoạt động thành công.',
        data: badgeLevels
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách huy hiệu đang hoạt động', error: error.message });
    }
  },

  updateBadgeLevelAdmin: async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    try {
      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ success: false, message: 'Không có dữ liệu để cập nhật.' });
      }
      const updatedBadge = await badgeLevelService.updateBadgeLevel(id, payload);
      res.status(200).json({
        success: true,
        message: 'Cập nhật huy hiệu thành công.',
        data: updatedBadge
      });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes('trùng lặp')) {
        return res.status(409).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi cập nhật huy hiệu', error: error.message });
    }
  },

  deleteBadgeLevelAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      await badgeLevelService.deleteBadgeLevel(id);
      res.status(200).send({ success: true, message: 'thành công' });
    } catch (error) {
      if (error.message.includes('không tồn tại')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.code === '23503') { // Foreign key violation
        return res.status(409).json({ success: false, message: 'Không thể xóa huy hiệu này vì có người dùng đang sử dụng nó. Hãy resync huy hiệu của người dùng trước.' });
      }
      res.status(500).json({ success: false, message: 'Lỗi khi xóa huy hiệu', error: error.message });
    }
  },

  resyncUserBadgesAdmin: async (req, res) => {
    try {
      const updatedUsers = await badgeLevelService.resyncAllUserBadges();
      res.status(200).json({
        success: true,
        message: `Đã đồng bộ lại huy hiệu cho ${updatedUsers.length} người dùng.`,
        data: updatedUsers
      });
    } catch (error) {
       res.status(500).json({ success: false, message: 'Lỗi khi đồng bộ lại huy hiệu người dùng', error: error.message });
    }
  },





};

module.exports = badgeLevelController;