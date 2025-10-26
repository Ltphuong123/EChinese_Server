// file: controllers/dashboardController.js

const dashboardService = require('../services/dashboardService');

const dashboardController = {
  getStats: async (req, res) => {
    try {
      const stats = await dashboardService.getDashboardStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu dashboard.', error: error.message });
    }
  }
};

module.exports = dashboardController;