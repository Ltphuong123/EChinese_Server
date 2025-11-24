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
   * GET /admin/logs
   * Lấy danh sách các bản ghi log với phân trang và filter
   * 
   * Query params:
   * - page: number (default: 1, min: 1)
   * - limit: number (default: 20, min: 1, max: 100)
   * - search: string (tìm kiếm trong description, target_id, admin name)
   * - admin_id: string (lọc theo ID của admin)
   * - action_type: string (lọc theo loại hành động)
   * - start_date: string ISO (ngày bắt đầu)
   * - end_date: string ISO (ngày kết thúc)
   */
  getAdminLogs: async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search, 
        admin_id, 
        action_type, 
        start_date, 
        end_date 
      } = req.query;

      // Validation
      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);

      // Validate dates if provided
      let validStartDate = null;
      let validEndDate = null;
      
      if (start_date) {
        const startDateObj = new Date(start_date);
        if (!isNaN(startDateObj.getTime())) {
          validStartDate = startDateObj.toISOString();
        }
      }
      
      if (end_date) {
        const endDateObj = new Date(end_date);
        if (!isNaN(endDateObj.getTime())) {
          validEndDate = endDateObj.toISOString();
        }
      }

      const filters = {
        page: pageNum,
        limit: limitNum,
        search: search || null,
        admin_id: admin_id || null,
        action_type: action_type || null,
        start_date: validStartDate,
        end_date: validEndDate
      };

      const result = await adminLogService.getAllLogs(filters);
      
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách logs thành công',
        data: result
      });

    } catch (error) {
      console.error("Lỗi chi tiết trong getAdminLogs:", error); 
      res.status(500).json({ 
        success: false, 
        message: 'Lỗi khi lấy danh sách admin logs', 
        error: error.message 
      });
    }
  },

  /**
   * DELETE /admin/logs/all
   * Xóa tất cả admin logs (chỉ super admin)
   * 
   * Body:
   * - confirmationCode: string (required) - Mã xác nhận để tránh xóa nhầm
   */
  deleteAllAdminLogs: async (req, res) => {
    try {
      const { confirmationCode } = req.body;
      const adminId = req.user.id;

      // Kiểm tra mã xác nhận
      if (!confirmationCode) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu mã xác nhận. Vui lòng cung cấp confirmationCode trong body.'
        });
      }

      const result = await adminLogService.deleteAllLogs(adminId, confirmationCode);

      res.status(200).json({
        success: true,
        message: 'Đã xóa tất cả admin logs thành công.',
        data: {
          deletedCount: result.deletedCount,
          performed_by: adminId,
          performed_at: new Date()
        }
      });

    } catch (error) {
      if (error.message.includes('Mã xác nhận')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json({ 
        success: false, 
        message: 'Lỗi khi xóa admin logs', 
        error: error.message 
      });
    }
  }

};

module.exports = adminLogController;