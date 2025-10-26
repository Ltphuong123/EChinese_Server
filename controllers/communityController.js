// file: controllers/communityController.js

const communityService = require('../services/communityService');

const communityController = {
  getCommunityStats: async (req, res) => {
    try {
      const stats = await communityService.getStats();
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy thống kê cộng đồng', error: error.message });
    }
  },
  getModerationLogs: async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const result = await communityService.getModerationLogs({
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        });

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy nhật ký kiểm duyệt', error: error.message });
    }
  },
};

module.exports = communityController;
