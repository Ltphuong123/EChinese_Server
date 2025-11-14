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
  },

  incrementUsage: async (req, res) => {
        try {
            // Lấy userId từ token đã được middleware verifyToken giải mã
            const userId = req.user.id; 
            const { feature } = req.body;

            const result = await usageService.incrementFeatureUsage(userId, feature);

            res.status(200).json({
                success: true,
                message: 'Ghi nhận sử dụng tính năng thành công.',
                data: result,
            });
        } catch (error) {
            // Lỗi do hết hạn mức
            if (error.name === 'QuotaExceededError') {
                return res.status(429).json({ // 429 Too Many Requests
                    success: false,
                    message: error.message,
                    code: 'QUOTA_EXCEEDED'
                });
            }
            // Lỗi validation
            if (error.name === 'ValidationError') {
                return res.status(400).json({ success: false, message: error.message });
            }
            // Lỗi không tìm thấy
            if (error.message.includes('không tồn tại')) {
                return res.status(404).json({ success: false, message: error.message });
            }
            console.error('API Error in incrementUsage:', error);
            res.status(500).json({ success: false, message: 'Đã xảy ra lỗi ở phía máy chủ.' });
        }
    },


    resetUserUsage: async (req, res) => {
        try {
            const { userId, features } = req.body;

            const result = await usageService.resetUsageCounters(userId, features);

            res.status(200).json({
                success: true,
                message: `Đã reset thành công hạn mức cho các tính năng: ${features.join(', ')} của người dùng.`,
                data: result,
            });
        } catch (error) {
            // Lỗi validation
            if (error.name === 'ValidationError' || error.message.includes('bắt buộc') || error.message.includes('mảng')) {
                return res.status(400).json({ success: false, message: error.message });
            }
            // Lỗi không tìm thấy (ví dụ: userId không tồn tại)
            // Lỗi này sẽ được bắt bởi ràng buộc khóa ngoại ở DB
            if (error.code === '23503') { // foreign_key_violation
                 return res.status(404).json({ success: false, message: `Người dùng với ID ${req.body.userId} không tồn tại.` });
            }
            console.error('API Error in resetUserUsage:', error);
            res.status(500).json({ success: false, message: 'Đã xảy ra lỗi ở phía máy chủ.' });
        }
    },



};

module.exports = usageController;