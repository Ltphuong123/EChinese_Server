// file: controllers/adminLogController.js

const adminLogService = require('../services/adminLogService');

const adminLogController = {
  /**
   * Controller để tạo một bản ghi log mới.
   */
  createAdminLog: async (req, res) => {
    try {
      const logData = req.body;
      const adminId = req.user.id; // Lấy ID của admin từ token đã được xác thực

      // Validation
      if (!logData.action_type || !logData.description) {
        return res.status(400).json({
          success: false,
          message: "Các trường 'action_type' và 'description' là bắt buộc."
        });
      }

      const newLog = await adminLogService.createLog(logData, adminId);
      res.status(201).json({
        success: true,
        message: 'Tạo admin log thành công.',
        data: newLog
      });

    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi tạo admin log', error: error.message });
    }
  },

  /**
   * Controller để lấy danh sách các bản ghi log.
   */
  getAdminLogs: async (req, res) => {
    try {
      // Gọi service mà không cần truyền filters
      const allLogs = await adminLogService.getAllLogs();
      
      res.status(200).json({
        success: true,
        message: 'Lấy tất cả admin logs thành công.',
        data: allLogs
      });

    } catch (error) {
      console.error("Lỗi chi tiết trong getAdminLogs:", error); 
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách admin logs', error: error.message });
    }
  }




};

module.exports = adminLogController;