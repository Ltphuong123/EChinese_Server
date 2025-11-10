// file: controllers/dashboardController.js

const dashboardService = require('../services/dashboardService');

const dashboardController = {
  getStats: async (req, res) => {
    try {
      const stats = await dashboardService.getDashboardStats();
      res.status(200).json({
        success: true,
        message: 'Lấy dữ liệu dashboard thành công.',
        data: stats
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu dashboard', error: error.message });
    }
  },



  getAnalytics: async (req, res) => {
    try {
      const data = await dashboardService.getAnalytics();
      res.status(200).json({
        success: true,
        message: 'Lấy dữ liệu analytics thành công.',
        data
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu analytics', error: error.message });
    }
  },

  getChartData: async (req, res) => {
    try {
      const days = parseInt(req.query.days, 10) || 7;
      if (days <= 0 || days > 90) { // Giới hạn số ngày để tránh truy vấn quá nặng
        return res.status(400).json({ success: false, message: 'Số ngày phải từ 1 đến 90.' });
      }
      const data = await dashboardService.getChartData(days);
      res.status(200).json({
        success: true,
        message: 'Lấy dữ liệu biểu đồ thành công.',
        data
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu biểu đồ', error: error.message });
    }
  },

  getCommunityData: async (req, res) => {
    try {
      const data = await dashboardService.getCommunityData();
      res.status(200).json({
        success: true,
        message: 'Lấy dữ liệu cộng đồng thành công.',
        data
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu cộng đồng', error: error.message });
    }
  }

  
};

module.exports = dashboardController;