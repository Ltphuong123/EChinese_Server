// controllers/usageController.js

const usageService = require('../services/usageService');

const usageController = {
  /**
   * Controller để tạo mới một bản ghi usage.
   */
  createUsage: async (req, res) => {
    try {
      const { user_id, feature, daily_count } = req.body;

      if (!user_id || !feature) {
        return res.status(400).json({
          success: false,
          message: 'user_id và feature là bắt buộc.'
        });
      }

      const newUsage = await usageService.createUsage({ user_id, feature, daily_count });
      
      res.status(201).json({
        success: true,
        message: 'Tạo bản ghi usage thành công.',
        data: newUsage
      });
    } catch (error) {
      if (error.code === '23505') { // Lỗi unique violation
        return res.status(409).json({
          success: false,
          message: `Tạo thất bại. Bản ghi usage cho user_id và feature này đã tồn tại.`
        });
      }
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo bản ghi usage',
        error: error.message
      });
    }
  },

  /**
   * Controller để lấy tất cả bản ghi usage.
   */
  getAllUsageRecords: async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const result = await usageService.getAllUsageRecords({ page, limit, search });
      
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách usage thành công.',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách usage',
        error: error.message
      });
    }
  }
};

module.exports = usageController;